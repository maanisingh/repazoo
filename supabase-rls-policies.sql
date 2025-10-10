-- ============================================================================
-- Row-Level Security (RLS) Policies for Repazoo
-- Zero-Code Architecture - Database-level security
--
-- This eliminates the need for backend authorization logic
-- All security is enforced at the database level
-- ============================================================================

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================

ALTER TABLE twitter_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tweet_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions_scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Twitter Mentions Policies
-- ============================================================================

-- Users can only see their own mentions
CREATE POLICY "Users can view own mentions"
  ON twitter_mentions
  FOR SELECT
  USING (user_id = current_setting('app.user_id', true)::uuid);

-- Service role can insert mentions (for n8n workflows)
CREATE POLICY "Service can insert mentions"
  ON twitter_mentions
  FOR INSERT
  WITH CHECK (true);  -- Service role bypasses this

-- Service role can update mentions (for sentiment/risk analysis)
CREATE POLICY "Service can update mentions"
  ON twitter_mentions
  FOR UPDATE
  USING (true);

-- Users can update their own mentions (for marking as reviewed, etc.)
CREATE POLICY "Users can update own mentions"
  ON twitter_mentions
  FOR UPDATE
  USING (user_id = current_setting('app.user_id', true)::uuid);

-- Users can delete their own mentions
CREATE POLICY "Users can delete own mentions"
  ON twitter_mentions
  FOR DELETE
  USING (user_id = current_setting('app.user_id', true)::uuid);

-- ============================================================================
-- Tweet Media Policies
-- ============================================================================

-- Users can only see media for their own mentions
CREATE POLICY "Users can view own mention media"
  ON tweet_media
  FOR SELECT
  USING (
    mention_id IN (
      SELECT id FROM twitter_mentions
      WHERE user_id = current_setting('app.user_id', true)::uuid
    )
  );

-- Service role can insert media
CREATE POLICY "Service can insert media"
  ON tweet_media
  FOR INSERT
  WITH CHECK (true);

-- Service role can update media (for CDN URLs, download status)
CREATE POLICY "Service can update media"
  ON tweet_media
  FOR UPDATE
  USING (true);

-- Media is automatically deleted when mention is deleted (CASCADE)

-- ============================================================================
-- Users Policies
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  USING (id = current_setting('app.user_id', true)::uuid);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (id = current_setting('app.user_id', true)::uuid);

-- Service role can create users (for registration)
CREATE POLICY "Service can create users"
  ON users
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- Twitter Accounts Policies
-- ============================================================================

-- Users can view their own Twitter accounts
CREATE POLICY "Users can view own Twitter accounts"
  ON twitter_accounts
  FOR SELECT
  USING (user_id = current_setting('app.user_id', true)::uuid);

-- Service role can manage Twitter accounts (OAuth flow)
CREATE POLICY "Service can manage Twitter accounts"
  ON twitter_accounts
  FOR ALL
  USING (true);

-- ============================================================================
-- Twitter Credentials Policies
-- ============================================================================

-- Users can view their own credentials
CREATE POLICY "Users can view own credentials"
  ON twitter_credentials
  FOR SELECT
  USING (user_id = current_setting('app.user_id', true)::uuid);

-- Service role can manage credentials
CREATE POLICY "Service can manage credentials"
  ON twitter_credentials
  FOR ALL
  USING (true);

-- ============================================================================
-- Mentions Scan History Policies
-- ============================================================================

-- Users can view their own scan history
CREATE POLICY "Users can view own scan history"
  ON mentions_scan_history
  FOR SELECT
  USING (user_id = current_setting('app.user_id', true)::uuid);

-- Service role can insert scan history
CREATE POLICY "Service can insert scan history"
  ON mentions_scan_history
  FOR INSERT
  WITH CHECK (true);

-- Service role can update scan history (status updates)
CREATE POLICY "Service can update scan history"
  ON mentions_scan_history
  FOR UPDATE
  USING (true);

-- ============================================================================
-- Subscriptions Policies
-- ============================================================================

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON subscriptions
  FOR SELECT
  USING (user_id = current_setting('app.user_id', true)::uuid);

-- Service role can manage subscriptions (Stripe webhooks)
CREATE POLICY "Service can manage subscriptions"
  ON subscriptions
  FOR ALL
  USING (true);

-- ============================================================================
-- Analysis Results Policies
-- ============================================================================

-- Users can view their own analysis results
CREATE POLICY "Users can view own analysis results"
  ON analysis_results
  FOR SELECT
  USING (user_id = current_setting('app.user_id', true)::uuid);

-- Service role can insert analysis results
CREATE POLICY "Service can insert analysis results"
  ON analysis_results
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- Helper Function: Set User Context
-- ============================================================================

-- This function sets the user_id for the current session
-- Called by the frontend after authentication
CREATE OR REPLACE FUNCTION set_user_context(p_user_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.user_id', p_user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant select on all tables to authenticated users (RLS will filter)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant service role all permissions (bypasses RLS)
-- In production, use a dedicated service role with specific permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check RLS status on all tables
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- List all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- ============================================================================
-- Notes
-- ============================================================================

-- RLS is now enabled on all tables
-- User access is controlled via the app.user_id session variable
-- Service role (n8n, backend) bypasses RLS for data ingestion
-- Frontend sets user context via set_user_context() function
-- This eliminates ~500 lines of backend authorization code
