-- =====================================================
-- Reputation Reports Table for Twitter Scan Results
-- Created: 2025-10-08
-- Description: Stores reputation analysis results from n8n workflows
-- =====================================================

CREATE TABLE IF NOT EXISTS public.reputation_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    twitter_handle TEXT NOT NULL,
    purpose TEXT DEFAULT 'general',
    purpose_category TEXT DEFAULT 'general',

    -- Analysis result as JSONB for flexibility
    analysis_result JSONB NOT NULL,

    -- Quick access fields (denormalized from analysis_result for performance)
    overall_score INTEGER,
    risk_level TEXT,
    sentiment_positive NUMERIC(5,2),
    sentiment_neutral NUMERIC(5,2),
    sentiment_negative NUMERIC(5,2),
    toxicity_score INTEGER,
    hate_speech_detected BOOLEAN DEFAULT false,

    -- Status tracking
    status TEXT DEFAULT 'completed',
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Constraints
    CONSTRAINT reputation_reports_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT reputation_reports_risk_level_check CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT reputation_reports_score_range CHECK (overall_score >= 0 AND overall_score <= 100),
    CONSTRAINT reputation_reports_toxicity_range CHECK (toxicity_score >= 0 AND toxicity_score <= 100)
);

COMMENT ON TABLE public.reputation_reports IS 'Twitter reputation scan results from Opus Orchestration';
COMMENT ON COLUMN public.reputation_reports.scan_id IS 'Unique scan identifier from frontend';
COMMENT ON COLUMN public.reputation_reports.purpose IS 'Scan purpose: visa, student, employment, general, custom';
COMMENT ON COLUMN public.reputation_reports.analysis_result IS 'Full JSON analysis result from AI orchestration';
COMMENT ON COLUMN public.reputation_reports.overall_score IS 'Overall reputation score 0-100 (higher is better)';

-- Indexes for performance
CREATE INDEX idx_reputation_reports_scan_id ON public.reputation_reports(scan_id);
CREATE INDEX idx_reputation_reports_user_id ON public.reputation_reports(user_id);
CREATE INDEX idx_reputation_reports_twitter_handle ON public.reputation_reports(twitter_handle);
CREATE INDEX idx_reputation_reports_created_at ON public.reputation_reports(created_at DESC);
CREATE INDEX idx_reputation_reports_risk_level ON public.reputation_reports(risk_level);
CREATE INDEX idx_reputation_reports_purpose ON public.reputation_reports(purpose_category);

-- Updated_at trigger
CREATE TRIGGER update_reputation_reports_updated_at BEFORE UPDATE ON public.reputation_reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration complete
