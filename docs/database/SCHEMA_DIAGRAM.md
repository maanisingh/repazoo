# Repazoo Database Schema Diagram

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE AUTH LAYER                                │
│                                                                               │
│  ┌─────────────────────┐                                                    │
│  │   auth.users        │  (Managed by Supabase Auth)                       │
│  │─────────────────────│                                                    │
│  │ • id (PK)           │                                                    │
│  │ • email             │                                                    │
│  │ • encrypted_password│                                                    │
│  │ • created_at        │                                                    │
│  └──────────┬──────────┘                                                    │
└─────────────┼────────────────────────────────────────────────────────────────┘
              │
              │ (extends via FK)
              │
┌─────────────▼────────────────────────────────────────────────────────────────┐
│                           APPLICATION LAYER                                  │
│                                                                               │
│  ┌─────────────────────┐                                                    │
│  │   users             │  (User Profiles)                                  │
│  │─────────────────────│                                                    │
│  │ • id (PK, FK)       │───┐                                               │
│  │ • email             │   │                                               │
│  │ • display_name      │   │                                               │
│  │ • created_at        │   │                                               │
│  │ • updated_at        │   │                                               │
│  └─────────────────────┘   │                                               │
│                             │                                               │
│         ┌───────────────────┼───────────────────┬───────────────────┐      │
│         │                   │                   │                   │      │
│         │                   │                   │                   │      │
│  ┌──────▼──────────────┐   │            ┌──────▼──────────┐  ┌─────▼────┐│
│  │ twitter_accounts    │   │            │ subscriptions   │  │api_usage ││
│  │─────────────────────│   │            │─────────────────│  │──────────││
│  │ • id (PK)           │   │            │ • id (PK)       │  │• id (PK) ││
│  │ • user_id (FK) ─────┼───┘            │ • user_id (FK)  │  │• user_id ││
│  │ • twitter_user_id   │                │ • stripe_cust_id│  │• endpoint││
│  │ • twitter_username  │                │ • stripe_sub_id │  │• method  ││
│  │ • access_token 🔒   │ ENCRYPTED      │ • tier          │  │• created ││
│  │ • refresh_token 🔒  │ AES-256-CBC    │   - basic       │  └──────────┘│
│  │ • token_expires_at  │                │   - pro         │              │
│  │ • scopes[]          │                │   - inactive    │              │
│  │ • is_active         │                │ • status        │              │
│  │ • created_at        │                │   - active      │              │
│  │ • updated_at        │                │   - canceled    │              │
│  └──────────┬──────────┘                │   - past_due    │              │
│             │                            │ • period_start  │              │
│             │                            │ • period_end    │              │
│             │                            │ • created_at    │              │
│             │                            │ • updated_at    │              │
│             │                            └─────────────────┘              │
│             │                                                              │
│             │                                  Stripe Integration          │
│             │                                         ↕                    │
│  ┌──────────▼────────────────┐              ┌────────────────────┐       │
│  │  analysis_results         │              │  webhook_events    │       │
│  │───────────────────────────│              │────────────────────│       │
│  │ • id (PK)                 │              │ • id (PK)          │       │
│  │ • user_id (FK) ───────────┼──────┐       │ • event_type       │       │
│  │ • twitter_account_id (FK) │      │       │ • stripe_event_id  │       │
│  │ • purpose                 │      │       │ • payload (JSONB)  │       │
│  │ • model_used              │      │       │ • processed        │       │
│  │   - sonnet (Basic tier)   │      │       │ • processed_at     │       │
│  │   - opus (Pro tier)       │      │       │ • error            │       │
│  │ • analysis_type           │      │       │ • created_at       │       │
│  │   - sentiment             │      │       └────────────────────┘       │
│  │   - engagement            │      │                                    │
│  │   - growth                │      │       (No FK - System table)       │
│  │   - content_analysis      │      │                                    │
│  │   - trend_detection       │      │                                    │
│  │   - risk_assessment       │      │                                    │
│  │ • input_data (JSONB)      │      │                                    │
│  │ • output_data (JSONB)     │      │                                    │
│  │ • execution_time_ms       │      │                                    │
│  │ • created_at              │      │                                    │
│  └───────────────────────────┘      │                                    │
│                                      │                                    │
│                         ┌────────────▼────────────┐                       │
│                         │   audit_log             │                       │
│                         │─────────────────────────│                       │
│                         │ • id (PK)               │ IMMUTABLE             │
│                         │ • user_id (FK)          │ (Never delete)        │
│                         │ • action                │                       │
│                         │   - CREATE/READ/UPDATE  │                       │
│                         │   - DELETE/LOGIN/LOGOUT │                       │
│                         │   - OAUTH_CONNECT       │                       │
│                         │   - TOKEN_REFRESHED     │                       │
│                         │   - SUBSCRIPTION_*      │                       │
│                         │ • resource_type         │                       │
│                         │ • resource_id           │                       │
│                         │ • ip_address (INET)     │                       │
│                         │ • user_agent            │                       │
│                         │ • metadata (JSONB)      │                       │
│                         │ • created_at            │                       │
│                         └─────────────────────────┘                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Table Relationships

### One-to-One Relationships
- `users` ↔ `subscriptions` (One user has one subscription)

### One-to-Many Relationships
- `users` → `twitter_accounts` (One user can have multiple Twitter accounts)
- `users` → `analysis_results` (One user has many analysis results)
- `users` → `api_usage` (One user has many API usage records)
- `users` → `audit_log` (One user has many audit log entries)
- `twitter_accounts` → `analysis_results` (One account has many analyses)

