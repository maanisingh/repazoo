-- =====================================================
-- Repazoo Database - Sample Queries and Usage Examples
-- Version: 1.0.0
-- Created: 2025-10-07
-- Description: Common query patterns for Repazoo platform
-- =====================================================

-- =====================================================
-- 1. USER MANAGEMENT QUERIES
-- =====================================================

-- Create new user profile (after Supabase Auth signup)
-- This should be called automatically via trigger or during onboarding
INSERT INTO public.users (id, email, display_name)
VALUES (
    auth.uid(),  -- Current authenticated user ID
    'user@example.com',
    'John Doe'
);

-- Get current user profile
SELECT
    id,
    email,
    display_name,
    created_at,
    updated_at
FROM public.users
WHERE id = auth.uid();

-- Update user profile
UPDATE public.users
SET
    display_name = 'Jane Doe'
WHERE id = auth.uid();

-- =====================================================
-- 2. TWITTER ACCOUNT MANAGEMENT
-- =====================================================

-- Connect new Twitter account (with encryption)
-- Use the helper function for automatic encryption
SELECT public.insert_twitter_account(
    auth.uid(),                          -- user_id
    '1234567890',                        -- twitter_user_id
    'johndoe',                           -- twitter_username
    'oauth_access_token_here',           -- access_token (will be encrypted)
    'oauth_refresh_token_here',          -- refresh_token (will be encrypted)
    now() + INTERVAL '2 hours',          -- token_expires_at
    ARRAY['tweet.read', 'tweet.write', 'users.read']  -- scopes
);

-- Get all Twitter accounts for current user
SELECT
    id,
    twitter_user_id,
    twitter_username,
    token_expires_at,
    scopes,
    connected_at,
    last_synced_at,
    is_active,
    created_at
FROM public.twitter_accounts
WHERE user_id = auth.uid()
ORDER BY connected_at DESC;

-- Get active Twitter accounts only
SELECT
    id,
    twitter_username,
    token_expires_at
FROM public.twitter_accounts
WHERE
    user_id = auth.uid()
    AND is_active = true
    AND token_expires_at > now();

-- Update Twitter OAuth tokens (backend service only)
-- This uses the helper function for automatic encryption
SELECT public.update_twitter_tokens(
    'account-uuid-here'::UUID,           -- account_id
    'new_access_token',                  -- new access_token
    'new_refresh_token',                 -- new refresh_token
    now() + INTERVAL '2 hours'           -- new expiration
);

-- Get decrypted tokens (backend service only - requires service_role)
-- WARNING: Never expose this to frontend
SELECT
    access_token,
    refresh_token,
    token_expires_at
FROM public.get_decrypted_twitter_tokens('account-uuid-here'::UUID);

-- Disconnect Twitter account (soft delete)
UPDATE public.twitter_accounts
SET is_active = false
WHERE id = 'account-uuid-here'::UUID AND user_id = auth.uid();

-- Permanently delete Twitter account
DELETE FROM public.twitter_accounts
WHERE id = 'account-uuid-here'::UUID AND user_id = auth.uid();

-- =====================================================
-- 3. SUBSCRIPTION MANAGEMENT
-- =====================================================

-- Create subscription (via Stripe webhook - service role only)
INSERT INTO public.subscriptions (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    tier,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end
) VALUES (
    'user-uuid-here'::UUID,
    'cus_stripe_customer_id',
    'sub_stripe_subscription_id',
    'basic',
    'active',
    now(),
    now() + INTERVAL '1 month',
    false
);

-- Get current user subscription
SELECT
    id,
    tier,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    created_at
FROM public.subscriptions
WHERE user_id = auth.uid();

-- Check if user has active subscription
SELECT public.has_active_subscription();

-- Get user subscription tier
SELECT public.get_user_tier();

-- Update subscription (via Stripe webhook - service role only)
UPDATE public.subscriptions
SET
    tier = 'pro',
    status = 'active',
    current_period_start = now(),
    current_period_end = now() + INTERVAL '1 month'
WHERE user_id = 'user-uuid-here'::UUID;

-- Cancel subscription at period end (via Stripe webhook)
UPDATE public.subscriptions
SET cancel_at_period_end = true
WHERE user_id = 'user-uuid-here'::UUID;

-- Get all active subscriptions (admin query)
SELECT
    u.email,
    u.display_name,
    s.tier,
    s.status,
    s.current_period_end
FROM public.subscriptions s
JOIN public.users u ON u.id = s.user_id
WHERE s.status = 'active'
ORDER BY s.current_period_end ASC;

-- =====================================================
-- 4. ANALYSIS RESULTS QUERIES
-- =====================================================

-- Store analysis result (backend service only)
INSERT INTO public.analysis_results (
    user_id,
    twitter_account_id,
    purpose,
    model_used,
    analysis_type,
    input_data,
    output_data,
    execution_time_ms
) VALUES (
    auth.uid(),
    'twitter-account-uuid'::UUID,
    'Brand sentiment monitoring for Product X launch',
    'sonnet',  -- or 'opus' for Pro tier
    'sentiment',
    '{"tweets": [...], "timeframe": "24h"}'::jsonb,
    '{"sentiment_score": 0.85, "trends": [...], "recommendations": [...]}'::jsonb,
    1250
);

