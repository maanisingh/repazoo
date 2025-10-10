# Repazoo SaaS - Full Autonomous Deployment Plan

**Status**: In Progress
**Started**: 2025-10-07
**Server**: 2a01:4f8:c013:2625::1

## ✅ Completed Phases

### Phase 1: Secrets Vault ✓
- Age-encrypted vault at `/root/.repazoo-vault/`
- Twitter OAuth credentials stored and encrypted
- Rotation schedule: 90 days
- Scripts: vault-get-secret.sh, vault-list-secrets.sh, vault-audit-log.sh

### Phase 2: Database Schema ✓
- Supabase schema designed (7 tables, 32 RLS policies)
- Migrations ready at `/root/repazoo/supabase/migrations/`
- AES-256-CBC encryption for OAuth tokens
- Comprehensive documentation in `/root/repazoo/docs/database/`

## 🔄 Current Phase

### Phase 3: Supabase Project Setup [IN PROGRESS]
Need to:
1. Install Supabase CLI
2. Create Supabase project or link to existing
3. Deploy migrations
4. Configure encryption key in Vault
5. Verify schema deployment

## 📋 Remaining Phases (4-14)

### Phase 4: Twitter OAuth Handler
- Build OAuth 2.0 PKCE flow
- Implement callback endpoints for all 5 domains
- Token encryption/decryption integration
- Store tokens in Supabase `twitter_accounts` table

### Phase 5: Stripe Payment Gateway
- Create products: Basic ($9/mo Sonnet), Pro ($29/mo Opus)
- Webhook endpoint configuration
- Subscription lifecycle management
- Integration with `subscriptions` table

### Phase 6: FastAPI Backend
- Endpoints: `/api/auth/*`, `/api/webhooks/*`, `/healthz`
- Supabase client integration
- CORS configuration for Appsmith
- Rate limiting and quota enforcement

### Phase 7: Prefect 2.x Orchestration
- Twitter data ingestion flow
- LangChain analysis flow
- Scheduled execution
- Error handling and retries

### Phase 8: LangChain AI Analysis
- Sentiment analysis chain
- Tier-based routing (Basic→Sonnet, Pro→Opus)
- Purpose field personalization
- Store results in `analysis_results` table

### Phase 9: Caddy Reverse Proxy
- SSL for all 5 domains:
  - dash.repazoo.com (Appsmith)
  - api.repazoo.com (FastAPI)
  - wf.repazoo.com (Prefect)
  - ai.repazoo.com (AI endpoint)
  - ntf.repazoo.com (Stripe webhooks)
- Health check routing

### Phase 10: Appsmith UI
- Login page with Twitter OAuth button
- Dashboard: subscription status, analysis results
- Settings page: manage subscription
- Purpose field input

### Phase 11: Metabase Analytics
- Connect to Supabase
- Dashboards: user growth, subscriptions, API usage
- Admin access only

### Phase 12: Docker Compose Orchestration
- Services: Supabase (local), Prefect, FastAPI, Appsmith, Metabase, Caddy, Uptime-Kuma
- Health checks for all containers
- Network and volume configuration
- Environment-specific configs (CFY/NTF/AI)

### Phase 13: E2E Testing
- Basic tier → Sonnet analysis ✓
- Pro tier → Opus analysis ✓
- Inactive → blocked ✓
- OAuth encryption ✓
- Purpose personalization ✓

### Phase 14: Production Readiness Report
- Complete deployment summary
- All domain URLs with /healthz status
- Test results
- Production checklist

## 🎯 Success Criteria

1. All 5 domains responding with valid SSL
2. OAuth flow working end-to-end
3. Stripe webhooks processing correctly
4. Tier-based AI routing functional
5. All health checks passing
6. E2E tests passing
7. Monitoring dashboards operational

## 📊 Architecture Overview

```
User Browser
    ↓
dash.repazoo.com (Appsmith) ──→ Twitter OAuth
    ↓                              ↓
api.repazoo.com (FastAPI) ←───────┘
    ↓
Supabase (PostgreSQL + Auth)
    ↓
wf.repazoo.com (Prefect) ──→ Twitter API
    ↓
ai.repazoo.com (LangChain) ──→ Claude Sonnet/Opus
    ↓
Store results → Supabase
    ↓
ntf.repazoo.com ←── Stripe Webhooks
```

## 🔐 Security Features

- Age-encrypted secrets vault
- AES-256-CBC for OAuth tokens
- RLS policies on all tables
- HTTPS/SSL on all domains
- Service role key isolation
- 7-year audit log retention

## 🚀 Next Steps

1. Install Supabase CLI
2. Create/link Supabase project
3. Deploy database schema
4. Continue with Phase 4 (OAuth)