### Independent Tables
- `webhook_events` (No foreign keys - system-level event log)

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                  ROW LEVEL SECURITY                      │
├─────────────────────────────────────────────────────────┤
│  User Access:     auth.uid() = user_id                  │
│  Service Role:    Full access (bypass RLS)              │
│  Admin Role:      Read-only all data (is_admin())       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               ENCRYPTION LAYER                           │
├─────────────────────────────────────────────────────────┤
│  OAuth Tokens:    AES-256-CBC encryption                │
│  Key Storage:     Supabase Vault / Secrets Manager      │
│  Functions:       encrypt_token() / decrypt_token()     │
│  Access:          service_role only                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│            AUDIT & COMPLIANCE                            │
├─────────────────────────────────────────────────────────┤
│  Audit Log:       Immutable (never delete)              │
│  Retention:       7 years (regulatory compliance)       │
│  Tracking:        All sensitive operations              │
│  Metadata:        IP, User-Agent, Timestamps            │
└─────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### User Onboarding Flow
```
1. User signs up
   └─> auth.users created (Supabase Auth)
       └─> users profile created (trigger or manual)
           └─> subscriptions record created (tier: inactive)

2. User connects Twitter
   └─> OAuth flow initiated
       └─> twitter_accounts created (tokens encrypted)
           └─> audit_log entry (action: OAUTH_CONNECT)

3. User subscribes (Stripe)
   └─> Stripe checkout
       └─> Webhook received
           └─> webhook_events logged
               └─> subscriptions updated (tier: basic/pro)
                   └─> audit_log entry (action: SUBSCRIPTION_CREATED)
```

### Analysis Flow
```
1. User requests analysis
   └─> Check subscription tier
       └─> Check API quota (api_usage)
           └─> Execute LangChain analysis
               ├─> Model selection: sonnet (basic) or opus (pro)
               └─> analysis_results created
                   ├─> api_usage logged
                   └─> audit_log entry (action: ANALYSIS_EXECUTED)
```

### Token Refresh Flow
```
1. Backend detects expiring token
   └─> Get encrypted tokens (get_decrypted_twitter_tokens)
       └─> Call Twitter OAuth refresh endpoint
           └─> Update tokens (update_twitter_tokens - auto-encrypts)
               ├─> twitter_accounts.last_synced_at updated
               └─> audit_log entry (action: TOKEN_REFRESHED)
```

## Index Strategy

### Primary Indexes (Automatic)
- All primary keys (UUID)
- All unique constraints (email, stripe_customer_id, etc.)

### Foreign Key Indexes
- `twitter_accounts.user_id`
- `subscriptions.user_id`
- `analysis_results.user_id`
- `analysis_results.twitter_account_id`
- `api_usage.user_id`
- `audit_log.user_id`

### Performance Indexes
- `users.email` - Login lookups
- `users.created_at DESC` - Recent users first
- `twitter_accounts.is_active` (partial) - Active accounts only
- `subscriptions.status` (partial) - Active subscriptions
- `analysis_results.created_at DESC` - Recent analyses
- `api_usage.created_at DESC` - Recent usage
- `audit_log.created_at DESC` - Recent audit entries

### Composite Indexes
- `subscriptions(tier, status)` - Tier-based queries
- `api_usage(user_id, created_at DESC)` - User usage history
- `audit_log(resource_type, resource_id)` - Resource audit trail

## Storage Estimates

### Per User (Annual)
```
users:               ~500 bytes
twitter_accounts:    ~2 KB (1-2 accounts)
subscriptions:       ~1 KB
analysis_results:    ~500 KB (100 analyses @ 5KB each)
api_usage:           ~50 KB (1000 requests @ 50 bytes)
audit_log:           ~100 KB (500 events @ 200 bytes)
────────────────────────────────
Total per user:      ~653 KB/year
```

### 10,000 Users
```
Total data:          ~6.5 GB/year
With indexes:        ~10 GB/year
With overhead:       ~15 GB/year
```

## Performance Characteristics

### Query Performance Targets
- User profile lookup: < 10ms
- Twitter account list: < 20ms
- Analysis results (paginated): < 50ms
- API usage summary: < 100ms
- Subscription status: < 10ms

### Optimization Strategies
1. **Eager Loading**: Use JOINs for related data
2. **Pagination**: Default 50 records, max 100
3. **JSONB Indexing**: GIN indexes for frequent JSONB queries
4. **Partial Indexes**: Filter inactive/deleted records
5. **Connection Pooling**: pgBouncer (transaction mode)

## Backup & Recovery

### Backup Strategy
```
Daily:      Full database backup (Supabase automated)
Hourly:     WAL archiving (point-in-time recovery)
Weekly:     Export to cold storage
Monthly:    Compliance archive (7-year retention)
```

### Recovery Procedures
```
1. Point-in-time recovery: < 5 minutes
2. Full restore: < 30 minutes
3. Table-level restore: < 10 minutes
```

## Migration Version History

| Version | Date       | Description                    |
|---------|------------|--------------------------------|
| 1.0.0   | 2025-10-07 | Initial schema with all tables |
|         |            | - Core tables                  |
|         |            | - Encryption functions         |
|         |            | - RLS policies                 |
|         |            | - Verification functions       |

## Future Enhancements

### Potential Additions
1. **Partitioning**: Partition large tables by date (analysis_results, api_usage)
2. **Materialized Views**: For dashboard analytics
3. **Full-Text Search**: PostgreSQL FTS for content search
4. **Geo-Replication**: Multi-region deployment
5. **Read Replicas**: For analytics workloads

### Schema Evolution
- All changes through versioned migrations
- Backward compatibility maintained
- Zero-downtime deployments
- Rollback scripts for all migrations

---

**Schema Version**: 1.0.0
**Last Updated**: 2025-10-07
**Status**: Production Ready
