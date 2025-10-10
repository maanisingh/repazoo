-- =====================================================
-- Repazoo Database Schema - Row Level Security (RLS) Policies
-- Version: 1.0.0
-- Created: 2025-10-07
-- Description: Comprehensive RLS policies for data isolation and security
-- =====================================================

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twitter_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE RLS POLICIES
-- =====================================================

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to users"
    ON public.users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Users can insert their own profile (during registration)
CREATE POLICY "Users can insert own profile"
    ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- =====================================================
-- TWITTER ACCOUNTS TABLE RLS POLICIES
-- =====================================================

-- Policy: Users can view their own Twitter accounts
CREATE POLICY "Users can view own Twitter accounts"
    ON public.twitter_accounts
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own Twitter accounts
CREATE POLICY "Users can insert own Twitter accounts"
    ON public.twitter_accounts
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own Twitter accounts
CREATE POLICY "Users can update own Twitter accounts"
    ON public.twitter_accounts
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own Twitter accounts
CREATE POLICY "Users can delete own Twitter accounts"
    ON public.twitter_accounts
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Service role has full access to Twitter accounts
CREATE POLICY "Service role has full access to twitter_accounts"
    ON public.twitter_accounts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- SUBSCRIPTIONS TABLE RLS POLICIES
-- =====================================================

-- Policy: Users can view their own subscription
CREATE POLICY "Users can view own subscription"
    ON public.subscriptions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Users cannot directly insert subscriptions (Stripe webhook only)
-- Subscriptions are created via service role through Stripe webhooks

-- Policy: Users cannot directly update subscriptions (Stripe webhook only)
-- Subscriptions are updated via service role through Stripe webhooks

-- Policy: Users cannot delete subscriptions
-- Subscriptions are managed via service role

-- Policy: Service role has full access to subscriptions
CREATE POLICY "Service role has full access to subscriptions"
    ON public.subscriptions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- ANALYSIS RESULTS TABLE RLS POLICIES
-- =====================================================

-- Policy: Users can view their own analysis results
CREATE POLICY "Users can view own analysis results"
    ON public.analysis_results
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Users cannot directly insert analysis results (backend only)
-- Analysis results are created by backend services

-- Policy: Users cannot update analysis results (immutable)
-- Analysis results are immutable once created

-- Policy: Users can delete their own analysis results
CREATE POLICY "Users can delete own analysis results"
    ON public.analysis_results
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Service role has full access to analysis results
CREATE POLICY "Service role has full access to analysis_results"
    ON public.analysis_results
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- API USAGE TABLE RLS POLICIES
-- =====================================================

-- Policy: Users can view their own API usage
CREATE POLICY "Users can view own API usage"
    ON public.api_usage
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Users cannot insert API usage records (backend only)
-- API usage is tracked by backend services

-- Policy: Users cannot update API usage records (immutable)

-- Policy: Users cannot delete API usage records (immutable)

-- Policy: Service role has full access to API usage
CREATE POLICY "Service role has full access to api_usage"
    ON public.api_usage
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- WEBHOOK EVENTS TABLE RLS POLICIES
-- =====================================================

-- Policy: No user access to webhook events (backend only)
-- Webhook events are internal system records

-- Policy: Service role has full access to webhook events
CREATE POLICY "Service role has full access to webhook_events"
    ON public.webhook_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- AUDIT LOG TABLE RLS POLICIES
-- =====================================================

-- Policy: Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
    ON public.audit_log
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Users cannot insert audit logs (backend only)
-- Audit logs are created by system triggers and backend services

-- Policy: Users cannot update audit logs (immutable)

-- Policy: Users cannot delete audit logs (immutable for compliance)

-- Policy: Service role has full access to audit logs
CREATE POLICY "Service role has full access to audit_log"
    ON public.audit_log
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- ADMIN ROLE POLICIES (Optional - for admin dashboard)
-- =====================================================
-- Note: Admin role should be created separately in Supabase dashboard
-- These policies assume an 'admin' role exists

-- Check if user has admin role (stored in auth.users metadata)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT COALESCE(
            (auth.jwt() -> 'app_metadata' -> 'role')::TEXT = 'admin',
            false
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_admin() IS 'Check if current user has admin role in JWT metadata';

-- Admin policies for users table
CREATE POLICY "Admins can view all users"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can update all users"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Admin policies for subscriptions table
CREATE POLICY "Admins can view all subscriptions"
    ON public.subscriptions
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Admin policies for analysis results table
CREATE POLICY "Admins can view all analysis results"
    ON public.analysis_results
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Admin policies for audit log table
CREATE POLICY "Admins can view all audit logs"
    ON public.audit_log
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- =====================================================
-- SECURITY FUNCTIONS FOR RLS
-- =====================================================

-- Check if user owns a Twitter account
CREATE OR REPLACE FUNCTION public.owns_twitter_account(account_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.twitter_accounts
        WHERE id = account_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.owns_twitter_account IS 'Check if current user owns specified Twitter account';

-- Check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.subscriptions
        WHERE user_id = auth.uid() AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.has_active_subscription IS 'Check if current user has active subscription';

-- Get user subscription tier
CREATE OR REPLACE FUNCTION public.get_user_tier()
RETURNS TEXT AS $$
DECLARE
    user_tier TEXT;
BEGIN
    SELECT tier INTO user_tier
    FROM public.subscriptions
    WHERE user_id = auth.uid() AND status = 'active';

    RETURN COALESCE(user_tier, 'inactive');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_tier IS 'Get current user subscription tier';

-- =====================================================
-- RATE LIMITING FUNCTION
-- =====================================================

-- Check if user has exceeded rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_endpoint TEXT,
    p_limit INTEGER,
    p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
    request_count INTEGER;
    window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    window_start := timezone('utc'::text, now()) - (p_window_minutes || ' minutes')::INTERVAL;

    SELECT COUNT(*)
    INTO request_count
    FROM public.api_usage
    WHERE
        user_id = auth.uid() AND
        endpoint = p_endpoint AND
        created_at >= window_start;

    RETURN request_count < p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_rate_limit IS 'Check if user is within rate limit for endpoint';

-- =====================================================
-- QUOTA MANAGEMENT FUNCTION
-- =====================================================

-- Get remaining quota for user
CREATE OR REPLACE FUNCTION public.get_remaining_quota()
RETURNS TABLE (
    tier TEXT,
    monthly_limit INTEGER,
    used_this_month INTEGER,
    remaining INTEGER,
    reset_date TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    user_tier TEXT;
    month_start TIMESTAMP WITH TIME ZONE;
    usage_count INTEGER;
    tier_limit INTEGER;
BEGIN
    -- Get user tier
    user_tier := public.get_user_tier();

    -- Set limits based on tier
    tier_limit := CASE user_tier
        WHEN 'basic' THEN 1000
        WHEN 'pro' THEN 10000
        ELSE 0
    END;

    -- Calculate current month start
    month_start := date_trunc('month', timezone('utc'::text, now()));

    -- Get usage for current month
    SELECT COALESCE(SUM(quota_consumed), 0)
    INTO usage_count
    FROM public.api_usage
    WHERE
        user_id = auth.uid() AND
        created_at >= month_start;

    RETURN QUERY
    SELECT
        user_tier,
        tier_limit,
        usage_count,
        GREATEST(tier_limit - usage_count, 0),
        (month_start + INTERVAL '1 month')::TIMESTAMP WITH TIME ZONE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_remaining_quota IS 'Get remaining API quota for current user';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_twitter_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tier() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_remaining_quota() TO authenticated;

-- =====================================================
-- RLS POLICIES MIGRATION COMPLETE
-- =====================================================
