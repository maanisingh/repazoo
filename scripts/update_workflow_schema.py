#!/usr/bin/env python3
"""
Update the Twitter Reputation Analysis workflow to match the actual database schema
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

def update_workflow():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # Get the workflow
    cur.execute("SELECT nodes, connections FROM workflow_entity WHERE name = 'Twitter Reputation Analysis'")
    result = cur.fetchone()

    if not result:
        print("✗ Workflow not found")
        return

    nodes, connections = result

    # Update the "Save to Database" node
    for node in nodes:
        if node.get('id') == 'save-db' or node.get('name') == 'Save to Database':
            # Update to use executeQuery with proper schema
            node['parameters'] = {
                'operation': 'executeQuery',
                'query': '''INSERT INTO analysis_results (
                    user_id,
                    twitter_account_id,
                    purpose,
                    model_used,
                    analysis_type,
                    input_data,
                    output_data,
                    execution_time_ms,
                    created_at
                ) VALUES (
                    $1::uuid,
                    $2::uuid,
                    $3,
                    $4,
                    $5,
                    $6::jsonb,
                    $7::jsonb,
                    $8,
                    NOW()
                ) RETURNING id''',
                'options': {}
            }
            print("✓ Updated 'Save to Database' node")

        # Update the "Format Analysis Results" node to match new schema
        elif node.get('id') == 'format-results' or node.get('name') == 'Format Analysis Results':
            node['parameters']['functionCode'] = '''// Extract analysis from Anthropic
const anthropicResponse = $json;
const analysisText = anthropicResponse.content[0].text;
const analysis = JSON.parse(analysisText);

// Get data from previous nodes
const extractData = $('Extract Request Data').first().json;
const userInfo = $('Get Twitter User Info').first().json.data;
const tweetsData = $('Get User Tweets').first().json;

// Format output for database
return {
  json: {
    user_id: extractData.user_id,
    twitter_account_id: extractData.user_id, // This should be the twitter_account UUID from DB
    purpose: 'reputation_scan',
    model_used: 'sonnet',
    analysis_type: 'reputation_scan',
    input_data: {
      twitter_handle: extractData.twitter_handle,
      scan_id: extractData.scan_id,
      user_profile: userInfo,
      tweet_count: tweetsData.meta ? tweetsData.meta.result_count : 0
    },
    output_data: analysis,
    execution_time_ms: 0 // Will be set by actual execution time
  }
};'''
            print("✓ Updated 'Format Analysis Results' node")

    # Update the workflow
    cur.execute("""
        UPDATE workflow_entity
        SET nodes = %s,
            "updatedAt" = %s
        WHERE name = 'Twitter Reputation Analysis'
    """, (json.dumps(nodes), datetime.utcnow()))

    conn.commit()
    cur.close()
    conn.close()

    print("✓ Workflow updated successfully")

if __name__ == '__main__':
    update_workflow()
