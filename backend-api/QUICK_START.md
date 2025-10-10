# Quick Start Guide - Repazoo Code-First Backend

## Prerequisites

1. **Redis** - Running on localhost:6379
2. **PostgreSQL** - Running on localhost:5432
3. **Node.js** - v20 or higher

## Option 1: Automated Start (Recommended)

```bash
cd /root/repazoo/backend-api
./start-dev.sh
```

This script will:
- ✅ Check dependencies
- ✅ Verify Redis & PostgreSQL connections
- ✅ Start API server on port 3001
- ✅ Start BullMQ workers
- ✅ Show API endpoints

## Option 2: Manual Start

### Terminal 1 - API Server
```bash
cd /root/repazoo/backend-api
npm run dev
```

### Terminal 2 - Workers
```bash
cd /root/repazoo/backend-api
npm run start:workers
```

## Test the API

### 1. Health Check
```bash
curl http://localhost:3001/health
```

Expected:
```json
{
  "status": "ok",
  "timestamp": "2025-10-09T14:00:00.000Z",
  "environment": "development"
}
```

### 2. Register a User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'
```

Expected:
```json
{
  "success": true,
  "user_id": "uuid-here",
  "message": "User registered successfully"
}
```

### 3. Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Expected:
```json
{
  "success": true,
  "token": "jwt-token-here",
  "user_id": "uuid-here",
  "message": "Login successful"
}
```

### 4. Connect Twitter
```bash
curl -X POST http://localhost:3001/api/twitter/oauth/connect \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "callback_url": "https://ntf.repazoo.com/auth/twitter/success"
  }'
```

Expected:
```json
{
  "success": true,
  "auth_url": "https://twitter.com/i/oauth2/authorize?..."
}
```

### 5. Create Reputation Scan
```bash
curl -X POST http://localhost:3001/api/scans/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "scan_id": "scan_test_123",
    "purpose": "visa"
  }'
```

Expected:
```json
{
  "status": "success",
  "scan_id": "scan_test_123",
  "message": "Scan started successfully"
}
```

### 6. Check Scan Status
```bash
curl http://localhost:3001/api/scans/scan_test_123
```

Expected:
```json
{
  "success": true,
  "scan": {
    "scan_id": "scan_test_123",
    "status": "pending" | "processing" | "completed",
    ...
  }
}
```

## Backward Compatibility Test

The old `/webhook/*` paths still work:

```bash
curl -X POST http://localhost:3001/webhook/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "password": "password123",
    "full_name": "Test User 2"
  }'
```

This will automatically redirect to `/api/auth/register`.

## Monitoring

### View Queue Status (Optional)

Install BullMQ Board:
```bash
npx bull-board
```

Open http://localhost:3000 to see:
- Active jobs
- Completed jobs
- Failed jobs
- Queue statistics

### Check Logs

API logs and worker logs will appear in the console where you ran them.

## Troubleshooting

### Redis Not Connected
```bash
redis-cli ping
# Should return: PONG

# Start Redis if needed:
docker start redis
# or
redis-server
```

### PostgreSQL Not Accessible
```bash
PGPASSWORD=repuzoo_secure_pass_2024 psql -h localhost -U postgres -d repazoo -c "SELECT 1"

# Check containers if using Docker:
docker ps | grep postgres
```

### Port 3001 Already in Use
```bash
# Find process using port 3001
lsof -i :3001

# Kill it
kill -9 <PID>
```

### Workers Not Processing Jobs
Make sure both API server AND workers are running:
```bash
ps aux | grep tsx
# Should show both src/index.ts and src/workers/index.ts
```

## Next Steps

1. ✅ Backend is running
2. ⚠️ Add real Claude AI API key to `.env`
3. ⚠️ Test with real Twitter OAuth flow
4. ⚠️ Test end-to-end: Registration → Login → OAuth → Scan
5. ✅ Deploy to production (see README.md)

## Production Deployment

For production deployment, see:
- `/root/repazoo/backend-api/README.md` - Full deployment guide
- `/root/repazoo/MIGRATION_TO_CODE_FIRST.md` - Migration overview

## Support

- API Documentation: `/root/repazoo/backend-api/README.md`
- Migration Guide: `/root/repazoo/MIGRATION_TO_CODE_FIRST.md`
- Issues: Check console logs for errors
