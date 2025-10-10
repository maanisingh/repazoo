#!/bin/bash

# Repazoo Database Restore Script
# Restores database from a backup file
# Usage: ./restore-database.sh <backup-file>

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="repazoo"
DB_USER="postgres"
DB_HOST="localhost"
PGPASSWORD="repuzoo_secure_pass_2024"

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: No backup file specified${NC}"
    echo "Usage: $0 <backup-file>"
    echo ""
    echo "Available backups:"
    ls -lh /var/backups/postgresql/repazoo/ | tail -10
    exit 1
fi

BACKUP_FILE="$1"

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${RED}================================================${NC}"
echo -e "${RED}  ⚠️  DATABASE RESTORE WARNING ⚠️${NC}"
echo -e "${RED}================================================${NC}"
echo -e "${YELLOW}You are about to restore the database from:${NC}"
echo -e "${YELLOW}$BACKUP_FILE${NC}"
echo -e "${RED}This will OVERWRITE all current data!${NC}"
echo ""

# Confirmation
read -p "Are you ABSOLUTELY SURE? (type 'RESTORE' to continue): " -r
if [[ ! $REPLY =~ ^RESTORE$ ]]; then
    echo -e "${GREEN}Restore cancelled.${NC}"
    exit 0
fi

# Create a safety backup of current state
echo -e "${GREEN}📸 Creating safety backup of current database...${NC}"
SAFETY_BACKUP="/var/backups/postgresql/repazoo/safety_backup_$(date +%Y%m%d_%H%M%S).sql.gz"
export PGPASSWORD
pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
    --format=custom \
    --file="${SAFETY_BACKUP}" || {
    echo -e "${RED}❌ Failed to create safety backup!${NC}"
    exit 1
}
echo -e "${GREEN}✅ Safety backup created: ${SAFETY_BACKUP}${NC}"

# Stop backend to prevent database access during restore
echo -e "${YELLOW}🛑 Stopping backend API...${NC}"
pm2 stop repazoo-backend-api || true

# Restore database
echo -e "${GREEN}🔄 Restoring database from backup...${NC}"
pg_restore -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --verbose \
    "${BACKUP_FILE}" 2>&1 | tee /tmp/restore_log.txt || {
    echo -e "${RED}❌ Restore failed! Check /tmp/restore_log.txt for details${NC}"
    echo -e "${YELLOW}Attempting to restore from safety backup...${NC}"
    pg_restore -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
        --clean \
        --if-exists \
        "${SAFETY_BACKUP}"
    exit 1
}

# Verify restore
echo -e "${GREEN}🔍 Verifying database restore...${NC}"
TABLES_COUNT=$(psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" | tr -d ' ')
echo -e "${GREEN}Tables found: ${TABLES_COUNT}${NC}"

if [ "$TABLES_COUNT" -lt 1 ]; then
    echo -e "${RED}❌ Database appears empty after restore!${NC}"
    echo -e "${YELLOW}Restoring from safety backup...${NC}"
    pg_restore -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
        --clean \
        --if-exists \
        "${SAFETY_BACKUP}"
    exit 1
fi

# Restart backend
echo -e "${GREEN}🚀 Starting backend API...${NC}"
pm2 start repazoo-backend-api || pm2 restart repazoo-backend-api

# Wait for startup
sleep 3

# Health check
echo -e "${GREEN}🏥 Running health check...${NC}"
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${YELLOW}⚠️  Health check returned: ${HEALTH_CHECK}${NC}"
    echo -e "${YELLOW}Backend might still be starting. Check logs: pm2 logs repazoo-backend-api${NC}"
fi

# Cleanup
unset PGPASSWORD

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Database restore complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "Restored from: ${BACKUP_FILE}"
echo -e "Safety backup: ${SAFETY_BACKUP}"
echo -e "Tables count: ${TABLES_COUNT}"
echo -e ""
echo -e "Next steps:"
echo -e "  - Verify data integrity"
echo -e "  - Check application functionality"
echo -e "  - Review logs: ${YELLOW}pm2 logs repazoo-backend-api${NC}"
echo -e "${GREEN}================================================${NC}"
