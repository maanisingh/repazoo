# Repazoo Database Quick Reference

## Essential Commands

### Verification

```sql
-- Check schema integrity
SELECT * FROM verify_database_schema();

-- Check encryption
SELECT * FROM verify_encryption_setup();

-- Count RLS policies
SELECT * FROM count_rls_policies();

-- Get table stats
SELECT * FROM get_table_statistics();
```

### User Operations

```sql
-- Get current user
SELECT auth.uid();

-- Get user tier
SELECT get_user_tier();

-- Check subscription
SELECT has_active_subscription();

-- Check if admin
SELECT is_admin();
```

### Twitter Account Operations

```sql
-- Connect account (auto-encrypts)
SELECT insert_twitter_account(
    auth.uid(),
    'twitter_user_id',
    'username',
    'access_token',
    'refresh_token',
    now() + INTERVAL '2 hours',
    ARRAY['tweet.read', 'tweet.write']
);

-- Update tokens (auto-encrypts)
SELECT update_twitter_tokens(
    'account-id'::UUID,
    'new_access_token',
    'new_refresh_token',
    now() + INTERVAL '2 hours'
);

-- Get decrypted tokens (service role only)
SELECT * FROM get_decrypted_twitter_tokens('account-id'::UUID);

-- List user's accounts
SELECT * FROM twitter_accounts WHERE user_id = auth.uid();
```

### Rate Limiting

```sql
-- Check rate limit
SELECT check_rate_limit('/api/analyze', 100, 60);

-- Get quota
SELECT * FROM get_remaining_quota();

-- Log API usage
INSERT INTO api_usage (user_id, endpoint, method, status_code, response_time_ms)
VALUES (auth.uid(), '/api/analyze', 'POST', 200, 150);
```

### Analysis Results

```sql
-- Create analysis
INSERT INTO analysis_results (
    user_id, twitter_account_id, purpose, model_used,
    analysis_type, input_data, output_data, execution_time_ms
) VALUES (
    auth.uid(),
    'account-id'::UUID,
    'Sentiment analysis for brand monitoring',
    'sonnet',
    'sentiment',
    '{"tweets": [...]}'::jsonb,
    '{"score": 0.85}'::jsonb,
    1250
);

-- Get recent analyses
SELECT * FROM analysis_results
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 20;
```

### Webhook Processing

```sql
-- Log webhook
INSERT INTO webhook_events (event_type, stripe_event_id, payload)
VALUES ('customer.subscription.updated', 'evt_123', '{...}'::jsonb);

-- Get unprocessed
SELECT * FROM webhook_events WHERE processed = false;

-- Mark processed
UPDATE webhook_events
SET processed = true, processed_at = now()
WHERE id = 'webhook-id'::UUID;
```

### Audit Log

```sql
-- Log action
INSERT INTO audit_log (user_id, action, resource_type, resource_id)
VALUES (auth.uid(), 'OAUTH_CONNECT', 'twitter_account', 'account-id');

-- View user's audit trail
SELECT * FROM audit_log
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 50;
```

## Table Relationships

```
users
  └── twitter_accounts (1:N)
       └── analysis_results (1:N)
  └── subscriptions (1:1)
  └── api_usage (1:N)
  └── audit_log (1:N)

webhook_events (independent)
```

## RLS Quick Reference

| Table | User Can | Service Can |
|-------|----------|-------------|
| users | View/Update Own | Full Access |
| twitter_accounts | Full CRUD Own | Full Access |
| subscriptions | View Own | Full Access |
| analysis_results | View/Delete Own | Full Access |
| api_usage | View Own | Full Access |
| webhook_events | No Access | Full Access |
| audit_log | View Own | Full Access |

## Encryption Quick Reference

**Encrypted Fields**:
- `twitter_accounts.access_token_encrypted` (BYTEA)
- `twitter_accounts.refresh_token_encrypted` (BYTEA)

**Functions**:
- `encrypt_token(TEXT)` → BYTEA
- `decrypt_token(BYTEA)` → TEXT
- `insert_twitter_account(...)` (auto-encrypts)
- `update_twitter_tokens(...)` (auto-encrypts)
- `get_decrypted_twitter_tokens(UUID)` (service role only)

