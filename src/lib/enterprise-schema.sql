-- Enterprise Multi-Tenant RepAZoo Schema
-- Comprehensive database design for reputation management SaaS
-- Supports all Temporal workflows and multi-tenancy

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================
-- TENANTS & ORGANIZATIONS
-- ============================================

-- Tenants table for multi-tenancy
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    plan VARCHAR(50) DEFAULT 'BASIC',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Organizations within tenants
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    website VARCHAR(255),
    logo_url VARCHAR(255),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

-- Enhanced users table with multi-tenancy
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(255),
    role VARCHAR(50) DEFAULT 'USER', -- USER, ADMIN, SUPER_ADMIN
    plan VARCHAR(20) DEFAULT 'BASIC', -- BASIC, PRO, ENTERPRISE
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    last_login_at TIMESTAMP,
    preferences JSONB DEFAULT '{}',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- User sessions for security
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- API keys for enterprise integrations
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash TEXT NOT NULL,
    permissions JSONB DEFAULT '{}',
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- MONITORING & SOURCES
-- ============================================

-- Monitoring profiles for individuals/entities
CREATE TABLE IF NOT EXISTS monitoring_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- Person/entity being monitored
    description TEXT,
    keywords JSONB NOT NULL, -- Array of keywords to monitor
    excluded_keywords JSONB DEFAULT '[]',
    monitoring_sources JSONB DEFAULT '[]', -- Which sources to monitor
    alert_thresholds JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Monitoring sources configuration
CREATE TABLE IF NOT EXISTS monitoring_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES monitoring_profiles(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL, -- TWITTER, LINKEDIN, NEWS, REDDIT, etc.
    source_name VARCHAR(255) NOT NULL,
    source_url VARCHAR(500),
    search_query TEXT NOT NULL,
    config JSONB DEFAULT '{}', -- Source-specific configuration
    last_scan_at TIMESTAMP,
    next_scan_at TIMESTAMP,
    scan_frequency INTEGER DEFAULT 3600, -- seconds
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- MENTIONS & CONTENT
-- ============================================

-- Enhanced mentions table
CREATE TABLE IF NOT EXISTS mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES monitoring_profiles(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES monitoring_sources(id) ON DELETE CASCADE,

    -- Content details
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    url TEXT NOT NULL,
    author VARCHAR(255),
    author_url VARCHAR(500),
    author_followers INTEGER,

    -- Engagement metrics
    likes_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,

    -- Sentiment analysis
    sentiment VARCHAR(20) DEFAULT 'NEUTRAL', -- POSITIVE, NEGATIVE, NEUTRAL
    sentiment_score DECIMAL(4,3) DEFAULT 0.0, -- -1.0 to 1.0
    emotion VARCHAR(50), -- joy, anger, fear, sadness, etc.
    confidence_score DECIMAL(4,3) DEFAULT 0.0,

    -- Classification
    category VARCHAR(100), -- news, review, social, forum, etc.
    priority VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    is_actionable BOOLEAN DEFAULT FALSE,

    -- Temporal data
    published_at TIMESTAMP NOT NULL,
    scraped_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,

    -- Reputation impact
    reputation_impact DECIMAL(4,3) DEFAULT 0.0,
    reach_estimate INTEGER DEFAULT 0,

    -- Status tracking
    status VARCHAR(50) DEFAULT 'NEW', -- NEW, REVIEWED, RESPONDED, RESOLVED
    assigned_to UUID REFERENCES users(id),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Mention attachments (images, videos, documents)
CREATE TABLE IF NOT EXISTS mention_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mention_id UUID NOT NULL REFERENCES mentions(id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TEMPORAL WORKFLOW TRACKING
-- ============================================

-- Workflow executions tracking
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workflow_id VARCHAR(255) NOT NULL,
    workflow_type VARCHAR(100) NOT NULL,
    run_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- RUNNING, COMPLETED, FAILED, TERMINATED
    input_data JSONB,
    output_data JSONB,
    error_details TEXT,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow state for persistence
CREATE TABLE IF NOT EXISTS workflow_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workflow_type VARCHAR(100) NOT NULL,
    state_key VARCHAR(255) NOT NULL,
    state_value JSONB NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, workflow_type, state_key)
);

-- ============================================
-- NOTIFICATIONS & ALERTS
-- ============================================

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL, -- email, webhook, sms
    triggers JSONB NOT NULL, -- When to send notifications
    frequency VARCHAR(50) DEFAULT 'IMMEDIATE', -- IMMEDIATE, DAILY, WEEKLY, MONTHLY
    is_enabled BOOLEAN DEFAULT TRUE,
    config JSONB DEFAULT '{}', -- Channel-specific config
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sent notifications log
CREATE TABLE IF NOT EXISTS notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    channel VARCHAR(50) NOT NULL, -- email, webhook, sms, in-app
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, SENT, FAILED, DELIVERED
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- REPUTATION SCORING & ANALYTICS
-- ============================================

-- Reputation scores over time
CREATE TABLE IF NOT EXISTS reputation_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES monitoring_profiles(id) ON DELETE CASCADE,
    overall_score DECIMAL(5,2) NOT NULL, -- 0-100 scale
    sentiment_score DECIMAL(4,3) NOT NULL, -- -1.0 to 1.0
    volume_score DECIMAL(5,2) NOT NULL, -- Based on mention volume
    reach_score DECIMAL(5,2) NOT NULL, -- Based on audience reach
    trend_score DECIMAL(4,3) NOT NULL, -- Trending direction
    calculated_at TIMESTAMP DEFAULT NOW(),
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics aggregations
CREATE TABLE IF NOT EXISTS analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES monitoring_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    mentions_count INTEGER DEFAULT 0,
    positive_mentions INTEGER DEFAULT 0,
    negative_mentions INTEGER DEFAULT 0,
    neutral_mentions INTEGER DEFAULT 0,
    avg_sentiment DECIMAL(4,3) DEFAULT 0.0,
    total_reach INTEGER DEFAULT 0,
    total_engagement INTEGER DEFAULT 0,
    reputation_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, profile_id, date)
);

