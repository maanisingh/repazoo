# Repazoo Database Setup Guide

## Quick Start

This guide will walk you through setting up the Repazoo database schema on Supabase.

## Prerequisites

- Supabase project created
- Supabase CLI installed (`npm install -g supabase`)
- Database credentials (available in Supabase dashboard)
- PostgreSQL 15+ (managed by Supabase)

---

## Step 1: Initial Setup

### 1.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 1.2 Initialize Supabase in Your Project

```bash
cd /root/repazoo
supabase init
```

### 1.3 Link to Your Supabase Project

```bash
# Get your project ref from Supabase dashboard
supabase link --project-ref your-project-ref-here

# You'll be prompted for your database password
```

---

## Step 2: Configure Encryption Key

### 2.1 Generate Encryption Key

```bash
# Generate a secure 32-byte encryption key
openssl rand -hex 32
```

### 2.2 Store in Supabase Vault (Recommended for Production)

```sql
-- Connect to your database
psql postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

-- Create secret in vault
INSERT INTO vault.secrets (name, secret)
VALUES ('twitter_oauth_encryption_key', 'your-generated-key-here');
```

### 2.3 Alternative: Environment Configuration (Development Only)

```sql
-- Set encryption key in database config (development only)
ALTER DATABASE postgres SET app.settings.encryption_key = 'your-generated-key-here';
```

**Important**: For production, always use Supabase Vault or an external secrets manager.

---

## Step 3: Run Database Migrations

### 3.1 Using Supabase CLI (Recommended)

```bash
# Push all migrations to your database
cd /root/repazoo
supabase db push
```

### 3.2 Manual Migration (Alternative)

```bash
# Run migrations in order
supabase db execute --file supabase/migrations/20251007_001_initial_schema.sql
supabase db execute --file supabase/migrations/20251007_002_encryption_functions.sql
supabase db execute --file supabase/migrations/20251007_003_rls_policies.sql
supabase db execute --file supabase/migrations/20251007_004_verification.sql
```

### 3.3 Direct SQL Execution

```bash
# Connect to database
psql postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

-- Run each migration
\i /root/repazoo/supabase/migrations/20251007_001_initial_schema.sql
\i /root/repazoo/supabase/migrations/20251007_002_encryption_functions.sql
\i /root/repazoo/supabase/migrations/20251007_003_rls_policies.sql
\i /root/repazoo/supabase/migrations/20251007_004_verification.sql
```

---

## Step 4: Verify Installation

### 4.1 Run Verification Script

```sql
-- Connect to your database
psql postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

-- Run comprehensive verification
SELECT * FROM public.verify_database_schema()
ORDER BY category, check_name;
```

Expected output: All checks should show "PASS" status.

### 4.2 Verify Encryption Setup

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

### 4.3 Check RLS Policies

```sql
SELECT * FROM public.count_rls_policies();
```

Expected output:
```
table_name          | policy_count
--------------------+-------------
analysis_results    | 4
api_usage          | 2
audit_log          | 3
subscriptions      | 2
twitter_accounts   | 5
users              | 5
webhook_events     | 1
```

### 4.4 Check Table Statistics

```sql
SELECT * FROM public.get_table_statistics();
```

---

## Step 5: Configure Supabase Settings

### 5.1 Enable Realtime (Optional)

If you need real-time subscriptions:

```sql
-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
```

### 5.2 Configure Auth Settings

In Supabase Dashboard → Authentication → Settings:

1. **Enable Email Auth**: ON
2. **Enable OAuth Providers**: Configure Twitter OAuth
3. **JWT Expiry**: 3600 (1 hour)
4. **Refresh Token Expiry**: 2592000 (30 days)

### 5.3 Set Up Twitter OAuth

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable "Twitter" provider
3. Add your Twitter API credentials:
   - Client ID
   - Client Secret
   - Redirect URL: `https://[project-ref].supabase.co/auth/v1/callback`

---

## Step 6: Configure Service Role

### 6.1 Get Service Role Key

1. Go to Supabase Dashboard → Settings → API
2. Copy "service_role" key (keep this secret!)
3. Store in your backend environment variables:

```bash
# .env file
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_URL=https://[project-ref].supabase.co
```

### 6.2 Backend Connection Example

```javascript
// backend/config/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export default supabase
```

---

## Step 7: Set Up Stripe Webhooks

### 7.1 Configure Webhook Endpoint

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-api.com/webhooks/stripe`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 7.2 Store Webhook Secret

```bash
# .env file
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 7.3 Webhook Handler Example

```javascript
// backend/webhooks/stripe.js
import Stripe from 'stripe'
import supabase from '../config/supabase.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Log webhook event
  await supabase
    .from('webhook_events')
    .insert({
      event_type: event.type,
      stripe_event_id: event.id,
      payload: event.data,
      processed: false
    })

  // Process event
  switch (event.type) {
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object)
      break
    // ... other event handlers
  }

  res.json({ received: true })
}
```

---

