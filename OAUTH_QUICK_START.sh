#!/bin/bash
# Repazoo Twitter OAuth 2.0 - Quick Start Setup Script
# Run this script to set up the OAuth system

set -e

echo "=============================================="
echo "Repazoo Twitter OAuth 2.0 Setup"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKEND_DIR="/root/repazoo/backend"
VAULT_DIR="/root/.repazoo-vault"
MIGRATIONS_DIR="/root/repazoo/supabase/migrations"

# Step 1: Check Prerequisites
echo -e "${BLUE}Step 1: Checking prerequisites...${NC}"
echo ""

if [ ! -d "$VAULT_DIR" ]; then
    echo -e "${RED}Error: Vault directory not found at $VAULT_DIR${NC}"
    exit 1
fi

if [ ! -f "$VAULT_DIR/scripts/vault-get-secret.sh" ]; then
    echo -e "${RED}Error: Vault script not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Vault system found${NC}"

# Step 2: Check Python Dependencies
echo ""
echo -e "${BLUE}Step 2: Installing Python dependencies...${NC}"
cd "$BACKEND_DIR"

if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}Error: requirements.txt not found${NC}"
    exit 1
fi

pip install -q -r requirements.txt
echo -e "${GREEN}✓ Python dependencies installed${NC}"

# Step 3: Verify Vault Access
echo ""
echo -e "${BLUE}Step 3: Verifying vault access...${NC}"

if ! "$VAULT_DIR/scripts/vault-get-secret.sh" TWITTER_CLIENT_ID repazoo-oauth-service >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Vault access not configured${NC}"
    echo ""
    echo "You need to configure vault ACL. Add this to $VAULT_DIR/secrets/access-control.json:"
    echo ""
    echo '{'
    echo '  "rules": ['
    echo '    {'
    echo '      "service": "repazoo-oauth-service",'
    echo '      "secrets": ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],'
    echo '      "permissions": ["read"],'
    echo '      "description": "OAuth service credentials"'
    echo '    }'
    echo '  ]'
    echo '}'
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo -e "${GREEN}✓ Vault access configured${NC}"

# Step 4: Environment Configuration
echo ""
echo -e "${BLUE}Step 4: Checking environment configuration...${NC}"

if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo "Creating from template..."
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo ""
    echo -e "${YELLOW}Please edit $BACKEND_DIR/.env with your actual values:${NC}"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo "  - DB_ENCRYPTION_KEY (generate with: openssl rand -base64 32)"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo -e "${GREEN}✓ Environment file found${NC}"

# Step 5: Database Migrations
echo ""
echo -e "${BLUE}Step 5: Database migrations...${NC}"

if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠ DATABASE_URL not set${NC}"
    echo "Please set DATABASE_URL environment variable, then run:"
    echo ""
    echo "  psql \$DATABASE_URL -f $MIGRATIONS_DIR/20251007_001_initial_schema.sql"
    echo "  psql \$DATABASE_URL -f $MIGRATIONS_DIR/20251007_002_encryption_functions.sql"
    echo "  psql \$DATABASE_URL -f $MIGRATIONS_DIR/20251007_005_oauth_state_table.sql"
    echo ""
    echo "And set the encryption key:"
    echo "  psql \$DATABASE_URL -c \"ALTER DATABASE your_db SET app.settings.encryption_key = 'YOUR_KEY';\""
else
    echo "Found DATABASE_URL. Applying migrations..."

    for migration in 20251007_001_initial_schema.sql 20251007_002_encryption_functions.sql 20251007_005_oauth_state_table.sql; do
        if [ -f "$MIGRATIONS_DIR/$migration" ]; then
            echo "  Applying $migration..."
            psql "$DATABASE_URL" -f "$MIGRATIONS_DIR/$migration" -q
        fi
    done

    echo -e "${GREEN}✓ Migrations applied${NC}"
fi

# Step 6: Verify Setup
echo ""
echo -e "${BLUE}Step 6: Verifying setup...${NC}"

if [ -n "$DATABASE_URL" ]; then
    echo "Running encryption verification..."
    psql "$DATABASE_URL" -c "SELECT * FROM verify_encryption_setup();" -t
fi

# Step 7: Test OAuth Service
echo ""
echo -e "${BLUE}Step 7: Testing OAuth configuration...${NC}"

cd "$BACKEND_DIR"
python3 -c "
from auth.config import get_oauth_config
try:
    config = get_oauth_config()
    print('✓ OAuth configuration loaded successfully')
    print(f'  Client ID: {config.twitter_client_id[:10]}...')
    print(f'  Scopes: {len(config.twitter_scopes)} scopes configured')
    print(f'  Callback URLs: {len(config.callback_urls)} domains')
except Exception as e:
    print(f'✗ Configuration error: {e}')
    exit(1)
"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ OAuth configuration valid${NC}"
else
    echo -e "${RED}✗ OAuth configuration failed${NC}"
    exit 1
fi

# Success
echo ""
echo -e "${GREEN}=============================================="
echo "✓ Setup Complete!"
echo "==============================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the backend server:"
echo "   cd $BACKEND_DIR"
echo "   python main.py"
echo ""
echo "2. Access API documentation:"
echo "   http://localhost:8000/docs"
echo ""
echo "3. Test OAuth health:"
echo "   curl http://localhost:8000/auth/twitter/health"
echo ""
echo "4. View full documentation:"
echo "   cat $BACKEND_DIR/auth/README.md"
echo ""
echo "5. Read implementation summary:"
echo "   cat /root/repazoo/OAUTH_IMPLEMENTATION_SUMMARY.md"
echo ""