-- Get recent analysis results for user
SELECT
    id,
    purpose,
    model_used,
    analysis_type,
    created_at,
    execution_time_ms
FROM public.analysis_results
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 20;

-- Get analysis results for specific Twitter account
SELECT
    ar.id,
    ar.purpose,
    ar.analysis_type,
    ar.output_data,
    ar.created_at,
    ta.twitter_username
FROM public.analysis_results ar
JOIN public.twitter_accounts ta ON ta.id = ar.twitter_account_id
WHERE
    ar.user_id = auth.uid()
    AND ar.twitter_account_id = 'twitter-account-uuid'::UUID
ORDER BY ar.created_at DESC;

-- Get analysis results by type
SELECT
    id,
    purpose,
    model_used,
    output_data,
    execution_time_ms,
    created_at
FROM public.analysis_results
WHERE
    user_id = auth.uid()
    AND analysis_type = 'sentiment'
ORDER BY created_at DESC
LIMIT 10;

-- Get analysis performance metrics
SELECT
    analysis_type,
    model_used,
    COUNT(*) AS total_analyses,
    AVG(execution_time_ms) AS avg_execution_time,
    MIN(execution_time_ms) AS min_execution_time,
    MAX(execution_time_ms) AS max_execution_time
FROM public.analysis_results
WHERE user_id = auth.uid()
GROUP BY analysis_type, model_used
ORDER BY total_analyses DESC;

-- Get analysis results with full details
SELECT
    ar.id,
    ar.purpose,
    ar.analysis_type,
    ar.model_used,
    ar.input_data,
    ar.output_data,
    ar.execution_time_ms,
    ar.created_at,
    ta.twitter_username,
    ta.twitter_user_id
FROM public.analysis_results ar
JOIN public.twitter_accounts ta ON ta.id = ar.twitter_account_id
WHERE ar.id = 'analysis-uuid'::UUID AND ar.user_id = auth.uid();

-- Delete old analysis results (cleanup)
DELETE FROM public.analysis_results
WHERE
    user_id = auth.uid()
    AND created_at < now() - INTERVAL '90 days';

-- =====================================================
-- 5. API USAGE TRACKING
-- =====================================================

-- Log API request (backend service only)
INSERT INTO public.api_usage (
    user_id,
    endpoint,
    method,
    status_code,
    response_time_ms,
    quota_consumed
) VALUES (
    auth.uid(),
    '/api/v1/analyze/sentiment',
    'POST',
    200,
    345,
    1
);

-- Get user API usage for current month
SELECT
    endpoint,
    method,
    COUNT(*) AS request_count,
    AVG(response_time_ms) AS avg_response_time,
    SUM(quota_consumed) AS total_quota_used
FROM public.api_usage
WHERE
    user_id = auth.uid()
    AND created_at >= date_trunc('month', now())
GROUP BY endpoint, method
ORDER BY request_count DESC;

-- Get remaining quota for user
SELECT * FROM public.get_remaining_quota();

-- Check rate limit for specific endpoint
SELECT public.check_rate_limit('/api/v1/analyze/sentiment', 100, 60) AS within_limit;

-- Get API usage timeline (hourly)
SELECT
    date_trunc('hour', created_at) AS hour,
    COUNT(*) AS requests,
    AVG(response_time_ms) AS avg_response_time,
    SUM(quota_consumed) AS quota_used
FROM public.api_usage
WHERE
    user_id = auth.uid()
    AND created_at >= now() - INTERVAL '24 hours'
GROUP BY date_trunc('hour', created_at)
ORDER BY hour DESC;

-- Get failed API requests
SELECT
    endpoint,
    method,
    status_code,
    created_at
FROM public.api_usage
WHERE
    user_id = auth.uid()
    AND status_code >= 400
ORDER BY created_at DESC
LIMIT 50;

-- =====================================================
-- 6. WEBHOOK EVENT PROCESSING
-- =====================================================

-- Insert webhook event (backend service only)
INSERT INTO public.webhook_events (
    event_type,
    stripe_event_id,
    payload,
    processed
) VALUES (
    'customer.subscription.updated',
    'evt_stripe_event_id',
    '{"data": {...}, "type": "customer.subscription.updated"}'::jsonb,
    false
);

-- Get unprocessed webhook events
SELECT
    id,
    event_type,
    stripe_event_id,
    payload,
    created_at
FROM public.webhook_events
WHERE processed = false
ORDER BY created_at ASC
LIMIT 100;

-- Mark webhook as processed
UPDATE public.webhook_events
SET
    processed = true,
    processed_at = now()
WHERE id = 'webhook-uuid'::UUID;

-- Mark webhook as failed
UPDATE public.webhook_events
SET
    processed = false,
    error = 'Failed to update subscription: Invalid customer ID'
WHERE id = 'webhook-uuid'::UUID;

