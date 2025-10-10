# Repazoo Backend - Quick Start Guide

## 5-Minute Setup (Development)

### Prerequisites
- Python 3.11+
- Redis server running
- Supabase project configured
- Environment variables set

### Step 1: Install Dependencies (2 min)

```bash
cd /root/repazoo/backend

# Create virtual environment (optional but recommended)
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Configure Environment (1 min)

```bash
# Copy environment template
cp .env.example /root/.repazoo-vault/.env

# Edit with your credentials
nano /root/.repazoo-vault/.env

# Minimum required variables:
# - SUPABASE_URL
# - SUPABASE_SERVICE_KEY
# - SUPABASE_ANON_KEY
# - REDIS_URL (default: redis://localhost:6379/0)
# - JWT_SECRET_KEY
```

### Step 3: Start Redis (1 min)

```bash
# Option 1: Docker (recommended)
docker run -d --name repazoo-redis -p 6379:6379 redis:7-alpine

# Option 2: Local Redis
redis-server

# Verify Redis is running
redis-cli ping  # Should return PONG
```

### Step 4: Start Application (1 min)

```bash
# Development mode (with hot reload)
python main.py

# Alternative: Using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Step 5: Verify (30 sec)

```bash
# Check health
curl http://localhost:8000/healthz

# Check API docs
open http://localhost:8000/docs

# Check all health endpoints
curl http://localhost:8000/healthz/db
curl http://localhost:8000/healthz/redis
curl http://localhost:8000/healthz/vault
```

## Expected Output

When the application starts successfully:

```
================================================================================
Starting Repazoo Backend - Environment: local
================================================================================
INFO:     Rate limiter initialized
INFO:     Database connection verified
INFO:     CORS origins: ['https://dash.repazoo.com', ...]
INFO:     Debug mode: True
INFO:     Rate limits: 60/min, 1000/hour
INFO:     All routers registered
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

## Access Points

After successful start:

- **API Root**: http://localhost:8000/
- **API Docs (Swagger)**: http://localhost:8000/docs
- **API Docs (ReDoc)**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/healthz
- **Deployment Info**: http://localhost:8000/info

## Common Issues & Solutions

### Issue: "Database connection failed"

**Solution:**
```bash
# Verify Supabase credentials
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY | cut -c1-20  # Show first 20 chars

# Test connection
curl $SUPABASE_URL/rest/v1/
```

### Issue: "Redis connection failed"

**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# If not running, start it
docker run -d -p 6379:6379 redis:7-alpine

# Or use local Redis
redis-server &
```

### Issue: "Module not found"

**Solution:**
```bash
# Make sure you're in virtual environment
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt

# Check installation
pip list | grep -i fastapi
```

### Issue: "Vault secrets not found"

**Solution:**
```bash
# Check vault directory exists
ls -la /root/.repazoo-vault/

# Check .env file exists
cat /root/.repazoo-vault/.env

# Verify secrets directory
ls -la /root/.repazoo-vault/secrets/
```

## Testing the API

### 1. Health Checks

```bash
# Basic health
curl http://localhost:8000/healthz

# Database health
curl http://localhost:8000/healthz/db

# Redis health
curl http://localhost:8000/healthz/redis

# All services
curl http://localhost:8000/healthz/vault
```

### 2. OAuth Flow (requires Twitter credentials)

```bash
# Initiate OAuth
curl "http://localhost:8000/auth/twitter/login?domain=dash"

# Response will include authorization_url - visit it in browser
```

### 3. API Endpoints (requires authentication)

```bash
# Get access token first (mock for testing)
TOKEN="your-jwt-token-here"

# Get user profile
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/users/me

# Check quota
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/usage/quota

# List analyses
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/analyses
```

## Using Swagger UI

1. Open http://localhost:8000/docs in browser
2. Click "Authorize" button
3. Enter Bearer token: `Bearer your-token-here`
4. Try any endpoint interactively

## Running Tests

```bash
# Install test dependencies (already in requirements.txt)
pip install pytest pytest-asyncio pytest-cov

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_api.py -v

# Run with coverage
pytest --cov=. --cov-report=html
```

## Docker Quick Start

### Build and Run

```bash
# Build image
docker build -t repazoo-backend:latest .

# Run container
docker run -d \
  --name repazoo-api \
  -p 8000:8000 \
  --env-file /root/.repazoo-vault/.env \
  -v /root/.repazoo-vault:/vault:ro \
  repazoo-backend:latest

# Check logs
docker logs -f repazoo-api

# Check health
curl http://localhost:8000/healthz
```

### Stop and Remove

```bash
docker stop repazoo-api
docker rm repazoo-api
```

## Production Checklist

Before deploying to production:

- [ ] Set `REPAZOO_ENV=ai` (or ntf for staging)
- [ ] Set `DEBUG=false`
- [ ] Use production Supabase project
- [ ] Use production Stripe keys
- [ ] Configure production Redis
- [ ] Set strong `JWT_SECRET_KEY`
- [ ] Set strong `ENCRYPTION_KEY`
- [ ] Configure CORS for production domains
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Enable HTTPS
- [ ] Run security audit
- [ ] Test all health checks
- [ ] Verify rate limiting works
- [ ] Test OAuth flow end-to-end
- [ ] Test Stripe webhooks

## Environment Variables Quick Reference

**Required:**
```bash
REPAZOO_ENV=local
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...
SUPABASE_ANON_KEY=eyJhbG...
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=your-secret-key
```

**Optional but Recommended:**
```bash
TWITTER_CLIENT_ID=your-client-id
TWITTER_CLIENT_SECRET=your-client-secret
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

## Next Steps

1. **Configure Services**
   - Set up Supabase project and apply migrations
   - Configure Twitter OAuth app
   - Set up Stripe products and prices
   - Configure webhooks

2. **Develop & Test**
   - Use Swagger UI for interactive testing
   - Run test suite to verify functionality
   - Test OAuth flow end-to-end
   - Verify billing integration

3. **Deploy**
   - Build Docker image
   - Deploy to staging (NTF)
   - Run smoke tests
   - Deploy to production (AI)

## Support

- **Documentation**: See `/root/repazoo/backend/README.md`
- **Architecture**: See `/root/repazoo/backend/IMPLEMENTATION_SUMMARY.md`
- **API Docs**: http://localhost:8000/docs (when running)
- **Health Checks**: http://localhost:8000/healthz/*

## Summary

You should now have:
- ✓ Backend running on http://localhost:8000
- ✓ API documentation at /docs
- ✓ Health checks passing
- ✓ Redis connected
- ✓ Database connected
- ✓ Ready for development/testing

**Happy coding!** 🚀