-- ============================================
-- CRISIS MANAGEMENT
-- ============================================

-- Crisis events tracking
CREATE TABLE IF NOT EXISTS crisis_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES monitoring_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, MONITORING, RESOLVED
    trigger_conditions JSONB NOT NULL,
    response_plan JSONB,
    assigned_team JSONB,
    started_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Crisis response actions
CREATE TABLE IF NOT EXISTS crisis_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crisis_id UUID NOT NULL REFERENCES crisis_events(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL, -- RESPONSE, ESCALATION, MONITORING
    description TEXT NOT NULL,
    assigned_to UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INTEGRATIONS & WEBHOOKS
-- ============================================

-- Webhook configurations
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    events JSONB NOT NULL, -- Array of events to trigger on
    secret VARCHAR(255), -- For signature verification
    headers JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Webhook delivery log
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    delivered_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- AUDIT & COMPLIANCE
-- ============================================

-- Audit log for compliance
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- Mentions indexes
CREATE INDEX IF NOT EXISTS idx_mentions_user_profile ON mentions(user_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_mentions_sentiment ON mentions(sentiment);
CREATE INDEX IF NOT EXISTS idx_mentions_published_at ON mentions(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentions_status ON mentions(status);
CREATE INDEX IF NOT EXISTS idx_mentions_priority ON mentions(priority);
CREATE INDEX IF NOT EXISTS idx_mentions_text_search ON mentions USING gin(to_tsvector('english', title || ' ' || content));

-- Monitoring sources indexes
CREATE INDEX IF NOT EXISTS idx_monitoring_sources_user ON monitoring_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_sources_active ON monitoring_sources(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_monitoring_sources_next_scan ON monitoring_sources(next_scan_at) WHERE is_active = true;

-- Workflow tracking indexes
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_type ON workflow_executions(workflow_type);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_daily_user_date ON analytics_daily(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_reputation_scores_user_calculated ON reputation_scores(user_id, calculated_at DESC);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_log_user ON notifications_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_created ON notifications_log(created_at DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monitoring_profiles_updated_at BEFORE UPDATE ON monitoring_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monitoring_sources_updated_at BEFORE UPDATE ON monitoring_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mentions_updated_at BEFORE UPDATE ON mentions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate reputation score
CREATE OR REPLACE FUNCTION calculate_reputation_score(
    p_user_id UUID,
    p_profile_id UUID,
    p_period_start TIMESTAMP,
    p_period_end TIMESTAMP
) RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_sentiment_avg DECIMAL(4,3);
    v_mention_count INTEGER;
    v_positive_count INTEGER;
    v_negative_count INTEGER;
    v_total_reach INTEGER;
    v_reputation_score DECIMAL(5,2);
BEGIN
    -- Get metrics for the period
    SELECT
        AVG(sentiment_score),
        COUNT(*),
        COUNT(*) FILTER (WHERE sentiment = 'POSITIVE'),
        COUNT(*) FILTER (WHERE sentiment = 'NEGATIVE'),
        SUM(reach_estimate)
    INTO v_sentiment_avg, v_mention_count, v_positive_count, v_negative_count, v_total_reach
    FROM mentions
    WHERE user_id = p_user_id
    AND profile_id = p_profile_id
    AND published_at BETWEEN p_period_start AND p_period_end;

    -- Calculate weighted reputation score (0-100)
    v_reputation_score := GREATEST(0, LEAST(100,
        50 + (COALESCE(v_sentiment_avg, 0) * 30) +
        (CASE WHEN v_mention_count > 0 THEN (v_positive_count::DECIMAL / v_mention_count * 20) ELSE 0 END) -
        (CASE WHEN v_mention_count > 0 THEN (v_negative_count::DECIMAL / v_mention_count * 20) ELSE 0 END)
    ));

    RETURN v_reputation_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA SETUP
-- ============================================

-- Insert default tenant for migration
INSERT INTO tenants (id, name, domain, plan)
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Tenant', 'repazoo.com', 'ENTERPRISE')
ON CONFLICT (id) DO NOTHING;

-- Migrate existing users to new schema
INSERT INTO users (
    id, tenant_id, email, password_hash, first_name, last_name,
    plan, is_admin, is_active, email_verified, created_at, updated_at
)
SELECT
    id,
    '00000000-0000-0000-0000-000000000000'::UUID as tenant_id,
    email,
    password as password_hash,
    first_name,
    last_name,
    plan,
    is_admin,
    is_active,
    email_verified,
    created_at,
    updated_at
FROM simple_users
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Create default monitoring profiles for existing users
INSERT INTO monitoring_profiles (user_id, name, keywords, monitoring_sources)
SELECT
    u.id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) as name,
    '["' || COALESCE(u.first_name || ' ' || u.last_name, u.email) || '"]'::jsonb as keywords,
    '["NEWS", "SOCIAL_MEDIA", "FORUM"]'::jsonb as monitoring_sources
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM monitoring_profiles mp WHERE mp.user_id = u.id);

COMMIT;