-- Get webhook processing history
SELECT
    event_type,
    COUNT(*) AS total_events,
    COUNT(*) FILTER (WHERE processed = true) AS processed_count,
    COUNT(*) FILTER (WHERE processed = false) AS pending_count,
    COUNT(*) FILTER (WHERE error IS NOT NULL) AS error_count
FROM public.webhook_events
GROUP BY event_type
ORDER BY total_events DESC;

-- =====================================================
-- 7. AUDIT LOG QUERIES
-- =====================================================

-- Log audit event (automatically or manually)
INSERT INTO public.audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    ip_address,
    user_agent,
    metadata
) VALUES (
    auth.uid(),
    'OAUTH_CONNECT',
    'twitter_account',
    'twitter-account-uuid',
    '192.168.1.1'::INET,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    '{"twitter_username": "johndoe", "scopes": ["tweet.read", "tweet.write"]}'::jsonb
);

-- Get user audit trail
SELECT
    action,
    resource_type,
    resource_id,
    metadata,
    created_at
FROM public.audit_log
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 50;

-- Get audit logs for specific action
SELECT
    user_id,
    resource_type,
    resource_id,
    ip_address,
    metadata,
    created_at
FROM public.audit_log
WHERE action = 'TOKEN_REFRESHED'
ORDER BY created_at DESC;

-- Get recent login activity
SELECT
    user_id,
    ip_address,
    user_agent,
    created_at
FROM public.audit_log
WHERE action = 'LOGIN'
ORDER BY created_at DESC
LIMIT 100;

-- Get audit summary by action type
SELECT
    action,
    COUNT(*) AS event_count,
    MIN(created_at) AS first_occurrence,
    MAX(created_at) AS last_occurrence
FROM public.audit_log
WHERE user_id = auth.uid()
GROUP BY action
ORDER BY event_count DESC;

-- =====================================================
-- 8. ADMIN QUERIES (Requires admin role)
-- =====================================================

-- Get all users with subscription info
SELECT
    u.id,
    u.email,
    u.display_name,
    u.created_at,
    s.tier,
    s.status,
    s.current_period_end
FROM public.users u
LEFT JOIN public.subscriptions s ON s.user_id = u.id
ORDER BY u.created_at DESC;

-- Get platform usage statistics
SELECT
    COUNT(DISTINCT u.id) AS total_users,
    COUNT(DISTINCT ta.id) AS total_twitter_accounts,
    COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active') AS active_subscriptions,
    COUNT(DISTINCT ar.id) AS total_analyses
FROM public.users u
LEFT JOIN public.twitter_accounts ta ON ta.user_id = u.id
LEFT JOIN public.subscriptions s ON s.user_id = u.id
LEFT JOIN public.analysis_results ar ON ar.user_id = u.id;

-- Get revenue metrics by tier
SELECT
    tier,
    COUNT(*) AS subscription_count,
    COUNT(*) FILTER (WHERE status = 'active') AS active_count,
    COUNT(*) FILTER (WHERE cancel_at_period_end = true) AS churning_count
FROM public.subscriptions
GROUP BY tier
ORDER BY tier;

-- Get top API consumers
SELECT
    u.email,
    u.display_name,
    COUNT(api.id) AS request_count,
    SUM(api.quota_consumed) AS quota_used,
    s.tier
FROM public.users u
JOIN public.api_usage api ON api.user_id = u.id
LEFT JOIN public.subscriptions s ON s.user_id = u.id
WHERE api.created_at >= date_trunc('month', now())
GROUP BY u.id, u.email, u.display_name, s.tier
ORDER BY request_count DESC
LIMIT 20;

-- =====================================================
-- 9. VERIFICATION AND TESTING
-- =====================================================

-- Run comprehensive schema verification
SELECT * FROM public.verify_database_schema()
ORDER BY category, check_name;

-- Test encryption setup
SELECT * FROM public.verify_encryption_setup();

-- Count RLS policies per table
SELECT * FROM public.count_rls_policies();

-- Get table statistics
SELECT * FROM public.get_table_statistics();

-- =====================================================
-- 10. MAINTENANCE QUERIES
-- =====================================================

-- Archive old analysis results (example for data retention)
-- Create archive table first, then move old data
CREATE TABLE IF NOT EXISTS public.analysis_results_archive (LIKE public.analysis_results INCLUDING ALL);

WITH archived AS (
    DELETE FROM public.analysis_results
    WHERE created_at < now() - INTERVAL '3 years'
    RETURNING *
)
INSERT INTO public.analysis_results_archive
SELECT * FROM archived;

-- Clean up old API usage logs
DELETE FROM public.api_usage
WHERE created_at < now() - INTERVAL '90 days';

-- Find expired Twitter tokens that need refresh
SELECT
    id,
    twitter_username,
    token_expires_at,
    last_synced_at
FROM public.twitter_accounts
WHERE
    is_active = true
    AND token_expires_at < now() + INTERVAL '10 minutes'
ORDER BY token_expires_at ASC;

-- =====================================================
-- SAMPLE QUERIES COMPLETE
-- =====================================================
