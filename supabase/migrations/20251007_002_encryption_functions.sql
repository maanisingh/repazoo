-- =====================================================
-- Repazoo Database Schema - Encryption Functions
-- Version: 1.0.0
-- Created: 2025-10-07
-- Description: AES-256 encryption functions for OAuth token storage
-- =====================================================

-- =====================================================
-- ENCRYPTION CONFIGURATION
-- =====================================================
-- NOTE: The encryption key should be stored in a secure vault (e.g., Supabase Vault, AWS Secrets Manager)
-- This placeholder should be replaced with actual key retrieval from vault
-- For production: Use Supabase Vault or external secrets manager

-- Create a secure function to retrieve encryption key from Supabase Vault
-- This is a placeholder - in production, replace with actual vault integration
CREATE OR REPLACE FUNCTION public.get_encryption_key()
RETURNS TEXT AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    -- PRODUCTION: Replace with actual vault retrieval
    -- SELECT decrypted_secret INTO encryption_key FROM vault.decrypted_secrets WHERE name = 'twitter_oauth_encryption_key';

    -- DEVELOPMENT ONLY: This should NEVER be used in production
    -- The actual key should be stored in Supabase Vault or environment secrets
    SELECT current_setting('app.settings.encryption_key', true) INTO encryption_key;

    IF encryption_key IS NULL OR encryption_key = '' THEN
        RAISE EXCEPTION 'Encryption key not configured. Please set app.settings.encryption_key or configure vault.';
    END IF;

    RETURN encryption_key;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to retrieve encryption key: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_encryption_key() IS 'Retrieves AES-256 encryption key from secure vault (SECURITY DEFINER)';

-- =====================================================
-- ENCRYPTION FUNCTIONS (AES-256)
-- =====================================================

-- Encrypt OAuth token using AES-256
CREATE OR REPLACE FUNCTION public.encrypt_token(token TEXT)
RETURNS BYTEA AS $$
DECLARE
    encryption_key TEXT;
    encrypted_data BYTEA;
BEGIN
    IF token IS NULL OR token = '' THEN
        RAISE EXCEPTION 'Token cannot be null or empty';
    END IF;

    -- Get encryption key from vault
    encryption_key := public.get_encryption_key();

    -- Encrypt using AES-256 in CBC mode with PKCS padding
    encrypted_data := pgcrypto.encrypt(
        token::bytea,
        encryption_key::bytea,
        'aes-cbc/pad:pkcs'
    );

    RETURN encrypted_data;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Encryption failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.encrypt_token(TEXT) IS 'Encrypts OAuth tokens using AES-256-CBC (SECURITY DEFINER)';

-- Decrypt OAuth token using AES-256
CREATE OR REPLACE FUNCTION public.decrypt_token(encrypted_token BYTEA)
RETURNS TEXT AS $$
DECLARE
    encryption_key TEXT;
    decrypted_data TEXT;
BEGIN
    IF encrypted_token IS NULL THEN
        RAISE EXCEPTION 'Encrypted token cannot be null';
    END IF;

    -- Get encryption key from vault
    encryption_key := public.get_encryption_key();

    -- Decrypt using AES-256 in CBC mode with PKCS padding
    decrypted_data := convert_from(
        pgcrypto.decrypt(
            encrypted_token,
            encryption_key::bytea,
            'aes-cbc/pad:pkcs'
        ),
        'utf8'
    );

    RETURN decrypted_data;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Decryption failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.decrypt_token(BYTEA) IS 'Decrypts OAuth tokens using AES-256-CBC (SECURITY DEFINER)';

-- =====================================================
-- HELPER FUNCTIONS FOR TWITTER ACCOUNTS
-- =====================================================

-- Insert Twitter account with encrypted tokens
CREATE OR REPLACE FUNCTION public.insert_twitter_account(
    p_user_id UUID,
    p_twitter_user_id TEXT,
    p_twitter_username TEXT,
    p_access_token TEXT,
    p_refresh_token TEXT,
    p_token_expires_at TIMESTAMP WITH TIME ZONE,
    p_scopes TEXT[]
)
RETURNS UUID AS $$
DECLARE
    new_account_id UUID;
BEGIN
    INSERT INTO public.twitter_accounts (
        user_id,
        twitter_user_id,
        twitter_username,
        access_token_encrypted,
        refresh_token_encrypted,
        token_expires_at,
        scopes
    ) VALUES (
        p_user_id,
        p_twitter_user_id,
        p_twitter_username,
        public.encrypt_token(p_access_token),
        public.encrypt_token(p_refresh_token),
        p_token_expires_at,
        p_scopes
    ) RETURNING id INTO new_account_id;

    RETURN new_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.insert_twitter_account IS 'Inserts Twitter account with automatic token encryption';

