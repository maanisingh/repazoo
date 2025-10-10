#!/bin/bash
# =====================================================
# Repazoo Database Migration Script
# Version: 1.0.0
# Description: Executes all database migrations in order
# =====================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MIGRATIONS_DIR="/root/repazoo/supabase/migrations"
LOG_FILE="/var/log/repazoo/migration_$(date +%Y%m%d_%H%M%S).log"

# Ensure log directory exists
mkdir -p /var/log/repazoo

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Repazoo Database Migration Script${NC}"
echo -e "${BLUE}======================================${NC}\n"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${RED}Error: Migrations directory not found: $MIGRATIONS_DIR${NC}"
    exit 1
fi

# Function to execute SQL file
execute_migration() {
    local file=$1
    local filename=$(basename "$file")

    echo -e "${YELLOW}Executing: $filename${NC}"

    if supabase db execute --file "$file" 2>&1 | tee -a "$LOG_FILE"; then
        echo -e "${GREEN}✓ $filename completed successfully${NC}\n"
        return 0
    else
        echo -e "${RED}✗ $filename failed${NC}\n"
        return 1
    fi
}

# Check if Supabase is linked
if ! supabase status &> /dev/null; then
    echo -e "${RED}Error: Supabase project not linked${NC}"
    echo -e "${YELLOW}Run: supabase link --project-ref your-project-ref${NC}"
    exit 1
fi

# Display project info
echo -e "${BLUE}Supabase Project Info:${NC}"
supabase status | grep "Project URL" || true
echo ""

# Confirm execution
read -p "Do you want to run migrations? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Migration cancelled${NC}"
    exit 0
fi

echo -e "\n${BLUE}Starting migrations...${NC}\n"

# Migration files in order
migrations=(
    "20251007_001_initial_schema.sql"
    "20251007_002_encryption_functions.sql"
    "20251007_003_rls_policies.sql"
    "20251007_004_verification.sql"
)

# Execute migrations
failed=0
for migration in "${migrations[@]}"; do
    file="$MIGRATIONS_DIR/$migration"

    if [ ! -f "$file" ]; then
        echo -e "${RED}Error: Migration file not found: $migration${NC}"
        failed=1
        break
    fi

    if ! execute_migration "$file"; then
        failed=1
        break
    fi
done

# Check results
if [ $failed -eq 0 ]; then
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}All migrations completed successfully!${NC}"
    echo -e "${GREEN}======================================${NC}\n"

    echo -e "${BLUE}Running verification...${NC}\n"

    # Run verification
    supabase db execute --stdin <<EOF
SELECT
    category,
    check_name,
    status,
    details
FROM public.verify_database_schema()
ORDER BY category, check_name;
EOF

    echo -e "\n${GREEN}Migration log saved to: $LOG_FILE${NC}"
    exit 0
else
    echo -e "${RED}======================================${NC}"
    echo -e "${RED}Migration failed!${NC}"
    echo -e "${RED}======================================${NC}\n"
    echo -e "${YELLOW}Check log for details: $LOG_FILE${NC}"
    echo -e "${YELLOW}To rollback, run: supabase db execute --file $MIGRATIONS_DIR/20251007_999_rollback.sql${NC}"
    exit 1
fi
