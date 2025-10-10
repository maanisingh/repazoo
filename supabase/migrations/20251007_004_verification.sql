-- =====================================================
-- Repazoo Database Schema - Verification Script
-- Version: 1.0.0
-- Created: 2025-10-07
-- Description: Comprehensive schema integrity and security verification
-- =====================================================

-- =====================================================
-- VERIFICATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.verify_database_schema()
RETURNS TABLE (
    category TEXT,
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- =====================================================
    -- 1. TABLE EXISTENCE CHECKS
    -- =====================================================

    -- Check users table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        RETURN QUERY SELECT 'Tables'::TEXT, 'users table exists'::TEXT, 'PASS'::TEXT, 'Table found in schema'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Tables'::TEXT, 'users table exists'::TEXT, 'FAIL'::TEXT, 'Table not found'::TEXT;
    END IF;

    -- Check twitter_accounts table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'twitter_accounts') THEN
        RETURN QUERY SELECT 'Tables'::TEXT, 'twitter_accounts table exists'::TEXT, 'PASS'::TEXT, 'Table found in schema'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Tables'::TEXT, 'twitter_accounts table exists'::TEXT, 'FAIL'::TEXT, 'Table not found'::TEXT;
    END IF;

    -- Check subscriptions table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
        RETURN QUERY SELECT 'Tables'::TEXT, 'subscriptions table exists'::TEXT, 'PASS'::TEXT, 'Table found in schema'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Tables'::TEXT, 'subscriptions table exists'::TEXT, 'FAIL'::TEXT, 'Table not found'::TEXT;
    END IF;

    -- Check analysis_results table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analysis_results') THEN
        RETURN QUERY SELECT 'Tables'::TEXT, 'analysis_results table exists'::TEXT, 'PASS'::TEXT, 'Table found in schema'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Tables'::TEXT, 'analysis_results table exists'::TEXT, 'FAIL'::TEXT, 'Table not found'::TEXT;
    END IF;

    -- Check api_usage table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_usage') THEN
        RETURN QUERY SELECT 'Tables'::TEXT, 'api_usage table exists'::TEXT, 'PASS'::TEXT, 'Table found in schema'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Tables'::TEXT, 'api_usage table exists'::TEXT, 'FAIL'::TEXT, 'Table not found'::TEXT;
    END IF;

    -- Check webhook_events table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webhook_events') THEN
        RETURN QUERY SELECT 'Tables'::TEXT, 'webhook_events table exists'::TEXT, 'PASS'::TEXT, 'Table found in schema'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Tables'::TEXT, 'webhook_events table exists'::TEXT, 'FAIL'::TEXT, 'Table not found'::TEXT;
    END IF;

    -- Check audit_log table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
        RETURN QUERY SELECT 'Tables'::TEXT, 'audit_log table exists'::TEXT, 'PASS'::TEXT, 'Table found in schema'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Tables'::TEXT, 'audit_log table exists'::TEXT, 'FAIL'::TEXT, 'Table not found'::TEXT;
    END IF;

    -- =====================================================
    -- 2. EXTENSION CHECKS
    -- =====================================================

    -- Check uuid-ossp extension
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
        RETURN QUERY SELECT 'Extensions'::TEXT, 'uuid-ossp extension'::TEXT, 'PASS'::TEXT, 'Extension installed'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Extensions'::TEXT, 'uuid-ossp extension'::TEXT, 'FAIL'::TEXT, 'Extension not installed'::TEXT;
    END IF;

    -- Check pgcrypto extension
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
        RETURN QUERY SELECT 'Extensions'::TEXT, 'pgcrypto extension'::TEXT, 'PASS'::TEXT, 'Extension installed'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Extensions'::TEXT, 'pgcrypto extension'::TEXT, 'FAIL'::TEXT, 'Extension not installed'::TEXT;
    END IF;

    -- =====================================================
    -- 3. RLS CHECKS
    -- =====================================================

    -- Check RLS on users table
    IF EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'users' AND rowsecurity = true
    ) THEN
        RETURN QUERY SELECT 'RLS'::TEXT, 'users table RLS enabled'::TEXT, 'PASS'::TEXT, 'Row Level Security enabled'::TEXT;
    ELSE
        RETURN QUERY SELECT 'RLS'::TEXT, 'users table RLS enabled'::TEXT, 'FAIL'::TEXT, 'Row Level Security not enabled'::TEXT;
    END IF;

    -- Check RLS on twitter_accounts table
    IF EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'twitter_accounts' AND rowsecurity = true
    ) THEN
        RETURN QUERY SELECT 'RLS'::TEXT, 'twitter_accounts table RLS enabled'::TEXT, 'PASS'::TEXT, 'Row Level Security enabled'::TEXT;
    ELSE
        RETURN QUERY SELECT 'RLS'::TEXT, 'twitter_accounts table RLS enabled'::TEXT, 'FAIL'::TEXT, 'Row Level Security not enabled'::TEXT;
    END IF;

    -- Check RLS on subscriptions table
    IF EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'subscriptions' AND rowsecurity = true
    ) THEN
        RETURN QUERY SELECT 'RLS'::TEXT, 'subscriptions table RLS enabled'::TEXT, 'PASS'::TEXT, 'Row Level Security enabled'::TEXT;
    ELSE
        RETURN QUERY SELECT 'RLS'::TEXT, 'subscriptions table RLS enabled'::TEXT, 'FAIL'::TEXT, 'Row Level Security not enabled'::TEXT;
    END IF;

    -- =====================================================
    -- 4. INDEX CHECKS
    -- =====================================================

    -- Check for indexes on critical columns
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'idx_users_email'
    ) THEN
        RETURN QUERY SELECT 'Indexes'::TEXT, 'users email index'::TEXT, 'PASS'::TEXT, 'Index exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Indexes'::TEXT, 'users email index'::TEXT, 'FAIL'::TEXT, 'Index missing'::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'idx_twitter_accounts_user_id'
    ) THEN
        RETURN QUERY SELECT 'Indexes'::TEXT, 'twitter_accounts user_id index'::TEXT, 'PASS'::TEXT, 'Index exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Indexes'::TEXT, 'twitter_accounts user_id index'::TEXT, 'FAIL'::TEXT, 'Index missing'::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'idx_subscriptions_user_id'
    ) THEN
        RETURN QUERY SELECT 'Indexes'::TEXT, 'subscriptions user_id index'::TEXT, 'PASS'::TEXT, 'Index exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Indexes'::TEXT, 'subscriptions user_id index'::TEXT, 'FAIL'::TEXT, 'Index missing'::TEXT;
    END IF;

    -- =====================================================
    -- 5. FOREIGN KEY CHECKS
    -- =====================================================

    -- Check foreign keys on twitter_accounts
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
        AND table_name = 'twitter_accounts'
        AND constraint_name LIKE '%user_id%'
    ) THEN
        RETURN QUERY SELECT 'Foreign Keys'::TEXT, 'twitter_accounts -> users'::TEXT, 'PASS'::TEXT, 'Foreign key constraint exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Foreign Keys'::TEXT, 'twitter_accounts -> users'::TEXT, 'FAIL'::TEXT, 'Foreign key constraint missing'::TEXT;
    END IF;

    -- Check foreign keys on subscriptions
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
        AND table_name = 'subscriptions'
        AND constraint_name LIKE '%user_id%'
    ) THEN
        RETURN QUERY SELECT 'Foreign Keys'::TEXT, 'subscriptions -> users'::TEXT, 'PASS'::TEXT, 'Foreign key constraint exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Foreign Keys'::TEXT, 'subscriptions -> users'::TEXT, 'FAIL'::TEXT, 'Foreign key constraint missing'::TEXT;
    END IF;

    -- Check foreign keys on analysis_results
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
        AND table_name = 'analysis_results'
        AND constraint_name LIKE '%user_id%'
    ) THEN
        RETURN QUERY SELECT 'Foreign Keys'::TEXT, 'analysis_results -> users'::TEXT, 'PASS'::TEXT, 'Foreign key constraint exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Foreign Keys'::TEXT, 'analysis_results -> users'::TEXT, 'FAIL'::TEXT, 'Foreign key constraint missing'::TEXT;
    END IF;

    -- =====================================================
    -- 6. FUNCTION CHECKS
    -- =====================================================

    -- Check encryption functions
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'encrypt_token' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        RETURN QUERY SELECT 'Functions'::TEXT, 'encrypt_token function'::TEXT, 'PASS'::TEXT, 'Function exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Functions'::TEXT, 'encrypt_token function'::TEXT, 'FAIL'::TEXT, 'Function not found'::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'decrypt_token' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        RETURN QUERY SELECT 'Functions'::TEXT, 'decrypt_token function'::TEXT, 'PASS'::TEXT, 'Function exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Functions'::TEXT, 'decrypt_token function'::TEXT, 'FAIL'::TEXT, 'Function not found'::TEXT;
    END IF;

    -- Check helper functions
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'get_user_tier' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        RETURN QUERY SELECT 'Functions'::TEXT, 'get_user_tier function'::TEXT, 'PASS'::TEXT, 'Function exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Functions'::TEXT, 'get_user_tier function'::TEXT, 'FAIL'::TEXT, 'Function not found'::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'check_rate_limit' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        RETURN QUERY SELECT 'Functions'::TEXT, 'check_rate_limit function'::TEXT, 'PASS'::TEXT, 'Function exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Functions'::TEXT, 'check_rate_limit function'::TEXT, 'FAIL'::TEXT, 'Function not found'::TEXT;
    END IF;

    -- =====================================================
    -- 7. TRIGGER CHECKS
    -- =====================================================

    -- Check updated_at triggers
    IF EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_users_updated_at'
    ) THEN
        RETURN QUERY SELECT 'Triggers'::TEXT, 'users updated_at trigger'::TEXT, 'PASS'::TEXT, 'Trigger exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Triggers'::TEXT, 'users updated_at trigger'::TEXT, 'FAIL'::TEXT, 'Trigger not found'::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_twitter_accounts_updated_at'
    ) THEN
        RETURN QUERY SELECT 'Triggers'::TEXT, 'twitter_accounts updated_at trigger'::TEXT, 'PASS'::TEXT, 'Trigger exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Triggers'::TEXT, 'twitter_accounts updated_at trigger'::TEXT, 'FAIL'::TEXT, 'Trigger not found'::TEXT;
    END IF;

    -- =====================================================
    -- 8. CONSTRAINT CHECKS
    -- =====================================================

    -- Check subscription tier constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_schema = 'public'
        AND constraint_name = 'subscriptions_tier_check'
    ) THEN
        RETURN QUERY SELECT 'Constraints'::TEXT, 'subscription tier check'::TEXT, 'PASS'::TEXT, 'Check constraint exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Constraints'::TEXT, 'subscription tier check'::TEXT, 'FAIL'::TEXT, 'Check constraint missing'::TEXT;
    END IF;

    -- Check subscription status constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_schema = 'public'
        AND constraint_name = 'subscriptions_status_check'
    ) THEN
        RETURN QUERY SELECT 'Constraints'::TEXT, 'subscription status check'::TEXT, 'PASS'::TEXT, 'Check constraint exists'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Constraints'::TEXT, 'subscription status check'::TEXT, 'FAIL'::TEXT, 'Check constraint missing'::TEXT;
    END IF;

    -- =====================================================
    -- 9. COLUMN ENCRYPTION CHECKS
    -- =====================================================

    -- Check for encrypted token columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'twitter_accounts'
        AND column_name = 'access_token_encrypted'
        AND data_type = 'bytea'
    ) THEN
        RETURN QUERY SELECT 'Encryption'::TEXT, 'access_token encrypted column'::TEXT, 'PASS'::TEXT, 'Column type is BYTEA (encrypted)'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Encryption'::TEXT, 'access_token encrypted column'::TEXT, 'FAIL'::TEXT, 'Column not found or wrong type'::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'twitter_accounts'
        AND column_name = 'refresh_token_encrypted'
        AND data_type = 'bytea'
    ) THEN
        RETURN QUERY SELECT 'Encryption'::TEXT, 'refresh_token encrypted column'::TEXT, 'PASS'::TEXT, 'Column type is BYTEA (encrypted)'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Encryption'::TEXT, 'refresh_token encrypted column'::TEXT, 'FAIL'::TEXT, 'Column not found or wrong type'::TEXT;
    END IF;

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.verify_database_schema() IS 'Comprehensive database schema verification';

