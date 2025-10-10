# Repazoo Database Schema Documentation

## Overview

This document provides comprehensive documentation for the Repazoo platform database schema. The schema is designed for a Twitter social media management SaaS platform with OAuth authentication, Stripe billing, and AI-powered analysis features.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Security Features](#security-features)
4. [Migration Guide](#migration-guide)
5. [RLS Policies](#rls-policies)
6. [Encryption](#encryption)
7. [API Reference](#api-reference)
8. [Performance Optimization](#performance-optimization)
9. [Maintenance](#maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Technology Stack

- **Database**: PostgreSQL 15+ (Supabase)
- **Authentication**: Supabase Auth (extends auth.users)
- **Encryption**: pgcrypto extension (AES-256-CBC)
- **Security**: Row Level Security (RLS) enabled on all tables
- **Extensions**: uuid-ossp, pgcrypto

### Design Principles

1. **Security First**: All sensitive data encrypted at rest, RLS enforced
2. **Data Integrity**: Foreign key constraints, check constraints, NOT NULL where appropriate
3. **Auditability**: Immutable audit logs for compliance
4. **Performance**: Strategic indexing on frequently queried columns
5. **Scalability**: JSONB for flexible data storage, partitioning-ready design

---

## Database Schema

### Entity Relationship Diagram

```
auth.users (Supabase Auth)
    |
    +-- users (extends auth)
         |
         +-- twitter_accounts (1:N) [ENCRYPTED TOKENS]
         |    |
         |    +-- analysis_results (1:N)
         |
         +-- subscriptions (1:1) [Stripe integration]
         |
         +-- api_usage (1:N) [Rate limiting]
         |
         +-- audit_log (1:N) [Security trail]

webhook_events (system table, no FK)
```

### Table Descriptions

#### 1. users

Extends Supabase `auth.users` with application-specific profile data.

**Purpose**: User profile management
**RLS**: Users can view/update their own profile

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, FK to auth.users | User identifier |
| email | TEXT | NOT NULL, UNIQUE | User email address |
| display_name | TEXT | | User display name |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Account creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_users_email` on email
- `idx_users_created_at` on created_at DESC

---

#### 2. twitter_accounts

Stores Twitter OAuth credentials with AES-256 encryption.

**Purpose**: Twitter account connections with encrypted tokens
**RLS**: Users can only access their own Twitter accounts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Account identifier |
| user_id | UUID | NOT NULL, FK to users | Owner user ID |
| twitter_user_id | TEXT | NOT NULL, UNIQUE | Twitter user ID |
| twitter_username | TEXT | NOT NULL | Twitter username |
| access_token_encrypted | BYTEA | NOT NULL | **ENCRYPTED** access token |
| refresh_token_encrypted | BYTEA | NOT NULL | **ENCRYPTED** refresh token |
| token_expires_at | TIMESTAMPTZ | NOT NULL | Token expiration time |
| scopes | TEXT[] | NOT NULL, DEFAULT '{}' | OAuth scopes granted |
| connected_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Connection timestamp |
| last_synced_at | TIMESTAMPTZ | | Last token refresh time |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Account active status |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Update timestamp |

**Indexes**:
- `idx_twitter_accounts_user_id` on user_id
- `idx_twitter_accounts_twitter_user_id` on twitter_user_id
- `idx_twitter_accounts_is_active` partial index WHERE is_active = true
- `idx_twitter_accounts_last_synced` on last_synced_at DESC

**Security**: Use `public.insert_twitter_account()` and `public.update_twitter_tokens()` functions for automatic encryption.

---

#### 3. subscriptions

Tracks Stripe subscription status and tier management.

**Purpose**: Subscription and billing management
**RLS**: Users can view own subscription, only service role can modify

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Subscription identifier |
| user_id | UUID | NOT NULL, UNIQUE, FK to users | Subscriber user ID |
| stripe_customer_id | TEXT | UNIQUE | Stripe customer ID |
| stripe_subscription_id | TEXT | UNIQUE | Stripe subscription ID |
| tier | TEXT | NOT NULL, CHECK | Tier: 'basic', 'pro', 'inactive' |
| status | TEXT | NOT NULL, CHECK | Status: 'active', 'canceled', 'past_due', 'unpaid', 'inactive', 'trialing' |
| current_period_start | TIMESTAMPTZ | | Billing period start |
| current_period_end | TIMESTAMPTZ | | Billing period end |
| cancel_at_period_end | BOOLEAN | NOT NULL, DEFAULT false | Cancel scheduled |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Update timestamp |

**Tier Mapping**:
- `basic` → Claude Sonnet AI (1,000 requests/month)
- `pro` → Claude Opus AI (10,000 requests/month)
- `inactive` → No access

**Indexes**:
- `idx_subscriptions_user_id` on user_id
- `idx_subscriptions_stripe_customer_id` on stripe_customer_id
- `idx_subscriptions_tier_status` on (tier, status)
- `idx_subscriptions_active` partial index WHERE status = 'active'

---

#### 4. analysis_results

Stores LangChain AI analysis outputs.

**Purpose**: AI analysis results storage
**RLS**: Users can view/delete their own results

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Result identifier |
| user_id | UUID | NOT NULL, FK to users | Owner user ID |
| twitter_account_id | UUID | NOT NULL, FK to twitter_accounts | Analyzed account |
| purpose | TEXT | NOT NULL | Analysis purpose/context |
| model_used | TEXT | NOT NULL, CHECK | Model: 'sonnet' or 'opus' |
| analysis_type | TEXT | NOT NULL, CHECK | Type: 'sentiment', 'engagement', 'growth', etc. |
| input_data | JSONB | NOT NULL | Input data analyzed |
| output_data | JSONB | NOT NULL | Analysis results |
| execution_time_ms | INTEGER | NOT NULL, CHECK > 0 | Execution time in ms |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Analysis timestamp |

**Analysis Types**:
- `sentiment`: Sentiment analysis
- `engagement`: Engagement metrics
- `growth`: Growth analysis
- `content_analysis`: Content quality analysis
- `trend_detection`: Trend identification
- `risk_assessment`: Risk evaluation

**Indexes**:
- `idx_analysis_results_user_id` on user_id
- `idx_analysis_results_twitter_account_id` on twitter_account_id
- `idx_analysis_results_created_at` on created_at DESC
- `idx_analysis_results_analysis_type` on analysis_type
- `idx_analysis_results_model_used` on model_used
- `idx_analysis_results_purpose` on purpose

---

#### 5. api_usage

Tracks API usage for rate limiting and quota management.

**Purpose**: API usage tracking and rate limiting
**RLS**: Users can view their own usage, only service role can insert

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Usage record ID |
| user_id | UUID | NOT NULL, FK to users | API consumer user ID |
| endpoint | TEXT | NOT NULL | API endpoint called |
| method | TEXT | NOT NULL, CHECK | HTTP method |
| status_code | INTEGER | NOT NULL, CHECK 100-599 | HTTP status code |
| response_time_ms | INTEGER | NOT NULL | Response time in ms |
| quota_consumed | INTEGER | NOT NULL, DEFAULT 1, CHECK > 0 | Quota units consumed |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Request timestamp |

**Indexes**:
- `idx_api_usage_user_id` on user_id
- `idx_api_usage_created_at` on created_at DESC
- `idx_api_usage_endpoint` on endpoint
- `idx_api_usage_user_date` on (user_id, created_at DESC)

---

#### 6. webhook_events

Logs Stripe webhook events for idempotent processing.

**Purpose**: Webhook event tracking and deduplication
**RLS**: No user access, service role only

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Event record ID |
| event_type | TEXT | NOT NULL | Stripe event type |
| stripe_event_id | TEXT | NOT NULL, UNIQUE | Stripe event ID (deduplication) |
| payload | JSONB | NOT NULL | Full event payload |
| processed | BOOLEAN | NOT NULL, DEFAULT false | Processing status |
| processed_at | TIMESTAMPTZ | | Processing timestamp |
| error | TEXT | | Error message if failed |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Event received timestamp |

**Indexes**:
- `idx_webhook_events_stripe_event_id` on stripe_event_id
- `idx_webhook_events_processed` partial index WHERE processed = false
- `idx_webhook_events_created_at` on created_at DESC
- `idx_webhook_events_event_type` on event_type

---

#### 7. audit_log

Immutable security audit trail for compliance.

**Purpose**: Security and compliance audit logging
**RLS**: Users can view their own logs, only service role can insert

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Log entry ID |
| user_id | UUID | FK to users (SET NULL) | User who performed action |
| action | TEXT | NOT NULL, CHECK | Action type |
| resource_type | TEXT | NOT NULL | Resource type affected |
| resource_id | TEXT | | Resource identifier |
| ip_address | INET | | Client IP address |
| user_agent | TEXT | | Client user agent |
| metadata | JSONB | | Additional context |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Action timestamp |

**Action Types**:
- `CREATE`, `READ`, `UPDATE`, `DELETE`
- `LOGIN`, `LOGOUT`
- `OAUTH_CONNECT`, `OAUTH_DISCONNECT`
- `SUBSCRIPTION_CREATED`, `SUBSCRIPTION_UPDATED`, `SUBSCRIPTION_CANCELED`
- `ANALYSIS_EXECUTED`, `TOKEN_REFRESHED`
- `ADMIN_ACTION`

**Indexes**:
- `idx_audit_log_user_id` on user_id
- `idx_audit_log_created_at` on created_at DESC
- `idx_audit_log_action` on action
- `idx_audit_log_resource` on (resource_type, resource_id)

**Important**: Audit logs are IMMUTABLE. Never delete audit logs; archive them per retention policy.

---

## Security Features

### Row Level Security (RLS)

All tables have RLS enabled with the following access patterns:

#### User Access Pattern
```sql
-- Users can only see their own data
auth.uid() = user_id
```

#### Service Role Pattern
```sql
-- Backend services have full access
role = 'service_role'
```

#### Admin Pattern
```sql
-- Admin users can view all data (read-only)
public.is_admin() = true
```

### RLS Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| users | Own | Own | Own | - |
| twitter_accounts | Own | Own | Own | Own |
| subscriptions | Own | Service | Service | Service |
| analysis_results | Own | Service | - | Own |
| api_usage | Own | Service | - | - |
| webhook_events | Service | Service | Service | Service |
| audit_log | Own | Service | - | - |

### Security Functions

#### `public.is_admin()`
Checks if current user has admin role in JWT metadata.

#### `public.owns_twitter_account(account_id UUID)`
Verifies ownership of a Twitter account.

#### `public.has_active_subscription()`
Checks if user has active subscription.

#### `public.get_user_tier()`
Returns user's subscription tier.

#### `public.check_rate_limit(endpoint TEXT, limit INTEGER, window_minutes INTEGER)`
Validates rate limit compliance.

---

## Encryption

### OAuth Token Encryption

Twitter OAuth tokens are encrypted at rest using AES-256-CBC encryption.

#### Encryption Functions

**`public.encrypt_token(token TEXT)`**
- Encrypts plaintext token using AES-256-CBC
- Returns BYTEA encrypted data
- Uses encryption key from secure vault
- SECURITY DEFINER function

**`public.decrypt_token(encrypted_token BYTEA)`**
- Decrypts encrypted token
- Returns plaintext token
- Only accessible to service_role
- SECURITY DEFINER function

#### Helper Functions

**`public.insert_twitter_account(...)`**
- Automatically encrypts tokens during insertion
- Use this instead of raw INSERT

**`public.update_twitter_tokens(...)`**
- Automatically encrypts tokens during update
- Use this instead of raw UPDATE

**`public.get_decrypted_twitter_tokens(account_id UUID)`**
- Retrieves decrypted tokens
- **Backend services only** (requires service_role)
- Never expose to frontend

#### Encryption Key Management

The encryption key should be stored in a secure vault:

1. **Development**: Set via `app.settings.encryption_key` configuration
2. **Production**: Store in Supabase Vault or AWS Secrets Manager

```sql
-- Set encryption key (development only)
ALTER DATABASE postgres SET app.settings.encryption_key = 'your-32-byte-key-here';

-- Production: Use Supabase Vault
-- The get_encryption_key() function should retrieve from vault
```

#### Verify Encryption Setup

```sql
SELECT * FROM public.verify_encryption_setup();
```

Expected output:
```
test_name                  | status | details
---------------------------+--------+----------------------------------------
Encryption Key Retrieval   | PASS   | Encryption key successfully retrieved
Token Encryption           | PASS   | Token successfully encrypted
Token Decryption           | PASS   | Token successfully decrypted and matches
pgcrypto Extension         | PASS   | pgcrypto extension is installed
```

---

## Migration Guide

### Running Migrations

Migrations are located in `/root/repazoo/supabase/migrations/` and should be run in order:

1. **20251007_001_initial_schema.sql** - Core tables and indexes
2. **20251007_002_encryption_functions.sql** - Encryption setup
3. **20251007_003_rls_policies.sql** - RLS policies
4. **20251007_004_verification.sql** - Verification functions

#### Using Supabase CLI

```bash
# Initialize Supabase project
supabase init

# Link to remote project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Or run specific migration
supabase db execute --file supabase/migrations/20251007_001_initial_schema.sql
```

#### Manual Execution

```bash
# Connect to database
psql postgresql://user:password@host:5432/database

# Run migrations in order
\i /root/repazoo/supabase/migrations/20251007_001_initial_schema.sql
\i /root/repazoo/supabase/migrations/20251007_002_encryption_functions.sql
\i /root/repazoo/supabase/migrations/20251007_003_rls_policies.sql
\i /root/repazoo/supabase/migrations/20251007_004_verification.sql
```

### Verification

After running migrations, verify schema integrity:

```sql
-- Comprehensive verification
SELECT * FROM public.verify_database_schema()
ORDER BY category, check_name;

-- Check RLS policy counts
SELECT * FROM public.count_rls_policies();

-- Verify encryption
SELECT * FROM public.verify_encryption_setup();

-- Get table statistics
SELECT * FROM public.get_table_statistics();
```

### Rollback

To rollback all migrations (CAUTION: Data loss):

```bash
psql -f /root/repazoo/supabase/migrations/20251007_999_rollback.sql
```

**Warning**: This drops all tables and data. Only use in development.

---

## RLS Policies

### Policy Details

#### Users Table

```sql
-- Users can view own profile
POLICY "Users can view own profile"
  FOR SELECT USING (auth.uid() = id)

-- Users can update own profile
POLICY "Users can update own profile"
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id)

-- Admins can view all users
POLICY "Admins can view all users"
  FOR SELECT USING (public.is_admin())
```

#### Twitter Accounts Table

```sql
-- Full CRUD for own accounts
POLICY "Users can view own Twitter accounts"
  FOR SELECT USING (auth.uid() = user_id)

POLICY "Users can insert own Twitter accounts"
  FOR INSERT WITH CHECK (auth.uid() = user_id)

POLICY "Users can update own Twitter accounts"
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)

POLICY "Users can delete own Twitter accounts"
  FOR DELETE USING (auth.uid() = user_id)
```

#### Subscriptions Table

```sql
-- Read-only for users, service role manages
POLICY "Users can view own subscription"
  FOR SELECT USING (auth.uid() = user_id)

-- No INSERT/UPDATE/DELETE for users (Stripe webhook only)
```

#### Analysis Results Table

```sql
-- View and delete own results
POLICY "Users can view own analysis results"
  FOR SELECT USING (auth.uid() = user_id)

POLICY "Users can delete own analysis results"
  FOR DELETE USING (auth.uid() = user_id)

-- No INSERT (backend only)
```

---

## API Reference

### Functions

#### User Management

```sql
-- Check admin status
SELECT public.is_admin();

-- Get user tier
SELECT public.get_user_tier();
-- Returns: 'basic' | 'pro' | 'inactive'

-- Check active subscription
SELECT public.has_active_subscription();
-- Returns: boolean
```

#### Twitter Account Management

```sql
-- Insert Twitter account (auto-encrypts tokens)
SELECT public.insert_twitter_account(
    user_id UUID,
    twitter_user_id TEXT,
    twitter_username TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[]
);

-- Update tokens (auto-encrypts)
SELECT public.update_twitter_tokens(
    account_id UUID,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ
);

-- Get decrypted tokens (service role only)
SELECT * FROM public.get_decrypted_twitter_tokens(account_id UUID);
```

#### Rate Limiting & Quota

```sql
-- Check rate limit
SELECT public.check_rate_limit(
    endpoint TEXT,
    limit INTEGER,
    window_minutes INTEGER DEFAULT 60
);
-- Returns: boolean (true if within limit)

-- Get remaining quota
SELECT * FROM public.get_remaining_quota();
-- Returns: tier, monthly_limit, used_this_month, remaining, reset_date
```

#### Verification

```sql
-- Verify database schema
SELECT * FROM public.verify_database_schema();

-- Verify encryption setup
SELECT * FROM public.verify_encryption_setup();

-- Count RLS policies
SELECT * FROM public.count_rls_policies();

-- Get table statistics
SELECT * FROM public.get_table_statistics();
```

---

## Performance Optimization

### Index Strategy

1. **Foreign Keys**: All foreign keys are indexed
2. **Timestamps**: DESC indexes on created_at for recent-first queries
3. **Partial Indexes**: For filtered queries (e.g., active accounts only)
4. **Composite Indexes**: For common multi-column queries

### Query Optimization

```sql
-- Use indexes effectively
SELECT * FROM analysis_results
WHERE user_id = auth.uid()  -- Uses idx_analysis_results_user_id
ORDER BY created_at DESC     -- Uses idx_analysis_results_created_at
LIMIT 20;

-- Avoid full table scans
SELECT * FROM api_usage
WHERE user_id = auth.uid()
  AND created_at >= date_trunc('month', now())  -- Uses idx_api_usage_user_date
```

### JSONB Performance

```sql
-- Create GIN index on JSONB columns for frequent queries
CREATE INDEX idx_analysis_results_output_gin ON analysis_results USING GIN (output_data);

-- Query JSONB efficiently
SELECT output_data->>'sentiment_score'
FROM analysis_results
WHERE output_data @> '{"sentiment": "positive"}';
```

### Connection Pooling

Use connection pooling (pgBouncer) for production deployments:
- Pool mode: Transaction
- Max connections: 100
- Default pool size: 20

---

## Maintenance

### Data Retention

#### Audit Logs
- **Retention**: 7 years (regulatory compliance)
- **Archive**: After 3 years to separate table
- **Never delete**: Archive only

#### Analysis Results
- **Retention**: 3 years
- **Archive**: After 1 year
- **User deletion**: Users can delete their own results

#### API Usage
- **Retention**: 90 days for detailed logs
- **Aggregation**: Aggregate to daily summaries after 30 days
- **Archive**: Delete after 90 days

### Maintenance Scripts

```sql
-- Archive old analysis results
CREATE TABLE IF NOT EXISTS analysis_results_archive (LIKE analysis_results INCLUDING ALL);

WITH archived AS (
    DELETE FROM analysis_results
    WHERE created_at < now() - INTERVAL '3 years'
    RETURNING *
)
INSERT INTO analysis_results_archive SELECT * FROM archived;

-- Clean up old API usage logs
DELETE FROM api_usage
WHERE created_at < now() - INTERVAL '90 days';

-- Vacuum tables
VACUUM ANALYZE users;
VACUUM ANALYZE twitter_accounts;
VACUUM ANALYZE subscriptions;
VACUUM ANALYZE analysis_results;
VACUUM ANALYZE api_usage;
VACUUM ANALYZE webhook_events;
```

### Monitoring

```sql
-- Monitor table sizes
SELECT * FROM public.get_table_statistics();

-- Monitor slow queries
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Monitor index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

---

## Troubleshooting

### Common Issues

#### RLS Policy Errors

**Error**: "new row violates row-level security policy"
**Solution**: Ensure RLS policies allow the operation or use service_role key

```sql
-- Check which policies apply
SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users';

-- Temporarily disable RLS for debugging (development only)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

#### Encryption Errors

**Error**: "Encryption key not configured"
**Solution**: Set encryption key in configuration or vault

```sql
-- Set encryption key (development)
ALTER DATABASE postgres SET app.settings.encryption_key = 'your-key';

-- Verify encryption setup
SELECT * FROM public.verify_encryption_setup();
```

#### Foreign Key Violations

**Error**: "insert or update on table violates foreign key constraint"
**Solution**: Ensure referenced record exists

```sql
-- Check if user exists
SELECT id FROM users WHERE id = 'user-uuid';

-- Create user if needed
INSERT INTO users (id, email) VALUES (auth.uid(), 'user@example.com');
```

#### Performance Issues

**Slow queries**: Check index usage

```sql
-- Explain query plan
EXPLAIN ANALYZE
SELECT * FROM analysis_results WHERE user_id = auth.uid();

-- Check missing indexes
SELECT * FROM pg_stat_user_tables WHERE schemaname = 'public';
```

### Debug Queries

```sql
-- List all tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- List all indexes
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';

-- List all functions
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace;

-- List all policies
SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public';

-- Check current user
SELECT current_user, auth.uid();

-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

---

## Support and Resources

### Documentation Links

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgcrypto Documentation](https://www.postgresql.org/docs/current/pgcrypto.html)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

### Schema Version

Current schema version: **1.0.0**
Last updated: **2025-10-07**

### Contact

For database issues or questions, contact the database administration team.

---

**Note**: This schema is designed for production use with security and compliance in mind. Always test migrations in a staging environment before applying to production.
