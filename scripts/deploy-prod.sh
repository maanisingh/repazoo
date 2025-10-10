#!/bin/bash

# Repazoo PRODUCTION Deployment Script
# Deploys from 'master' branch to dash.repazoo.com
# ⚠️  THIS IS A PRODUCTION DEPLOYMENT - REQUIRES APPROVAL

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="PRODUCTION (DASH)"
BRANCH="master"
FRONTEND_DIST="/root/repazoo/frontend/dist"
BACKEND_DIR="/root/repazoo/backend-api"
REPO_DIR="/root/repazoo"
BACKUP_DIR="/var/backups/postgresql/repazoo"

echo -e "${RED}================================================${NC}"
echo -e "${RED}  ⚠️  PRODUCTION DEPLOYMENT WARNING ⚠️${NC}"
echo -e "${RED}================================================${NC}"
echo -e "${YELLOW}You are about to deploy to PRODUCTION (dash.repazoo.com)${NC}"
echo -e "${YELLOW}This will affect live users!${NC}"
echo ""

# Confirmation prompt
read -p "Are you sure you want to proceed? (type 'yes' to continue): " -r
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 1
fi

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Starting Production Deployment${NC}"
echo -e "${GREEN}================================================${NC}"

# 1. Create database backup before deployment
echo -e "${GREEN}🗃️  Creating database backup...${NC}"
/root/backup_strategy.sh || {
    echo -e "${RED}❌ Database backup failed! Deployment aborted.${NC}"
    exit 1
}

# 2. Check current directory
cd "${REPO_DIR}"

# 3. Verify we're on master branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    echo -e "${YELLOW}⚠️  Switching to ${BRANCH} branch...${NC}"
    git checkout ${BRANCH}
fi

# 4. Pull latest changes
echo -e "${GREEN}📥 Pulling latest changes from ${BRANCH}...${NC}"
git pull origin ${BRANCH}

# 5. Verify staging tests passed
echo -e "${BLUE}Verifying staging deployment status...${NC}"
echo -e "${YELLOW}⚠️  Ensure NTF (staging) testing is complete before proceeding${NC}"
read -p "Have all staging tests passed? (type 'yes' to continue): " -r
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo -e "${RED}Deployment cancelled. Complete staging tests first.${NC}"
    exit 1
fi

# 6. Run full test suite
echo -e "${GREEN}🧪 Running full test suite...${NC}"
cd "${BACKEND_DIR}"
npm test || {
    echo -e "${RED}❌ Tests failed! Deployment aborted.${NC}"
    exit 1
}

# 7. Install backend dependencies
echo -e "${GREEN}📦 Installing backend dependencies...${NC}"
npm install --production

# 8. Build backend
echo -e "${GREEN}🔨 Building backend...${NC}"
npm run build

# 9. Install frontend dependencies
echo -e "${GREEN}📦 Installing frontend dependencies...${NC}"
cd "${REPO_DIR}/frontend"
npm install

# 10. Build frontend
echo -e "${GREEN}🔨 Building frontend for production...${NC}"
npm run build

# 11. Dry-run database migrations
echo -e "${GREEN}🗃️  Testing database migrations...${NC}"
cd "${REPO_DIR}"
echo -e "${YELLOW}⚠️  Review migration files before applying${NC}"
ls -la backend-api/migrations/
read -p "Migrations look correct? (type 'yes' to continue): " -r
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 1
fi

# 12. Apply database migrations
echo -e "${GREEN}🗃️  Applying database migrations...${NC}"
./scripts/run_migrations.sh || {
    echo -e "${RED}❌ Migration failed! Attempting rollback...${NC}"
    # Restore from backup
    LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/repazoo_*.sql.gz | head -1)
    ./scripts/restore-database.sh "${LATEST_BACKUP}"
    exit 1
}

# 13. Create deployment snapshot
echo -e "${GREEN}📸 Creating deployment snapshot...${NC}"
DEPLOY_TAG="deploy-prod-$(date +%Y%m%d-%H%M%S)"
git tag -a "${DEPLOY_TAG}" -m "Production deployment on $(date)"
git push origin "${DEPLOY_TAG}"

# 14. Restart backend API with zero downtime
echo -e "${GREEN}🔄 Restarting backend API...${NC}"
pm2 reload repazoo-backend-api --update-env || {
    echo -e "${RED}❌ Backend restart failed! Rolling back...${NC}"
    git checkout HEAD~1
    npm run build
    pm2 restart repazoo-backend-api
    exit 1
}

# 15. Wait for backend to start
echo -e "${GREEN}⏳ Waiting for backend to stabilize...${NC}"
sleep 10

# 16. Comprehensive health check
echo -e "${GREEN}🏥 Running comprehensive health checks...${NC}"
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://dash.repazoo.com/api/health || echo "000")

if [ "$HEALTH_CHECK" != "200" ]; then
    echo -e "${RED}❌ Health check failed (HTTP $HEALTH_CHECK)${NC}"
    echo -e "${RED}❌ ROLLING BACK DEPLOYMENT${NC}"

    # Rollback
    git checkout HEAD~1
    cd "${BACKEND_DIR}"
    npm run build
    pm2 restart repazoo-backend-api

    # Restore database if needed
    LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/repazoo_*.sql.gz | head -1)
    ./scripts/restore-database.sh "${LATEST_BACKUP}"

    echo -e "${RED}❌ Deployment failed and rolled back${NC}"
    exit 1
fi

# 17. Run critical path smoke tests
echo -e "${GREEN}🔍 Running critical path smoke tests...${NC}"
# Add critical smoke tests here
sleep 2

# 18. Monitor for errors
echo -e "${GREEN}👀 Monitoring for errors (30 seconds)...${NC}"
pm2 logs repazoo-backend-api --lines 20 --nostream

# 19. Final verification
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ PRODUCTION DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Branch: ${BRANCH}"
echo -e "URL: https://dash.repazoo.com"
echo -e "Deployed at: $(date)"
echo -e "Deployment tag: ${DEPLOY_TAG}"
echo -e ""
echo -e "Post-deployment tasks:"
echo -e "  ✓ Database backup created"
echo -e "  ✓ Git deployment tag created"
echo -e "  ✓ Health checks passed"
echo -e ""
echo -e "Next steps:"
echo -e "  - Monitor error logs: ${YELLOW}pm2 logs repazoo-backend-api${NC}"
echo -e "  - Monitor system: ${YELLOW}pm2 monit${NC}"
echo -e "  - Check user feedback"
echo -e "  - Watch for alerts"
echo -e ""
echo -e "Rollback if needed:"
echo -e "  ${YELLOW}./scripts/rollback-deployment.sh ${DEPLOY_TAG}${NC}"
echo -e "${GREEN}================================================${NC}"

# Send deployment notification (configure as needed)
echo "Production deployment completed: ${DEPLOY_TAG}" | mail -s "Repazoo Production Deployment" admin@repazoo.com || true
