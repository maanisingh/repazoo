-- =====================================================
-- Repazoo Database Schema - Initial Migration
-- Version: 1.0.0
-- Created: 2025-10-07
-- Description: Core database schema for Twitter social media management SaaS
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS TABLE (extends Supabase auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth.users';
COMMENT ON COLUMN public.users.id IS 'References auth.users.id';
COMMENT ON COLUMN public.users.email IS 'User email address (synchronized with auth.users)';
COMMENT ON COLUMN public.users.display_name IS 'User display name for UI';

-- =====================================================
-- TWITTER ACCOUNTS TABLE (OAuth with encryption)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.twitter_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    twitter_user_id TEXT NOT NULL UNIQUE,
    twitter_username TEXT NOT NULL,
    -- ENCRYPTED FIELDS (use pgcrypto for encryption)
    access_token_encrypted BYTEA NOT NULL,
    refresh_token_encrypted BYTEA NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.twitter_accounts IS 'Twitter OAuth credentials with encrypted token storage';
COMMENT ON COLUMN public.twitter_accounts.access_token_encrypted IS 'AES-256 encrypted access token';
COMMENT ON COLUMN public.twitter_accounts.refresh_token_encrypted IS 'AES-256 encrypted refresh token';
COMMENT ON COLUMN public.twitter_accounts.scopes IS 'OAuth scopes granted by user';

-- =====================================================
-- SUBSCRIPTIONS TABLE (Stripe integration)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    tier TEXT NOT NULL DEFAULT 'inactive',
    status TEXT NOT NULL DEFAULT 'inactive',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Check constraints for enums
    CONSTRAINT subscriptions_tier_check CHECK (tier IN ('basic', 'pro', 'inactive')),
    CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'inactive', 'trialing'))
);

COMMENT ON TABLE public.subscriptions IS 'Stripe subscription tracking with tier management';
COMMENT ON COLUMN public.subscriptions.tier IS 'Subscription tier: basic (Sonnet AI), pro (Opus AI), inactive';
COMMENT ON COLUMN public.subscriptions.status IS 'Stripe subscription status';

-- =====================================================
-- ANALYSIS RESULTS TABLE (LangChain outputs)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    twitter_account_id UUID NOT NULL REFERENCES public.twitter_accounts(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL,
    model_used TEXT NOT NULL,
    analysis_type TEXT NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Check constraints
    CONSTRAINT analysis_results_model_check CHECK (model_used IN ('sonnet', 'opus')),
    CONSTRAINT analysis_results_type_check CHECK (analysis_type IN ('sentiment', 'engagement', 'growth', 'content_analysis', 'trend_detection', 'risk_assessment')),
    CONSTRAINT analysis_results_execution_time_positive CHECK (execution_time_ms > 0)
);

COMMENT ON TABLE public.analysis_results IS 'LangChain AI analysis results storage';
COMMENT ON COLUMN public.analysis_results.purpose IS 'LangChain personalization field for analysis purpose';
COMMENT ON COLUMN public.analysis_results.model_used IS 'AI model: sonnet (Basic tier) or opus (Pro tier)';
COMMENT ON COLUMN public.analysis_results.execution_time_ms IS 'Analysis execution time in milliseconds';

-- =====================================================
-- API USAGE TABLE (Rate limiting & quota tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    quota_consumed INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Check constraints
    CONSTRAINT api_usage_method_check CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
    CONSTRAINT api_usage_status_code_valid CHECK (status_code >= 100 AND status_code < 600),
    CONSTRAINT api_usage_quota_positive CHECK (quota_consumed > 0)
);

COMMENT ON TABLE public.api_usage IS 'API usage tracking for rate limiting and quota management';
COMMENT ON COLUMN public.api_usage.quota_consumed IS 'Number of quota units consumed by request';

-- =====================================================
-- WEBHOOK EVENTS TABLE (Stripe webhooks)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    stripe_event_id TEXT NOT NULL UNIQUE,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Check constraint
    CONSTRAINT webhook_events_processed_at_check CHECK (
        (processed = true AND processed_at IS NOT NULL) OR
        (processed = false AND processed_at IS NULL)
    )
);

COMMENT ON TABLE public.webhook_events IS 'Stripe webhook event log for idempotent processing';
COMMENT ON COLUMN public.webhook_events.stripe_event_id IS 'Unique Stripe event ID for deduplication';
COMMENT ON COLUMN public.webhook_events.processed IS 'Whether webhook has been successfully processed';

-- =====================================================
-- AUDIT LOG TABLE (Security audit trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Check constraint
    CONSTRAINT audit_log_action_check CHECK (action IN (
        'CREATE', 'READ', 'UPDATE', 'DELETE',
        'LOGIN', 'LOGOUT', 'OAUTH_CONNECT', 'OAUTH_DISCONNECT',
        'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_UPDATED', 'SUBSCRIPTION_CANCELED',
        'ANALYSIS_EXECUTED', 'TOKEN_REFRESHED', 'ADMIN_ACTION'
    ))
);

COMMENT ON TABLE public.audit_log IS 'Immutable security audit trail for compliance';
COMMENT ON COLUMN public.audit_log.action IS 'Action performed (never delete audit logs)';
COMMENT ON COLUMN public.audit_log.metadata IS 'Additional context about the action';

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_created_at ON public.users(created_at DESC);

-- Twitter accounts indexes
CREATE INDEX idx_twitter_accounts_user_id ON public.twitter_accounts(user_id);
CREATE INDEX idx_twitter_accounts_twitter_user_id ON public.twitter_accounts(twitter_user_id);
CREATE INDEX idx_twitter_accounts_is_active ON public.twitter_accounts(is_active) WHERE is_active = true;
CREATE INDEX idx_twitter_accounts_last_synced ON public.twitter_accounts(last_synced_at DESC);

-- Subscriptions indexes
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_tier_status ON public.subscriptions(tier, status);
CREATE INDEX idx_subscriptions_active ON public.subscriptions(status) WHERE status = 'active';

-- Analysis results indexes
CREATE INDEX idx_analysis_results_user_id ON public.analysis_results(user_id);
CREATE INDEX idx_analysis_results_twitter_account_id ON public.analysis_results(twitter_account_id);
CREATE INDEX idx_analysis_results_created_at ON public.analysis_results(created_at DESC);
CREATE INDEX idx_analysis_results_analysis_type ON public.analysis_results(analysis_type);
CREATE INDEX idx_analysis_results_model_used ON public.analysis_results(model_used);
CREATE INDEX idx_analysis_results_purpose ON public.analysis_results(purpose);

-- API usage indexes
CREATE INDEX idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX idx_api_usage_created_at ON public.api_usage(created_at DESC);
CREATE INDEX idx_api_usage_endpoint ON public.api_usage(endpoint);
CREATE INDEX idx_api_usage_user_date ON public.api_usage(user_id, created_at DESC);

-- Webhook events indexes
CREATE INDEX idx_webhook_events_stripe_event_id ON public.webhook_events(stripe_event_id);
CREATE INDEX idx_webhook_events_processed ON public.webhook_events(processed) WHERE processed = false;
CREATE INDEX idx_webhook_events_created_at ON public.webhook_events(created_at DESC);
CREATE INDEX idx_webhook_events_event_type ON public.webhook_events(event_type);

-- Audit log indexes
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON public.audit_log(action);
CREATE INDEX idx_audit_log_resource ON public.audit_log(resource_type, resource_id);

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_twitter_accounts_updated_at BEFORE UPDATE ON public.twitter_accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