-- =====================================================
-- RLS POLICY COUNT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.count_rls_policies()
RETURNS TABLE (
    table_name TEXT,
    policy_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pg_class.relname::TEXT AS table_name,
        COUNT(pol.polname) AS policy_count
    FROM pg_class
    LEFT JOIN pg_policy pol ON pol.polrelid = pg_class.oid
    WHERE pg_class.relnamespace = 'public'::regnamespace
        AND pg_class.relkind = 'r'
        AND pg_class.relname IN ('users', 'twitter_accounts', 'subscriptions', 'analysis_results', 'api_usage', 'webhook_events', 'audit_log')
    GROUP BY pg_class.relname
    ORDER BY pg_class.relname;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.count_rls_policies() IS 'Count RLS policies per table';

-- =====================================================
-- TABLE STATISTICS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_table_statistics()
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    total_size TEXT,
    index_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.tablename::TEXT,
        (SELECT COUNT(*) FROM pg_class WHERE relname = t.tablename)::BIGINT AS row_estimate,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.tablename)::regclass)) AS total_size,
        pg_size_pretty(pg_indexes_size(quote_ident(t.tablename)::regclass)) AS index_size
    FROM pg_tables t
    WHERE t.schemaname = 'public'
        AND t.tablename IN ('users', 'twitter_accounts', 'subscriptions', 'analysis_results', 'api_usage', 'webhook_events', 'audit_log')
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_table_statistics() IS 'Get size statistics for all tables';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.verify_database_schema() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_rls_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_statistics() TO authenticated;

-- =====================================================
-- VERIFICATION MIGRATION COMPLETE
-- =====================================================
