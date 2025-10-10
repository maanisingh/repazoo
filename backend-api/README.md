# Repazoo Backend API

Code-first TypeScript backend with BullMQ workflow orchestration, replacing n8n.

## Architecture

```
Frontend → Express API → BullMQ Queues → Workers → Services → Database/APIs
```

### Key Components

- **Express API Server** (`src/index.ts`): REST API endpoints
- **BullMQ Queues** (`src/queues/`): Job queues for async processing
- **Workers** (`src/workers/`): Background job processors
- **Services** (`src/services/`): Business logic layer
- **Routes** (`src/routes/`): API route handlers

### Queues & Workers

1. **Auth Queue** → Auth Worker
   - User registration
   - User login
   - Password reset

2. **Twitter OAuth Queue** → Twitter OAuth Worker
   - OAuth URL generation
   - OAuth callback handling
   - Token storage

3. **Reputation Scan Queue** → Scan Worker
   - Fetch user tweets
   - AI analysis with Claude
   - Store results

## Setup

### 1. Install Dependencies

```bash
cd /root/repazoo/backend-api
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST`: Redis host (default: localhost)
- `JWT_SECRET`: Secret for JWT tokens
- `TWITTER_CLIENT_ID`: Twitter OAuth client ID
- `TWITTER_CLIENT_SECRET`: Twitter OAuth client secret
- `ANTHROPIC_API_KEY`: Claude AI API key

### 3. Ensure Redis is Running

```bash
docker ps | grep redis
# or
redis-cli ping
```

### 4. Start the API Server

```bash
npm run dev
# or for production
npm run build && npm start
```

API runs on http://localhost:3001

### 5. Start the Workers (in a separate terminal)

```bash
npm run start:workers
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/password-reset` - Request password reset

### Twitter
- `POST /api/twitter/oauth/connect` - Initiate OAuth
- `GET /api/twitter/oauth/callback` - OAuth callback
- `GET /api/twitter/status/:user_id` - Get connection status
- `GET /api/twitter/my-posts/:user_id` - Get user tweets
- `POST /api/twitter/post-tweet` - Post a tweet
- `POST /api/twitter/delete-tweet` - Delete a tweet

### Scans
- `POST /api/scans/create` - Create reputation scan
- `GET /api/scans/:scan_id` - Get scan by ID
- `GET /api/scans` - Get all scans
- `GET /api/scans/stats/dashboard` - Dashboard statistics

### Backward Compatibility

n8n webhook paths are supported via redirects:
- `/webhook/register` → `/api/auth/register`
- `/webhook/twitter-reputation-scan` → `/api/scans/create`
- etc.

## Development

### Run with hot reload
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Run tests
```bash
npm test
```

## Migration from n8n

### What Changed

❌ **Before (n8n)**
- GUI-based workflow editor
- Webhook endpoints at `ntf.repazoo.com/webhook/*`
- Complex workflow JSON
- Hard to debug and test

✅ **After (Code-First)**
- Pure TypeScript code
- REST API at `/api/*`
- Git-versioned code
- Easy to debug and test

### Frontend Changes Needed

Update `frontend/src/lib/api/n8n-client.ts`:

```typescript
// OLD
const N8N_WEBHOOK_BASE = 'https://ntf.repazoo.com/webhook';

// NEW
const API_BASE = 'https://api.repazoo.com/api';
// or for backward compatibility:
const API_BASE = 'https://ntf.repazoo.com/webhook'; // still works!
```

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

### Environment Setup

For production, ensure:
1. Redis is accessible
2. PostgreSQL is accessible
3. All environment variables are set
4. Both API server AND workers are running

### Process Manager (PM2)

```bash
# Start API
pm2 start dist/index.js --name repazoo-api

# Start workers
pm2 start dist/workers/index.js --name repazoo-workers
```

## Monitoring

### BullMQ UI (Optional)

```bash
npx bull-board
```

Access at http://localhost:3000 to monitor queues.

### Health Check

```bash
curl http://localhost:3001/health
```

## Troubleshooting

### Redis Connection Issues
```bash
redis-cli ping
# Should return PONG
```

### Database Connection Issues
```bash
psql $DATABASE_URL -c "SELECT 1"
```

### Job Not Processing
Check workers are running:
```bash
pm2 list
# or
ps aux | grep workers
```

## Tech Stack

- **Express.js**: Web framework
- **BullMQ**: Job queue system
- **TypeScript**: Type-safe development
- **PostgreSQL**: Database
- **Redis**: Queue backend
- **Twitter API v2**: Twitter integration
- **Claude AI**: Reputation analysis
- **Zod**: Schema validation
- **JWT**: Authentication

## License

Proprietary - Repazoo Inc.
