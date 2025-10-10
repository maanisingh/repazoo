#!/bin/bash

# Repazoo CFY (Development) Deployment Script
# Deploys from 'develop' branch to cfy.repazoo.com
# This script is called automatically by CI/CD or manually by developers

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="CFY (Development)"
BRANCH="develop"
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

# 4. Install backend dependencies
echo -e "${GREEN}📦 Installing backend dependencies...${NC}"
cd "${BACKEND_DIR}"
npm install

# 5. Build backend
echo -e "${GREEN}🔨 Building backend...${NC}"
npm run build

# 6. Install frontend dependencies
echo -e "${GREEN}📦 Installing frontend dependencies...${NC}"
cd "${REPO_DIR}/frontend"
npm install

# 7. Build frontend
echo -e "${GREEN}🔨 Building frontend...${NC}"
npm run build

# 8. Restart backend API
echo -e "${GREEN}🔄 Restarting backend API...${NC}"
pm2 restart repazoo-backend-api || pm2 start "${BACKEND_DIR}/dist/index.js" --name repazoo-backend-api

# 9. Wait for backend to start
echo -e "${GREEN}⏳ Waiting for backend to start...${NC}"
sleep 3

# 10. Health check
echo -e "${GREEN}🏥 Running health check...${NC}"
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://cfy.repazoo.com/api/health || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${RED}❌ Health check failed (HTTP $HEALTH_CHECK)${NC}"
    echo -e "${YELLOW}⚠️  Backend might still be starting up. Check logs with: pm2 logs repazoo-backend-api${NC}"
fi

# 11. Display deployment info
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Deployment to ${ENVIRONMENT} complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Branch: ${BRANCH}"
echo -e "URL: https://cfy.repazoo.com"
echo -e "Deployed at: $(date)"
echo -e ""
echo -e "Next steps:"
echo -e "  - Test your changes at https://cfy.repazoo.com"
echo -e "  - Check logs: ${YELLOW}pm2 logs repazoo-backend-api${NC}"
echo -e "  - Monitor: ${YELLOW}pm2 monit${NC}"
echo -e "${GREEN}================================================${NC}"
