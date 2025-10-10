-- Repazoo Database Complete Schema
-- Drop existing tables if they exist (for clean install)
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.api_usage CASCADE;
DROP TABLE IF EXISTS public.analysis_results CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.twitter_accounts CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS auth.users CASCADE;
DROP SCHEMA IF EXISTS auth CASCADE;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Auth users table
CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    encrypted_password TEXT,
    email_confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Public users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Twitter accounts
CREATE TABLE public.twitter_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    twitter_user_id TEXT NOT NULL UNIQUE,
    twitter_username TEXT NOT NULL,
    access_token_encrypted BYTEA NOT NULL,
    refresh_token_encrypted BYTEA,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Subscriptions
CREATE TABLE public.subscriptions (
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
    CONSTRAINT subscriptions_tier_check CHECK (tier IN ('basic', 'pro', 'inactive')),
    CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'inactive', 'trialing'))
);

-- Analysis results
CREATE TABLE public.analysis_results (
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
    CONSTRAINT analysis_results_model_check CHECK (model_used IN ('haiku', 'sonnet', 'opus')),
    CONSTRAINT analysis_results_type_check CHECK (analysis_type IN ('sentiment', 'engagement', 'growth', 'content_analysis', 'trend_detection', 'risk_assessment'))
);

-- API usage tracking
CREATE TABLE public.api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Audit log
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_twitter_accounts_user_id ON public.twitter_accounts(user_id);
CREATE INDEX idx_twitter_accounts_twitter_user_id ON public.twitter_accounts(twitter_user_id);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_analysis_results_user_id ON public.analysis_results(user_id);
CREATE INDEX idx_analysis_results_twitter_account_id ON public.analysis_results(twitter_account_id);
CREATE INDEX idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX idx_api_usage_created_at ON public.api_usage(created_at DESC);
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- Insert test user
INSERT INTO auth.users (email) VALUES ('test@repazoo.com');
INSERT INTO public.users (auth_id, email, display_name)
SELECT id, 'test@repazoo.com', 'Test User' FROM auth.users WHERE email = 'test@repazoo.com';

SELECT 'Database schema created successfully!' AS status;
SELECT 'Tables created: ' || count(*)::text FROM pg_tables WHERE schemaname IN ('public', 'auth');
