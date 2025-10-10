#!/bin/bash

# Repazoo NTF (Staging) Deployment Script
# Deploys from 'staging' branch to ntf.repazoo.com
# This script is called automatically by CI/CD after merging to staging

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="NTF (Staging)"
BRANCH="staging"
FRONTEND_DIST="/root/repazoo/frontend/dist"
BACKEND_DIR="/root/repazoo/backend-api"
REPO_DIR="/root/repazoo"

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Repazoo Deployment - ${ENVIRONMENT}${NC}"
echo -e "${GREEN}================================================${NC}"

# 1. Check current directory
cd "${REPO_DIR}"

# 2. Check current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    echo -e "${YELLOW}⚠️  Switching to ${BRANCH} branch...${NC}"
    git checkout ${BRANCH}
fi

# 3. Pull latest changes
echo -e "${GREEN}📥 Pulling latest changes from ${BRANCH}...${NC}"
git pull origin ${BRANCH}

# 4. Run tests before deploying
echo -e "${GREEN}🧪 Running tests...${NC}"
cd "${BACKEND_DIR}"
npm test || {
    echo -e "${RED}❌ Tests failed! Deployment aborted.${NC}"
    exit 1
}

# 5. Install backend dependencies
echo -e "${GREEN}📦 Installing backend dependencies...${NC}"
npm install

# 6. Build backend
echo -e "${GREEN}🔨 Building backend...${NC}"
npm run build

# 7. Install frontend dependencies
echo -e "${GREEN}📦 Installing frontend dependencies...${NC}"
cd "${REPO_DIR}/frontend"
npm install

# 8. Build frontend
echo -e "${GREEN}🔨 Building frontend...${NC}"
npm run build

# 9. Run database migrations (if any)
echo -e "${GREEN}🗃️  Running database migrations...${NC}"
cd "${REPO_DIR}"
./scripts/run_migrations.sh || {
    echo -e "${YELLOW}⚠️  Migration script not found or failed. Continuing...${NC}"
}

# 10. Restart backend API
echo -e "${GREEN}🔄 Restarting backend API...${NC}"
pm2 restart repazoo-backend-api || pm2 start "${BACKEND_DIR}/dist/index.js" --name repazoo-backend-api

# 11. Wait for backend to start
echo -e "${GREEN}⏳ Waiting for backend to start...${NC}"
sleep 5

# 12. Health check
echo -e "${GREEN}🏥 Running health check...${NC}"
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://ntf.repazoo.com/api/health || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${RED}❌ Health check failed (HTTP $HEALTH_CHECK)${NC}"
    echo -e "${RED}❌ DEPLOYMENT MAY HAVE ISSUES - Please investigate!${NC}"
    echo -e "${YELLOW}Check logs: pm2 logs repazoo-backend-api${NC}"
    exit 1
fi

# 13. Run smoke tests
echo -e "${GREEN}🔍 Running smoke tests...${NC}"
# Add smoke test commands here

# 14. Display deployment info
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Deployment to ${ENVIRONMENT} complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Branch: ${BRANCH}"
echo -e "URL: https://ntf.repazoo.com"
echo -e "Deployed at: $(date)"
echo -e ""
echo -e "Next steps:"
echo -e "  - Run manual smoke tests at https://ntf.repazoo.com"
echo -e "  - Verify critical workflows"
echo -e "  - If all tests pass, create PR to master for production deployment"
echo -e "  - Check logs: ${YELLOW}pm2 logs repazoo-backend-api${NC}"
echo -e "${GREEN}================================================${NC}"