## Step 8: Create Admin User

### 8.1 Sign Up Admin User

```javascript
// Create admin user via Supabase Auth
const { data, error } = await supabase.auth.signUp({
  email: 'admin@repazoo.com',
  password: 'secure-password-here'
})
```

### 8.2 Set Admin Role in JWT

```sql
-- Update user metadata to include admin role
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@repazoo.com';
```

### 8.3 Verify Admin Access

```sql
-- Login as admin and run:
SELECT public.is_admin();
-- Should return: true
```

---

## Step 9: Initial Data Seeding (Optional)

### 9.1 Seed Test Users

```sql
-- Create test users (for development only)
INSERT INTO public.users (id, email, display_name)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'test1@example.com', 'Test User 1'),
  ('00000000-0000-0000-0000-000000000002', 'test2@example.com', 'Test User 2');
```

### 9.2 Seed Test Subscriptions

```sql
-- Create test subscriptions
INSERT INTO public.subscriptions (user_id, tier, status)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'basic', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'pro', 'active');
```

---

## Step 10: Monitoring and Maintenance

### 10.1 Set Up Database Monitoring

Enable Supabase monitoring:
1. Go to Supabase Dashboard → Database → Monitoring
2. Enable query performance tracking
3. Set up alerts for slow queries

### 10.2 Schedule Maintenance Jobs

Create cron jobs for maintenance:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup of old API usage logs
SELECT cron.schedule(
  'cleanup-api-usage',
  '0 2 * * *',  -- Run at 2 AM daily
  $$
    DELETE FROM public.api_usage
    WHERE created_at < now() - INTERVAL '90 days';
  $$
);

-- Schedule weekly vacuum
SELECT cron.schedule(
  'vacuum-tables',
  '0 3 * * 0',  -- Run at 3 AM every Sunday
  $$
    VACUUM ANALYZE public.users;
    VACUUM ANALYZE public.twitter_accounts;
    VACUUM ANALYZE public.subscriptions;
    VACUUM ANALYZE public.analysis_results;
    VACUUM ANALYZE public.api_usage;
  $$
);
```

### 10.3 Set Up Backups

Enable automatic backups in Supabase:
1. Go to Supabase Dashboard → Database → Backups
2. Enable daily backups
3. Set retention period (7-30 days recommended)

---

## Troubleshooting

### Issue: Migration Fails

**Error**: "relation already exists"

**Solution**:
```sql
-- Check existing tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- If tables exist, run rollback first
\i /root/repazoo/supabase/migrations/20251007_999_rollback.sql

-- Then re-run migrations
```

### Issue: Encryption Key Not Found

**Error**: "Encryption key not configured"

**Solution**:
```sql
-- Verify encryption key is set
SELECT current_setting('app.settings.encryption_key', true);

-- If NULL, set it
ALTER DATABASE postgres SET app.settings.encryption_key = 'your-key';

-- Reload configuration
SELECT pg_reload_conf();
```

### Issue: RLS Policy Denies Access

**Error**: "new row violates row-level security policy"

**Solution**:
```sql
-- Check if using correct user context
SELECT auth.uid();

-- If NULL, you're not authenticated
-- Use service_role key for backend operations

-- Verify policies exist
SELECT * FROM pg_policies WHERE tablename = 'users';
```

### Issue: Foreign Key Violation

**Error**: "insert or update violates foreign key constraint"

**Solution**:
```sql
-- Ensure user exists in users table
SELECT id FROM public.users WHERE id = auth.uid();

-- If not, create user profile
INSERT INTO public.users (id, email)
VALUES (auth.uid(), 'user@example.com');
```

---

## Production Checklist

Before going to production, verify:

- [ ] All migrations run successfully
- [ ] Encryption key stored in secure vault
- [ ] RLS enabled on all tables
- [ ] Service role key secured (not exposed to frontend)
- [ ] Twitter OAuth configured
- [ ] Stripe webhooks configured
- [ ] Admin user created
- [ ] Backups enabled
- [ ] Monitoring enabled
- [ ] Rate limiting tested
- [ ] SSL/TLS enabled (handled by Supabase)
- [ ] Database verification tests pass

---

## Next Steps

1. **Frontend Integration**: Use Supabase client library in your frontend
2. **Backend Services**: Set up Prefect workflows for Twitter sync
3. **LangChain Integration**: Connect AI analysis engine
4. **Monitoring**: Set up application performance monitoring
5. **Testing**: Write integration tests for database operations

---

## Resources

- [Sample Queries](/root/repazoo/docs/database/sample_queries.sql)
- [Database Schema Documentation](/root/repazoo/docs/database/README.md)
- [Migration Files](/root/repazoo/supabase/migrations/)

---

## Support

For issues or questions:
1. Check verification output: `SELECT * FROM public.verify_database_schema();`
2. Review logs in Supabase Dashboard → Logs
3. Contact database administrator

**Last Updated**: 2025-10-07
**Schema Version**: 1.0.0
