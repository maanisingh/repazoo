-- =====================================================
-- Repazoo Database Schema - OAuth State Table
-- Version: 1.0.0
-- Created: 2025-10-07
-- Description: OAuth state storage for CSRF protection
-- =====================================================

-- =====================================================
-- OAUTH STATES TABLE (Temporary state storage)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.oauth_states (
    state_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    redirect_after_auth TEXT,
    code_verifier TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Constraints
    CONSTRAINT oauth_states_domain_check CHECK (domain IN ('api', 'cfy', 'ntf', 'ai', 'dash'))
);

COMMENT ON TABLE public.oauth_states IS 'Temporary storage for OAuth state parameters (CSRF protection)';
COMMENT ON COLUMN public.oauth_states.state_id IS 'Cryptographically random state identifier';
COMMENT ON COLUMN public.oauth_states.code_verifier IS 'PKCE code verifier (must be kept secret)';
COMMENT ON COLUMN public.oauth_states.expires_at IS 'State expiration (typically 10 minutes)';

-- Index for fast lookups and cleanup
CREATE INDEX idx_oauth_states_state_id ON public.oauth_states(state_id);
CREATE INDEX idx_oauth_states_expires_at ON public.oauth_states(expires_at);
CREATE INDEX idx_oauth_states_user_id ON public.oauth_states(user_id) WHERE user_id IS NOT NULL;

-- =====================================================
-- AUTOMATIC STATE CLEANUP FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.oauth_states
    WHERE expires_at < timezone('utc'::text, now());

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.cleanup_expired_oauth_states() IS 'Deletes expired OAuth states (call periodically via cron)';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- Allow service role to manage OAuth states
GRANT SELECT, INSERT, DELETE ON public.oauth_states TO service_role;

-- Allow authenticated users to insert their own states (via service role functions)
GRANT SELECT, INSERT ON public.oauth_states TO authenticated;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- Users can only access their own states (if authenticated)
CREATE POLICY "Users can insert their own OAuth states"
    ON public.oauth_states
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can view their own OAuth states"
    ON public.oauth_states
    FOR SELECT
    TO authenticated
    USING (user_id IS NULL OR user_id = auth.uid());

-- Service role has full access
CREATE POLICY "Service role has full access to OAuth states"
    ON public.oauth_states
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
