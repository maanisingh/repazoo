#!/usr/bin/env python3
"""
Script to create n8n credentials and import workflows
Handles encryption/decryption using n8n's encryption key
"""

import json
import os
import sys
import uuid
import psycopg2
from datetime import datetime
from cryptography.fernet import Fernet
import base64
import hashlib
from urllib.parse import unquote

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'n8n',
    'user': 'postgres',
    'password': 'repuzoo_secure_pass_2024'
}

# Get encryption key from n8n environment
# Default n8n encryption key format
ENCRYPTION_KEY = os.getenv('N8N_ENCRYPTION_KEY', '1c7b173b2c329b643340e70a4c1102c42c8a905a93df85d49c8a408bc7db45a8')

def get_fernet_key():
    """Convert n8n encryption key to Fernet key"""
    # n8n uses the encryption key directly, we need to convert it to proper Fernet format
    key_bytes = ENCRYPTION_KEY.encode()[:32]  # Take first 32 bytes
    key_bytes = key_bytes.ljust(32, b'0')  # Pad if necessary
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)

def encrypt_credential_data(data_dict):
    """Encrypt credential data like n8n does"""
    try:
        cipher = get_fernet_key()
        json_str = json.dumps(data_dict)
        encrypted = cipher.encrypt(json_str.encode())
        return encrypted.decode()
    except Exception as e:
        print(f"Encryption error: {e}")
        # Fallback: just use JSON string (not recommended for production)
        return json.dumps(data_dict)

def create_credential(conn, name, cred_type, data_dict):
    """Create a new credential in n8n"""
    cred_id = str(uuid.uuid4()).replace('-', '')[:16]

    # Encrypt the credential data
    encrypted_data = encrypt_credential_data(data_dict)

    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO credentials_entity (id, name, type, data, "createdAt", "updatedAt", "isManaged")
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        """, (
            cred_id,
            name,
            cred_type,
            encrypted_data,
            datetime.utcnow(),
            datetime.utcnow(),
            False
        ))
        result = cur.fetchone()
        conn.commit()

        if result:
            print(f"✓ Created credential: {name} (ID: {cred_id})")
            return cred_id
        else:
            print(f"⚠ Credential {name} may already exist")
            # Try to get existing ID
            cur.execute("SELECT id FROM credentials_entity WHERE name = %s AND type = %s", (name, cred_type))
            existing = cur.fetchone()
            return existing[0] if existing else None
    except Exception as e:
        conn.rollback()
        print(f"✗ Error creating credential {name}: {e}")
        return None
    finally:
        cur.close()

def import_workflow(conn, workflow_path, credential_mapping):
    """Import a workflow and update credential references"""
    with open(workflow_path, 'r') as f:
        workflow_data = json.load(f)

    workflow_id = str(uuid.uuid4()).replace('-', '')[:16]
    workflow_name = workflow_data.get('name', 'Unnamed Workflow')

    # Update credential IDs in nodes
    nodes = workflow_data.get('nodes', [])
    for node in nodes:
        if 'credentials' in node:
            for cred_type, cred_info in node['credentials'].items():
                old_cred_name = cred_info.get('name')
                if old_cred_name in credential_mapping:
                    cred_info['id'] = credential_mapping[old_cred_name]

    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO workflow_entity (id, name, active, nodes, connections, settings, "staticData", "triggerCount", "createdAt", "updatedAt", "versionId")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                nodes = EXCLUDED.nodes,
                connections = EXCLUDED.connections,
                "updatedAt" = EXCLUDED."updatedAt"
            RETURNING id
        """, (
            workflow_id,
            workflow_name,
            True,
            json.dumps(nodes),
            json.dumps(workflow_data.get('connections', {})),
            json.dumps(workflow_data.get('settings', {})),
            json.dumps(workflow_data.get('staticData', {})),
            workflow_data.get('triggerCount', 0),
            datetime.utcnow(),
            datetime.utcnow(),
            '1'
        ))
        result = cur.fetchone()
        conn.commit()

        print(f"✓ Imported workflow: {workflow_name} (ID: {workflow_id})")
        return workflow_id
    except Exception as e:
        conn.rollback()
        print(f"✗ Error importing workflow {workflow_name}: {e}")
        return None
    finally:
        cur.close()

def load_env_file(filepath='/root/repazoo/.env'):
    """Load environment variables from .env file"""
    env_vars = {}
    try:
        with open(filepath, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    except Exception as e:
        print(f"Warning: Could not load .env file: {e}")
    return env_vars

def main():
    # Load environment variables from .env file
    env_vars = load_env_file()

    # Read environment variables
    twitter_bearer = unquote(env_vars.get('TWITTER_BEARER_TOKEN', ''))
    anthropic_key = env_vars.get('ANTHROPIC_API_KEY', '')

    if not twitter_bearer:
        print("⚠ Warning: TWITTER_BEARER_TOKEN not found in environment")
    if not anthropic_key:
        print("⚠ Warning: ANTHROPIC_API_KEY not found in environment")

    # Connect to database
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        print("✓ Connected to n8n database")
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        sys.exit(1)

    # Create credentials
    credential_mapping = {}

    # Twitter Bearer Token
    if twitter_bearer:
        twitter_cred_id = create_credential(
            conn,
            'Twitter Bearer Token',
            'httpHeaderAuth',
            {
                'name': 'Authorization',
                'value': f'Bearer {twitter_bearer}'
            }
        )
        if twitter_cred_id:
            credential_mapping['Twitter Bearer Token'] = twitter_cred_id

    # Anthropic API Key
    if anthropic_key:
        anthropic_cred_id = create_credential(
            conn,
            'Anthropic API Key',
            'httpHeaderAuth',
            {
                'name': 'x-api-key',
                'value': anthropic_key
            }
        )
        if anthropic_cred_id:
            credential_mapping['Anthropic API Key'] = anthropic_cred_id

    # Get existing Postgres credential ID
    cur = conn.cursor()
    cur.execute("SELECT id FROM credentials_entity WHERE type = 'postgres' LIMIT 1")
    postgres_result = cur.fetchone()
    if postgres_result:
        credential_mapping['Repazoo PostgreSQL'] = postgres_result[0]
        print(f"✓ Found existing PostgreSQL credential: {postgres_result[0]}")
    cur.close()

    # Import workflow if provided
    workflow_path = '/root/repazoo/n8n/workflows/twitter-reputation-analysis-simple.json'
    if os.path.exists(workflow_path):
        import_workflow(conn, workflow_path, credential_mapping)

    conn.close()
    print("\n✓ Setup complete!")
    print(f"Created {len(credential_mapping)} credential mappings")

if __name__ == '__main__':
    main()
