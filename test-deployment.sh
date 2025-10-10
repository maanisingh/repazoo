#!/bin/bash

# Repazoo Deployment Test Script
# This script verifies all components are working correctly

set -e

echo "================================================================================"
echo "                   REPAZOO DEPLOYMENT VERIFICATION"
echo "================================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_component() {
    local test_name="$1"
    local test_command="$2"

    echo -n "Testing: $test_name... "

    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "1. Checking Docker Containers..."
echo "-----------------------------------"
test_component "PostgreSQL container" "docker ps | grep repazoo-postgres"
test_component "n8n container" "docker ps | grep repazoo-n8n"
test_component "Ollama container" "docker ps | grep ollama"
echo ""

echo "2. Checking Database Schema..."
echo "-----------------------------------"
test_component "reputation_reports table exists" "docker exec -i repazoo-postgres psql -U postgres -d postgres -c '\d public.reputation_reports' | grep -q 'Table'"
test_component "purpose column exists" "docker exec -i repazoo-postgres psql -U postgres -d postgres -c '\d public.reputation_reports' | grep -q 'purpose'"
test_component "overall_score column exists" "docker exec -i repazoo-postgres psql -U postgres -d postgres -c '\d public.reputation_reports' | grep -q 'overall_score'"
test_component "risk_level column exists" "docker exec -i repazoo-postgres psql -U postgres -d postgres -c '\d public.reputation_reports' | grep -q 'risk_level'"
echo ""

echo "3. Checking Service Endpoints..."
echo "-----------------------------------"
test_component "n8n health endpoint" "curl -sf http://localhost:5678/healthz"
test_component "Ollama API available" "curl -sf http://ai.repazoo.com/api/tags"
test_component "Supabase Studio accessible" "curl -sf -I http://localhost:9010 | grep -q '200\|301\|302'"
echo ""

echo "4. Checking n8n Workflows..."
echo "-----------------------------------"
test_component "Dashboard Stats workflow" "curl -sf 'https://wf.repazoo.com/webhook/dashboard-stats' | grep -q 'success'"
echo ""

echo "5. Testing Ollama AI..."
echo "-----------------------------------"
OLLAMA_TEST=$(curl -sf -X POST http://ai.repazoo.com/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model": "llama3.2:3b", "prompt": "Say hello", "stream": false}' | jq -r '.response' 2>/dev/null)

if [ ! -z "$OLLAMA_TEST" ]; then
    echo -e "Ollama response test... ${GREEN}✅ PASS${NC}"
    echo "  Response: ${OLLAMA_TEST:0:50}..."
    ((TESTS_PASSED++))
else
    echo -e "Ollama response test... ${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
fi
echo ""

echo "6. Checking Files Created..."
echo "-----------------------------------"
test_component "Migration 001 exists" "[ -f /root/repazoo/supabase/migrations/20251008_001_reputation_reports.sql ]"
test_component "Migration 002 exists" "[ -f /root/repazoo/supabase/migrations/20251008_002_alter_reputation_reports.sql ]"
test_component "Fixed workflow exists" "[ -f /root/repazoo/n8n/workflows/opus-orchestration-fixed.json ]"
test_component "Recent Scans component exists" "[ -f /root/repazoo/frontend/src/features/dashboard/components/recent-scans.tsx ]"
test_component "Deployment guide exists" "[ -f /root/repazoo/DEPLOYMENT_COMPLETE.md ]"
test_component "Test guide exists" "[ -f /root/repazoo/QUICK_TEST_GUIDE.md ]"
echo ""

echo "================================================================================"
echo "                           TEST SUMMARY"
echo "================================================================================"
echo ""
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo ""
    echo "Your deployment is ready. Next steps:"
    echo "1. Import the n8n workflow manually (see DEPLOYMENT_COMPLETE.md)"
    echo "2. Run a test scan (see QUICK_TEST_GUIDE.md)"
    echo "3. Verify data in Supabase Studio: http://localhost:9010"
    exit 0
else
    echo -e "${YELLOW}⚠️  SOME TESTS FAILED${NC}"
    echo ""
    echo "Please review the failed tests above and consult:"
    echo "  - DEPLOYMENT_COMPLETE.md for troubleshooting"
    echo "  - QUICK_TEST_GUIDE.md for manual testing steps"
    exit 1
fi
