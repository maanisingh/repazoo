#!/bin/bash

# Repazoo Deployment Rollback Script
# Rolls back to a previous deployment tag
# Usage: ./rollback-deployment.sh <deployment-tag>

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO_DIR="/root/repazoo"
BACKEND_DIR="/root/repazoo/backend-api"
BACKUP_DIR="/var/backups/postgresql/repazoo"

# Check if deployment tag is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: No deployment tag specified${NC}"
    echo "Usage: $0 <deployment-tag>"
    echo ""
    echo "Available deployment tags:"
    git tag | grep "deploy-prod-" | tail -10
    exit 1
fi

DEPLOY_TAG="$1"

# Verify tag exists
if ! git rev-parse "$DEPLOY_TAG" >/dev/null 2>&1; then
    echo -e "${RED}Error: Deployment tag not found: $DEPLOY_TAG${NC}"
    echo ""
    echo "Available tags:"
    git tag | grep "deploy-prod-" | tail -10
    exit 1
fi

echo -e "${RED}================================================${NC}"
echo -e "${RED}  ⚠️  DEPLOYMENT ROLLBACK WARNING ⚠️${NC}"
echo -e "${RED}================================================${NC}"
echo -e "${YELLOW}You are about to rollback to:${NC}"
echo -e "${YELLOW}$DEPLOY_TAG${NC}"
echo ""

# Show what will be rolled back to
git show --no-patch --format="%h - %s (%cr)" "$DEPLOY_TAG"
echo ""

# Confirmation
read -p "Are you sure you want to rollback? (type 'yes' to continue): " -r
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo -e "${GREEN}Rollback cancelled.${NC}"
    exit 0
fi

# 1. Create emergency backup
echo -e "${GREEN}🗃️  Creating emergency database backup...${NC}"
/root/backup_strategy.sh || {
    echo -e "${RED}❌ Emergency backup failed!${NC}"
    exit 1
}

# 2. Stop backend
echo -e "${YELLOW}🛑 Stopping backend API...${NC}"
pm2 stop repazoo-backend-api

# 3. Checkout rollback tag
echo -e "${GREEN}⏮️  Rolling back code to ${DEPLOY_TAG}...${NC}"
cd "${REPO_DIR}"
git checkout "$DEPLOY_TAG"

# 4. Rebuild backend
echo -e "${GREEN}🔨 Building backend...${NC}"
cd "${BACKEND_DIR}"
npm install --production
npm run build

# 5. Rebuild frontend
echo -e "${GREEN}🔨 Building frontend...${NC}"
cd "${REPO_DIR}/frontend"
npm install
npm run build

# 6. Check if database rollback needed
echo -e "${YELLOW}⚠️  Database rollback may be needed${NC}"
echo -e "${YELLOW}If the rolled-back code is incompatible with current database schema:${NC}"
read -p "Do you need to restore database? (yes/no): " -r
if [[ $REPLY =~ ^yes$ ]]; then
    echo ""
    echo "Recent backups:"
    ls -lht ${BACKUP_DIR}/*.sql.gz | head -5
    echo ""
    read -p "Enter backup filename (or 'skip' to skip): " BACKUP_FILE

    if [[ ! $BACKUP_FILE =~ ^skip$ ]]; then
        ./scripts/restore-database.sh "${BACKUP_DIR}/${BACKUP_FILE}"
    fi
fi

# 7. Restart backend
echo -e "${GREEN}🚀 Starting backend API...${NC}"
pm2 restart repazoo-backend-api

# 8. Wait for startup
echo -e "${GREEN}⏳ Waiting for backend to start...${NC}"
sleep 5

# 9. Health check
echo -e "${GREEN}🏥 Running health check...${NC}"
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${RED}❌ Health check failed (HTTP $HEALTH_CHECK)${NC}"
    echo -e "${RED}Rollback may have issues. Check logs!${NC}"
    echo -e "${YELLOW}Logs: pm2 logs repazoo-backend-api${NC}"
    exit 1
fi

# 10. Create rollback tag for tracking
ROLLBACK_TAG="rollback-to-${DEPLOY_TAG}-$(date +%Y%m%d-%H%M%S)"
git tag -a "${ROLLBACK_TAG}" -m "Rolled back to ${DEPLOY_TAG} on $(date)"
git push origin "${ROLLBACK_TAG}" || true

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Rollback complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "Rolled back to: ${DEPLOY_TAG}"
echo -e "Rollback tag: ${ROLLBACK_TAG}"
echo -e ""
echo -e "Next steps:"
echo -e "  - Verify application functionality"
echo -e "  - Monitor error logs: ${YELLOW}pm2 logs repazoo-backend-api${NC}"
echo -e "  - Investigate root cause of the issue"
echo -e "  - Create hotfix if needed"
echo -e "${GREEN}================================================${NC}"
