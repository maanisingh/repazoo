#!/bin/bash

# n8n API Configuration
N8N_URL="https://wf.repazoo.com"
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MjU5YWMwOC00Y2Y2LTRjZjQtYmYzMy05YWJmZGE2ZTk4NDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU5OTM3MTY2LCJleHAiOjE3Njc2NTc2MDB9.YWScLiXfTeDN3Tg8lw7Ps3anmIU_QDwJdfesuPuSNLE"
WORKFLOWS_DIR="/root/repazoo/n8n/workflows"

# Counters
TOTAL_FOUND=0
ALREADY_IMPORTED=0
NEWLY_IMPORTED=0
FAILED_IMPORT=0
ACTIVATED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}n8n Workflow Import Tool${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Get existing workflows from n8n
echo -e "${YELLOW}Fetching existing workflows from n8n...${NC}"
EXISTING_WORKFLOWS=$(curl -s -X GET "${N8N_URL}/api/v1/workflows" -H "X-N8N-API-KEY: ${API_KEY}")

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to fetch existing workflows${NC}"
    exit 1
fi

echo -e "${GREEN}Successfully fetched existing workflows${NC}"
echo ""

# Create temporary files for tracking
TEMP_DIR=$(mktemp -d)
echo "$EXISTING_WORKFLOWS" | jq -r '.data[] | "\(.name)|\(.id)"' > "${TEMP_DIR}/existing.txt"

# Process each workflow file
for workflow_file in "${WORKFLOWS_DIR}"/*.json; do
    if [ ! -f "$workflow_file" ]; then
        continue
    fi

    TOTAL_FOUND=$((TOTAL_FOUND + 1))

    filename=$(basename "$workflow_file")
    workflow_name=$(jq -r '.name' "$workflow_file")

    echo -e "${BLUE}Processing: ${filename}${NC}"
    echo -e "  Workflow Name: ${workflow_name}"

    # Check if workflow already exists by name
    existing_id=$(grep "^${workflow_name}|" "${TEMP_DIR}/existing.txt" | cut -d'|' -f2 | head -n 1)

    if [ ! -z "$existing_id" ]; then
        echo -e "  ${YELLOW}Status: Already imported (ID: ${existing_id})${NC}"
        ALREADY_IMPORTED=$((ALREADY_IMPORTED + 1))

        # Check if it's active
        is_active=$(echo "$EXISTING_WORKFLOWS" | jq -r ".data[] | select(.id == \"${existing_id}\") | .active")
        if [ "$is_active" != "true" ]; then
            echo -e "  ${YELLOW}Activating workflow...${NC}"
            activate_result=$(curl -s -X POST "${N8N_URL}/api/v1/workflows/${existing_id}/activate" \
                -H "X-N8N-API-KEY: ${API_KEY}" \
                -H "Content-Type: application/json")

            if echo "$activate_result" | jq -e '.id' > /dev/null 2>&1; then
                echo -e "  ${GREEN}Successfully activated${NC}"
                ACTIVATED=$((ACTIVATED + 1))
            else
                echo -e "  ${RED}Failed to activate${NC}"
            fi
        else
            echo -e "  ${GREEN}Already active${NC}"
        fi
    else
        echo -e "  ${YELLOW}Status: Not found, importing...${NC}"

        # Clean workflow JSON by removing read-only fields
        temp_workflow="${TEMP_DIR}/workflow_$(date +%s).json"
        jq 'del(.updatedAt, .versionId, .triggerCount, .tags)' "$workflow_file" > "$temp_workflow"

        # Import the workflow
        import_result=$(curl -s -X POST "${N8N_URL}/api/v1/workflows" \
            -H "X-N8N-API-KEY: ${API_KEY}" \
            -H "Content-Type: application/json" \
            -d @"${temp_workflow}")

        # Check if import was successful
        new_id=$(echo "$import_result" | jq -r '.id // empty')

        if [ ! -z "$new_id" ]; then
            echo -e "  ${GREEN}Successfully imported (ID: ${new_id})${NC}"
            NEWLY_IMPORTED=$((NEWLY_IMPORTED + 1))

            # Activate the newly imported workflow
            echo -e "  ${YELLOW}Activating workflow...${NC}"
            activate_result=$(curl -s -X POST "${N8N_URL}/api/v1/workflows/${new_id}/activate" \
                -H "X-N8N-API-KEY: ${API_KEY}" \
                -H "Content-Type: application/json")

            if echo "$activate_result" | jq -e '.id' > /dev/null 2>&1; then
                echo -e "  ${GREEN}Successfully activated${NC}"
                ACTIVATED=$((ACTIVATED + 1))
            else
                echo -e "  ${RED}Failed to activate${NC}"
                error_msg=$(echo "$activate_result" | jq -r '.message // "Unknown error"')
                echo -e "  ${RED}Error: ${error_msg}${NC}"
            fi
        else
            echo -e "  ${RED}Failed to import${NC}"
            error_msg=$(echo "$import_result" | jq -r '.message // "Unknown error"')
            echo -e "  ${RED}Error: ${error_msg}${NC}"
            FAILED_IMPORT=$((FAILED_IMPORT + 1))
        fi
    fi

    echo ""
done

# Cleanup
rm -rf "${TEMP_DIR}"

# Print summary
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Import Summary${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "Total workflows found:      ${TOTAL_FOUND}"
echo -e "${YELLOW}Already imported:           ${ALREADY_IMPORTED}${NC}"
echo -e "${GREEN}Newly imported:             ${NEWLY_IMPORTED}${NC}"
echo -e "${RED}Failed to import:           ${FAILED_IMPORT}${NC}"
echo -e "${GREEN}Workflows activated:        ${ACTIVATED}${NC}"
echo -e "${BLUE}================================${NC}"

# Exit with appropriate code
if [ $FAILED_IMPORT -gt 0 ]; then
    exit 1
else
    exit 0
fi
