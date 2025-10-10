-- =====================================================
-- Repazoo Database Schema - Rollback Script
-- Version: 1.0.0
-- Created: 2025-10-07
-- Description: Rollback all migrations (USE WITH CAUTION)
-- =====================================================

-- WARNING: This script will DROP ALL TABLES and DATA
-- Only use this in development or for complete database reset
-- In production, create targeted rollback scripts for each migration

-- =====================================================
-- CONFIRM ROLLBACK
-- =====================================================
-- Uncomment the following line to enable rollback
-- DO $$ BEGIN RAISE NOTICE 'ROLLBACK ENABLED - This will delete all data!'; END $$;

-- =====================================================
-- DROP RLS POLICIES
-- =====================================================

-- Users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role has full access to users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

-- Twitter accounts policies
DROP POLICY IF EXISTS "Users can view own Twitter accounts" ON public.twitter_accounts;
DROP POLICY IF EXISTS "Users can insert own Twitter accounts" ON public.twitter_accounts;
DROP POLICY IF EXISTS "Users can update own Twitter accounts" ON public.twitter_accounts;
DROP POLICY IF EXISTS "Users can delete own Twitter accounts" ON public.twitter_accounts;
DROP POLICY IF EXISTS "Service role has full access to twitter_accounts" ON public.twitter_accounts;

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role has full access to subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;

-- Analysis results policies
DROP POLICY IF EXISTS "Users can view own analysis results" ON public.analysis_results;
DROP POLICY IF EXISTS "Users can delete own analysis results" ON public.analysis_results;
DROP POLICY IF EXISTS "Service role has full access to analysis_results" ON public.analysis_results;
DROP POLICY IF EXISTS "Admins can view all analysis results" ON public.analysis_results;

-- API usage policies
DROP POLICY IF EXISTS "Users can view own API usage" ON public.api_usage;
DROP POLICY IF EXISTS "Service role has full access to api_usage" ON public.api_usage;

-- Webhook events policies
DROP POLICY IF EXISTS "Service role has full access to webhook_events" ON public.webhook_events;

-- Audit log policies
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Service role has full access to audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_log;

-- =====================================================
-- DROP FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS public.get_remaining_quota();
DROP FUNCTION IF EXISTS public.check_rate_limit(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_user_tier();
DROP FUNCTION IF EXISTS public.has_active_subscription();
DROP FUNCTION IF EXISTS public.owns_twitter_account(UUID);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.verify_encryption_setup();
DROP FUNCTION IF EXISTS public.log_token_access(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.get_decrypted_twitter_tokens(UUID);
DROP FUNCTION IF EXISTS public.update_twitter_tokens(UUID, TEXT, TEXT, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS public.insert_twitter_account(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TEXT[]);
DROP FUNCTION IF EXISTS public.decrypt_token(BYTEA);
DROP FUNCTION IF EXISTS public.encrypt_token(TEXT);
DROP FUNCTION IF EXISTS public.get_encryption_key();
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- =====================================================
-- DROP TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_twitter_accounts_updated_at ON public.twitter_accounts;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;

-- =====================================================
-- DROP INDEXES
-- =====================================================

-- Audit log indexes
DROP INDEX IF EXISTS public.idx_audit_log_resource;
DROP INDEX IF EXISTS public.idx_audit_log_action;
DROP INDEX IF EXISTS public.idx_audit_log_created_at;
DROP INDEX IF EXISTS public.idx_audit_log_user_id;

-- Webhook events indexes
DROP INDEX IF EXISTS public.idx_webhook_events_event_type;
DROP INDEX IF EXISTS public.idx_webhook_events_created_at;
DROP INDEX IF EXISTS public.idx_webhook_events_processed;
DROP INDEX IF EXISTS public.idx_webhook_events_stripe_event_id;

-- API usage indexes
DROP INDEX IF EXISTS public.idx_api_usage_user_date;
DROP INDEX IF EXISTS public.idx_api_usage_endpoint;
DROP INDEX IF EXISTS public.idx_api_usage_created_at;
DROP INDEX IF EXISTS public.idx_api_usage_user_id;

-- Analysis results indexes
DROP INDEX IF EXISTS public.idx_analysis_results_purpose;
DROP INDEX IF EXISTS public.idx_analysis_results_model_used;
DROP INDEX IF EXISTS public.idx_analysis_results_analysis_type;
DROP INDEX IF EXISTS public.idx_analysis_results_created_at;
DROP INDEX IF EXISTS public.idx_analysis_results_twitter_account_id;
DROP INDEX IF EXISTS public.idx_analysis_results_user_id;

-- Subscriptions indexes
DROP INDEX IF EXISTS public.idx_subscriptions_active;
DROP INDEX IF EXISTS public.idx_subscriptions_tier_status;
DROP INDEX IF EXISTS public.idx_subscriptions_stripe_customer_id;
DROP INDEX IF EXISTS public.idx_subscriptions_user_id;

-- Twitter accounts indexes
DROP INDEX IF EXISTS public.idx_twitter_accounts_last_synced;
DROP INDEX IF EXISTS public.idx_twitter_accounts_is_active;
DROP INDEX IF EXISTS public.idx_twitter_accounts_twitter_user_id;
DROP INDEX IF EXISTS public.idx_twitter_accounts_user_id;

-- Users indexes
DROP INDEX IF EXISTS public.idx_users_created_at;
DROP INDEX IF EXISTS public.idx_users_email;

-- =====================================================
-- DROP TABLES (in reverse dependency order)
-- =====================================================

DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.webhook_events CASCADE;
DROP TABLE IF EXISTS public.api_usage CASCADE;
DROP TABLE IF EXISTS public.analysis_results CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.twitter_accounts CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- =====================================================
-- DROP EXTENSIONS (Optional - comment out if shared)
-- =====================================================
-- Only drop extensions if they're not used by other schemas
-- DROP EXTENSION IF EXISTS pgcrypto;
-- DROP EXTENSION IF EXISTS "uuid-ossp";

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Rollback completed successfully. All tables, functions, and policies have been dropped.';
END $$;
