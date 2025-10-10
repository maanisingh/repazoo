# Repazoo - Quick Start Guide

**Get started with Repazoo in 5 minutes**

---

## 1. Access the Platform

### Dashboard
Visit: **https://dash.repazoo.com**

First-time setup:
1. Create admin account
2. Connect to PostgreSQL database:
   - Host: `postgres`
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres`
   - Password: Check `/root/repazoo/.env`

### API
Base URL: **https://ai.repazoo.com**

Test it:
```bash
curl https://ai.repazoo.com/healthz
```

---

## 2. Connect Twitter Account

### Step 1: Initiate OAuth Flow

```bash
curl "https://ai.repazoo.com/auth/twitter/login?domain=ai"
```

Response:
```json
{
  "authorization_url": "https://twitter.com/i/oauth2/authorize?...",
  "state": "abc123...",
  "expires_at": "2025-10-07T22:30:00Z"
}
```

### Step 2: Authorize on Twitter

1. Copy the `authorization_url`
2. Visit it in your browser
3. Click "Authorize app"
4. You'll be redirected to callback URL

### Step 3: Account Connected!

Your Twitter account is now connected and tokens are encrypted in the database.

---

## 3. Run Your First Analysis

### Example Request

```bash
curl -X POST https://ai.repazoo.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "twitter_account_id": "YOUR_ACCOUNT_ID",
    "purpose": "job_search",
    "analysis_depth": "standard"
  }'
```

### Analysis Purposes

- `job_search` - Professional reputation check
- `visa_application` - Security and compliance screening
- `brand_building` - Brand safety and engagement
- `political_campaign` - Political bias detection
- `security_clearance` - Extremism and risk detection
- `personal_reputation` - General reputation management

### Response

```json
{
  "analysis_id": "uuid",
  "risk_score": 45.2,
  "risk_level": "moderate",
  "bias_categories": {
    "political": 0.35,
    "demographic": 0.12,
    "ideological": 0.18
  },
  "sentiment": "neutral",
  "flagged_content": [
    {
      "tweet_id": "123",
      "reason": "Potentially controversial topic",
      "severity": "low"
    }
  ],
  "recommendations": [
    "Consider reviewing tweets about political topics",
    "Strong professional presence detected"
  ]
}
```

---

## 4. Monitor Services

### Uptime Kuma
Access: `http://128.140.82.187:3002`

Set up monitors for:
- https://dash.repazoo.com
- https://ai.repazoo.com
- https://ntf.repazoo.com
- https://wf.repazoo.com

### Workflows (Prefect)
Access: **https://wf.repazoo.com**

View:
- Scheduled analyses
- Workflow runs
- Task history

### Logs

```bash
# API logs
docker logs -f repazoo-api

# All services status
docker ps --filter "name=repazoo"
```

---

## 5. Common Tasks

### Check Twitter OAuth Status

```bash
curl https://ai.repazoo.com/auth/twitter/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Disconnect Twitter Account

```bash
curl -X POST https://ai.repazoo.com/auth/twitter/revoke \
  -H "Content-Type: application/json" \
  -d '{
    "twitter_account_id": "uuid"
  }'
```

### View API Usage

```bash
# Check your subscription tier and quota
curl https://ai.repazoo.com/api/usage \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 6. Subscription Tiers

| Tier | Monthly Quota | AI Model | Price |
|------|--------------|----------|-------|
| **Free** | 10 analyses | Claude Haiku | $0 |
| **Basic** | 100 analyses | Claude Sonnet | $29/mo |
| **Pro** | 1000 analyses | Claude Opus | $99/mo |
| **Enterprise** | Unlimited | Claude Opus | Custom |

### Create Subscription

```bash
curl -X POST https://ai.repazoo.com/api/subscriptions/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "uuid",
    "tier": "pro",
    "payment_method_id": "pm_stripe_token"
  }'
```

---

## 7. Troubleshooting

### SSL Certificate Errors

Wait 2-3 minutes after first accessing a domain for SSL certificate to be issued.

Check status:
```bash
docker logs repazoo-caddy 2>&1 | grep "certificate obtained"
```

### API Not Responding

```bash
# Check API is running
docker ps | grep repazoo-api

# Restart if needed
docker restart repazoo-api

# Check logs
docker logs --tail 50 repazoo-api
```

### Database Connection Issues

```bash
# Test database
docker exec repazoo-postgres psql -U postgres -c "SELECT 1;"

# Check tables
docker exec repazoo-postgres psql -U postgres -c "\dt"
```

### Twitter OAuth Failing

1. Verify credentials:
   ```bash
   docker exec repazoo-api env | grep TWITTER
   ```

2. Check OAuth health:
   ```bash
   curl https://ai.repazoo.com/auth/twitter/health
   ```

3. Ensure callback URL matches Twitter Developer Portal exactly

---

## 8. Security Notes

- All tokens encrypted at rest (AES-256)
- Row-Level Security enabled on all tables
- Audit logging for all actions
- GDPR-compliant data export/deletion
- HTTPS enforced on all domains

---

## 9. Useful Commands

```bash
# View all services
docker compose -f /root/repazoo/docker-compose.production.yml ps

# Restart all services
docker compose -f /root/repazoo/docker-compose.production.yml restart

# View environment
cat /root/repazoo/.env

# Database backup
docker exec repazoo-postgres pg_dump -U postgres postgres > backup.sql

# Check disk usage
docker system df
```

---

## 10. Getting Help

### Documentation
- Production Guide: `/root/repazoo/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`
- API Reference: `/root/repazoo/docs/API_REFERENCE.md`
- Database Schema: `/root/repazoo/supabase/migrations/`

### Service Status

```bash
# Health checks
curl https://ai.repazoo.com/healthz
curl https://ai.repazoo.com/healthz/db
curl https://ai.repazoo.com/healthz/redis
```

### System Info

```bash
# Deployment info
curl https://ai.repazoo.com/info
```

---

**You're all set! Start analyzing Twitter accounts with Repazoo.**

For detailed API documentation and advanced features, see `/root/repazoo/docs/PRODUCTION_DEPLOYMENT_GUIDE.md`