**Never**:
- Don't use raw INSERT on twitter_accounts
- Don't expose decrypted tokens to frontend
- Don't log decrypted tokens

## Index Reference

**Primary Lookups**:
- `idx_users_email` - User login
- `idx_twitter_accounts_user_id` - User's accounts
- `idx_subscriptions_user_id` - User subscription

**Performance**:
- `idx_analysis_results_created_at` - Recent analyses
- `idx_api_usage_user_date` - Usage history
- `idx_audit_log_created_at` - Recent audit entries

**Partial** (optimized):
- `idx_twitter_accounts_is_active` WHERE is_active = true
- `idx_subscriptions_active` WHERE status = 'active'
- `idx_webhook_events_processed` WHERE processed = false

## Subscription Tiers

| Tier | AI Model | Quota/Month | Features |
|------|----------|-------------|----------|
| basic | Sonnet | 1,000 | Basic analysis |
| pro | Opus | 10,000 | Advanced analysis |
| inactive | None | 0 | No access |

## Analysis Types

- `sentiment` - Sentiment analysis
- `engagement` - Engagement metrics
- `growth` - Growth analysis
- `content_analysis` - Content quality
- `trend_detection` - Trend identification
- `risk_assessment` - Risk evaluation

## Audit Actions

- `CREATE`, `READ`, `UPDATE`, `DELETE`
- `LOGIN`, `LOGOUT`
- `OAUTH_CONNECT`, `OAUTH_DISCONNECT`
- `SUBSCRIPTION_CREATED`, `SUBSCRIPTION_UPDATED`, `SUBSCRIPTION_CANCELED`
- `ANALYSIS_EXECUTED`, `TOKEN_REFRESHED`
- `ADMIN_ACTION`

## Common Patterns

### Check User Access

```sql
-- Verify user owns resource
SELECT owns_twitter_account('account-id'::UUID);

-- Verify active subscription
SELECT has_active_subscription();

-- Get tier for model selection
SELECT CASE get_user_tier()
    WHEN 'basic' THEN 'sonnet'
    WHEN 'pro' THEN 'opus'
    ELSE NULL
END AS allowed_model;
```

### Rate Limiting Pattern

```javascript
// Backend rate limit check
const withinLimit = await supabase.rpc('check_rate_limit', {
  p_endpoint: '/api/analyze',
  p_limit: 100,
  p_window_minutes: 60
})

if (!withinLimit) {
  throw new Error('Rate limit exceeded')
}
```

### Quota Check Pattern

```javascript
// Check remaining quota
const { data: quota } = await supabase.rpc('get_remaining_quota')

if (quota.remaining <= 0) {
  throw new Error('Quota exhausted')
}
```

## Environment Variables

```bash
# Required
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=eyJ... (frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (backend only)

# Optional
DATABASE_URL=postgresql://... (direct connection)
ENCRYPTION_KEY=... (or use Supabase Vault)
```

## File Locations

```
/root/repazoo/
├── supabase/migrations/
│   ├── 20251007_001_initial_schema.sql
│   ├── 20251007_002_encryption_functions.sql
│   ├── 20251007_003_rls_policies.sql
│   ├── 20251007_004_verification.sql
│   └── 20251007_999_rollback.sql
├── docs/database/
│   ├── README.md
│   ├── SETUP_GUIDE.md
│   ├── SCHEMA_DIAGRAM.md
│   ├── DEPLOYMENT_SUMMARY.md
│   ├── QUICK_REFERENCE.md
│   └── sample_queries.sql
└── scripts/
    └── run_migrations.sh
```

## Deployment Commands

```bash
# Link project
supabase link --project-ref your-ref

# Run migrations
bash /root/repazoo/scripts/run_migrations.sh

# Or manually
supabase db push

# Verify
supabase db execute --stdin <<< "SELECT * FROM verify_database_schema();"
```

## Troubleshooting

**RLS Error**: Check `auth.uid()` is not NULL
**Encryption Error**: Verify encryption key set
**FK Violation**: Ensure user record exists
**Slow Query**: Check `EXPLAIN ANALYZE`

## Support

See full docs: `/root/repazoo/docs/database/README.md`
