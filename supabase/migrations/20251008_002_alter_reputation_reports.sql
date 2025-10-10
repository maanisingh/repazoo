-- =====================================================
-- Alter Reputation Reports Table - Add Missing Columns
-- Created: 2025-10-08
-- Description: Add purpose-based columns and denormalized fields
-- =====================================================

-- Add purpose columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'reputation_reports'
                   AND column_name = 'purpose') THEN
        ALTER TABLE public.reputation_reports ADD COLUMN purpose TEXT DEFAULT 'general';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'reputation_reports'
                   AND column_name = 'purpose_category') THEN
        ALTER TABLE public.reputation_reports ADD COLUMN purpose_category TEXT DEFAULT 'general';
    END IF;

    -- Add denormalized analysis fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'reputation_reports'
                   AND column_name = 'overall_score') THEN
        ALTER TABLE public.reputation_reports ADD COLUMN overall_score INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'reputation_reports'
                   AND column_name = 'risk_level') THEN
        ALTER TABLE public.reputation_reports ADD COLUMN risk_level TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'reputation_reports'
                   AND column_name = 'sentiment_positive') THEN
        ALTER TABLE public.reputation_reports ADD COLUMN sentiment_positive NUMERIC(5,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'reputation_reports'
                   AND column_name = 'sentiment_neutral') THEN
        ALTER TABLE public.reputation_reports ADD COLUMN sentiment_neutral NUMERIC(5,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'reputation_reports'
                   AND column_name = 'sentiment_negative') THEN
        ALTER TABLE public.reputation_reports ADD COLUMN sentiment_negative NUMERIC(5,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'reputation_reports'
                   AND column_name = 'toxicity_score') THEN
        ALTER TABLE public.reputation_reports ADD COLUMN toxicity_score INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'reputation_reports'
                   AND column_name = 'hate_speech_detected') THEN
        ALTER TABLE public.reputation_reports ADD COLUMN hate_speech_detected BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_reputation_reports_risk_level ON public.reputation_reports(risk_level);
CREATE INDEX IF NOT EXISTS idx_reputation_reports_purpose ON public.reputation_reports(purpose_category);

-- Add constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reputation_reports_risk_level_check') THEN
        ALTER TABLE public.reputation_reports
        ADD CONSTRAINT reputation_reports_risk_level_check
        CHECK (risk_level IN ('low', 'medium', 'high', 'critical') OR risk_level IS NULL);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reputation_reports_score_range') THEN
        ALTER TABLE public.reputation_reports
        ADD CONSTRAINT reputation_reports_score_range
        CHECK (overall_score >= 0 AND overall_score <= 100 OR overall_score IS NULL);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reputation_reports_toxicity_range') THEN
        ALTER TABLE public.reputation_reports
        ADD CONSTRAINT reputation_reports_toxicity_range
        CHECK (toxicity_score >= 0 AND toxicity_score <= 100 OR toxicity_score IS NULL);
    END IF;
END $$;

-- Migration complete
