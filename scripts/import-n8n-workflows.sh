#!/bin/bash
# Import all n8n workflows using n8n API
# Usage: ./import-n8n-workflows.sh <N8N_API_KEY>

set -e

# Configuration
N8N_URL="https://wf.repazoo.com"
N8N_API_KEY="${1:-}"
WORKFLOWS_DIR="/root/repazoo/n8n/workflows"

if [ -z "$N8N_API_KEY" ]; then
    echo "❌ Error: N8N_API_KEY required"
    echo "Usage: $0 <N8N_API_KEY>"
    echo ""
    echo "To get your API key:"
    echo "1. Go to https://wf.repazoo.com"
    echo "2. Login with: admin / repazoo_n8n_2024"
    echo "3. Click Settings (gear icon) → API"
    echo "4. Generate new API key"
    echo "5. Run: $0 <your-api-key>"
    exit 1
fi

echo "🚀 Importing n8n workflows..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 n8n URL: $N8N_URL"
echo "📂 Workflows: $WORKFLOWS_DIR"
echo ""

# Counter
IMPORTED=0
FAILED=0

# Import each workflow
for workflow_file in "$WORKFLOWS_DIR"/*.json; do
    if [ ! -f "$workflow_file" ]; then
        continue
    fi

    filename=$(basename "$workflow_file")
    echo "📦 Importing: $filename"

    # Read workflow JSON
    workflow_json=$(cat "$workflow_file")

    # Import workflow via API
    response=$(curl -s -k -X POST "$N8N_URL/api/v1/workflows" \
        -H "X-N8N-API-KEY: $N8N_API_KEY" \
        -H "Content-Type: application/json" \
        -d "$workflow_json")

    # Check if successful
    if echo "$response" | grep -q '"id"'; then
        workflow_id=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "   ✅ Imported successfully (ID: $workflow_id)"
        ((IMPORTED++))
    else
        echo "   ❌ Failed to import"
        echo "   Error: $response"
        ((FAILED++))
    fi
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary:"
echo "   ✅ Imported: $IMPORTED workflows"
echo "   ❌ Failed: $FAILED workflows"
echo ""

if [ $IMPORTED -gt 0 ]; then
    echo "🎉 Workflows imported successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Go to $N8N_URL"
    echo "2. Configure credentials (PostgreSQL, Ollama, Flowise)"
    echo "3. Activate each workflow (toggle switch)"
    echo "4. Test webhooks from frontend"
else
    echo "⚠️  No workflows were imported. Check errors above."
fi
