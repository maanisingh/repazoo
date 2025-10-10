#!/usr/bin/env python3
"""
Fix the webhook path to use production URL format
"""

import json
import psycopg2
from datetime import datetime

DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'n8n',
    'user': 'postgres',
    'password': 'repuzoo_secure_pass_2024'
}

def fix_webhook():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # Get the workflow
    cur.execute("SELECT nodes FROM workflow_entity WHERE name = 'Twitter Reputation Analysis'")
    result = cur.fetchone()

    if not result:
        print("✗ Workflow not found")
        return

    nodes = result[0]

    # Find and update the webhook node
    for node in nodes:
        if node.get('type') == 'n8n-nodes-base.webhook':
            # Change the node ID to avoid conflicts
            node['id'] = 'webhook-start-analysis'
            node['name'] = 'Webhook Start Analysis'  # Remove spaces and special chars

            # Ensure production URL settings
            if 'options' not in node['parameters']:
                node['parameters']['options'] = {}

            print(f"✓ Updated webhook node: {node['name']}")
            print(f"  Path: {node['parameters'].get('path')}")

    # Update the workflow
    cur.execute("""
        UPDATE workflow_entity
        SET nodes = %s,
            "updatedAt" = %s
        WHERE name = 'Twitter Reputation Analysis'
    """, (json.dumps(nodes), datetime.utcnow()))

    conn.commit()

    # Delete old webhook entries to force re-registration
    cur.execute("""
        DELETE FROM webhook_entity
        WHERE "workflowId" = (
            SELECT id FROM workflow_entity WHERE name = 'Twitter Reputation Analysis'
        )
    """)

    conn.commit()
    print(f"✓ Deleted old webhook entries (will be recreated on activation)")

    cur.close()
    conn.close()

if __name__ == '__main__':
    fix_webhook()