-- Update Twitter account tokens with encryption
CREATE OR REPLACE FUNCTION public.update_twitter_tokens(
    p_account_id UUID,
    p_access_token TEXT,
    p_refresh_token TEXT,
    p_token_expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
DECLARE
    updated_rows INTEGER;
BEGIN
    UPDATE public.twitter_accounts
    SET
        access_token_encrypted = public.encrypt_token(p_access_token),
        refresh_token_encrypted = public.encrypt_token(p_refresh_token),
        token_expires_at = p_token_expires_at,
        last_synced_at = timezone('utc'::text, now())
    WHERE id = p_account_id;

    GET DIAGNOSTICS updated_rows = ROW_COUNT;

    RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_twitter_tokens IS 'Updates Twitter OAuth tokens with automatic encryption';

-- Get decrypted Twitter account tokens (for backend service use only)
CREATE OR REPLACE FUNCTION public.get_decrypted_twitter_tokens(p_account_id UUID)
RETURNS TABLE (
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        public.decrypt_token(access_token_encrypted) AS access_token,
        public.decrypt_token(refresh_token_encrypted) AS refresh_token,
        twitter_accounts.token_expires_at
    FROM public.twitter_accounts
    WHERE id = p_account_id AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_decrypted_twitter_tokens IS 'Retrieves decrypted OAuth tokens (backend service only)';

-- =====================================================
-- AUDIT LOGGING FOR ENCRYPTION OPERATIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_token_access(
    p_account_id UUID,
    p_operation TEXT,
    p_user_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_log (
        user_id,
        action,
        resource_type,
        resource_id,
        metadata
    ) VALUES (
        COALESCE(p_user_id, auth.uid()),
        p_operation,
        'twitter_account',
        p_account_id::TEXT,
        jsonb_build_object(
            'operation', p_operation,
            'timestamp', timezone('utc'::text, now())
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.log_token_access IS 'Logs token access operations to audit trail';

-- =====================================================
-- ENCRYPTION VERIFICATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.verify_encryption_setup()
RETURNS TABLE (
    test_name TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    test_token TEXT := 'test_oauth_token_12345';
    encrypted_test BYTEA;
    decrypted_test TEXT;
BEGIN
    -- Test 1: Encryption key availability
    BEGIN
        PERFORM public.get_encryption_key();
        RETURN QUERY SELECT
            'Encryption Key Retrieval'::TEXT,
            'PASS'::TEXT,
            'Encryption key successfully retrieved'::TEXT;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT
                'Encryption Key Retrieval'::TEXT,
                'FAIL'::TEXT,
                SQLERRM::TEXT;
            RETURN;
    END;

    -- Test 2: Encryption function
    BEGIN
        encrypted_test := public.encrypt_token(test_token);
        IF encrypted_test IS NOT NULL THEN
            RETURN QUERY SELECT
                'Token Encryption'::TEXT,
                'PASS'::TEXT,
                'Token successfully encrypted'::TEXT;
        ELSE
            RETURN QUERY SELECT
                'Token Encryption'::TEXT,
                'FAIL'::TEXT,
                'Encryption returned NULL'::TEXT;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT
                'Token Encryption'::TEXT,
                'FAIL'::TEXT,
                SQLERRM::TEXT;
            RETURN;
    END;

    -- Test 3: Decryption function
    BEGIN
        decrypted_test := public.decrypt_token(encrypted_test);
        IF decrypted_test = test_token THEN
            RETURN QUERY SELECT
                'Token Decryption'::TEXT,
                'PASS'::TEXT,
                'Token successfully decrypted and matches original'::TEXT;
        ELSE
            RETURN QUERY SELECT
                'Token Decryption'::TEXT,
                'FAIL'::TEXT,
                'Decrypted token does not match original'::TEXT;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT
                'Token Decryption'::TEXT,
                'FAIL'::TEXT,
                SQLERRM::TEXT;
    END;

    -- Test 4: pgcrypto extension
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
        RETURN QUERY SELECT
            'pgcrypto Extension'::TEXT,
            'PASS'::TEXT,
            'pgcrypto extension is installed'::TEXT;
    ELSE
        RETURN QUERY SELECT
            'pgcrypto Extension'::TEXT,
            'FAIL'::TEXT,
            'pgcrypto extension is not installed'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.verify_encryption_setup() IS 'Verifies encryption configuration is working correctly';

-- =====================================================
-- GRANT PERMISSIONS FOR SERVICE ROLE
-- =====================================================
-- These functions are SECURITY DEFINER and should only be callable by backend services
-- Revoke public access
REVOKE ALL ON FUNCTION public.encrypt_token(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrypt_token(BYTEA) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_encryption_key() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_decrypted_twitter_tokens(UUID) FROM PUBLIC;

-- Grant to service_role only (backend services)
GRANT EXECUTE ON FUNCTION public.encrypt_token(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_token(BYTEA) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_encryption_key() TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_twitter_account TO service_role;
GRANT EXECUTE ON FUNCTION public.update_twitter_tokens TO service_role;
GRANT EXECUTE ON FUNCTION public.get_decrypted_twitter_tokens TO service_role;
GRANT EXECUTE ON FUNCTION public.log_token_access TO service_role;

-- Allow authenticated users to call insert/update functions (they use SECURITY DEFINER internally)
GRANT EXECUTE ON FUNCTION public.insert_twitter_account TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_twitter_tokens TO authenticated;

-- =====================================================
-- ENCRYPTION MIGRATION COMPLETE
-- =====================================================
