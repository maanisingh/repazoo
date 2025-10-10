-- ============================================================================
-- REPAZOO TWITTER MENTIONS MEDIA ENHANCEMENT MIGRATION
-- ============================================================================
-- Version: 1.0
-- Date: 2025-10-09
-- Purpose: Add dedicated media storage for Twitter mentions with images/videos
-- ============================================================================

BEGIN;

-- ============================================================================
-- Table: tweet_media
-- Purpose: Store individual media attachments from Twitter posts
-- ============================================================================
CREATE TABLE IF NOT EXISTS tweet_media (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mention_id UUID NOT NULL REFERENCES twitter_mentions(id) ON DELETE CASCADE,

    -- Media identifiers
    media_key VARCHAR(255) NOT NULL,

    -- Media type and metadata
    media_type VARCHAR(50) NOT NULL CHECK (media_type IN ('photo', 'video', 'animated_gif')),
    media_url TEXT NOT NULL,
    preview_image_url TEXT,

    -- Dimensions
    width INTEGER,
    height INTEGER,

    -- Accessibility
    alt_text TEXT,

    -- Display order (for multiple images)
    display_order INTEGER DEFAULT 0,

    -- Duration (for videos)
    duration_ms INTEGER,

    -- File information
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),

    -- Processing status
    download_status VARCHAR(50) DEFAULT 'pending',
    local_path TEXT,
    cdn_url TEXT,

    -- Audit timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT download_status_valid CHECK (download_status IN ('pending', 'downloaded', 'failed', 'cdn_uploaded'))
);

-- ============================================================================
-- INDEXES FOR tweet_media
-- ============================================================================

-- Fast lookup by mention_id (most common query)
CREATE INDEX IF NOT EXISTS idx_tweet_media_mention_id
ON tweet_media(mention_id);

-- Fast lookup by media_key (for deduplication)
CREATE INDEX IF NOT EXISTS idx_tweet_media_key
ON tweet_media(media_key);

-- Find all photos for a mention
CREATE INDEX IF NOT EXISTS idx_tweet_media_type
ON tweet_media(mention_id, media_type);

-- Find pending downloads
CREATE INDEX IF NOT EXISTS idx_tweet_media_download_pending
ON tweet_media(download_status, created_at)
WHERE download_status = 'pending';

-- ============================================================================
-- UPDATE existing twitter_mentions table
-- ============================================================================

-- Add has_media flag for quick filtering
ALTER TABLE twitter_mentions
ADD COLUMN IF NOT EXISTS has_media BOOLEAN DEFAULT false;

-- Add media count for quick stats
ALTER TABLE twitter_mentions
ADD COLUMN IF NOT EXISTS media_count INTEGER DEFAULT 0;

-- Create index for mentions with media
CREATE INDEX IF NOT EXISTS idx_mentions_has_media
ON twitter_mentions(user_id, has_media, tweet_created_at DESC)
WHERE has_media = true;

-- ============================================================================
-- TRIGGER: Update has_media and media_count on tweet_media changes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_mention_media_flags()
RETURNS TRIGGER AS $$
DECLARE
    v_media_count INTEGER;
BEGIN
    -- Count media for this mention
    SELECT COUNT(*) INTO v_media_count
    FROM tweet_media
    WHERE mention_id = COALESCE(NEW.mention_id, OLD.mention_id);

    -- Update mention flags
    UPDATE twitter_mentions
    SET
        has_media = (v_media_count > 0),
        media_count = v_media_count,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.mention_id, OLD.mention_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply trigger on INSERT, UPDATE, DELETE
CREATE TRIGGER update_mention_media_flags_insert
    AFTER INSERT ON tweet_media
    FOR EACH ROW
    EXECUTE FUNCTION update_mention_media_flags();

CREATE TRIGGER update_mention_media_flags_delete
    AFTER DELETE ON tweet_media
    FOR EACH ROW
    EXECUTE FUNCTION update_mention_media_flags();

-- ============================================================================
-- TRIGGER: Auto-update updated_at on tweet_media
-- ============================================================================

CREATE TRIGGER update_tweet_media_updated_at
    BEFORE UPDATE ON tweet_media
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: get_mention_with_media
-- Purpose: Retrieve mention with all media attachments
-- ============================================================================

CREATE OR REPLACE FUNCTION get_mention_with_media(p_mention_id UUID)
RETURNS TABLE (
    mention_id UUID,
    tweet_id VARCHAR,
    tweet_text TEXT,
    author_username VARCHAR,
    author_display_name VARCHAR,
    media JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tm.id as mention_id,
        tm.tweet_id,
        tm.tweet_text,
        tm.author_username,
        tm.author_display_name,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', media.id,
                    'type', media.media_type,
                    'url', media.media_url,
                    'preview_url', media.preview_image_url,
                    'width', media.width,
                    'height', media.height,
                    'alt_text', media.alt_text,
                    'display_order', media.display_order
                ) ORDER BY media.display_order
            ) FILTER (WHERE media.id IS NOT NULL),
            '[]'::jsonb
        ) as media
    FROM twitter_mentions tm
    LEFT JOIN tweet_media media ON media.mention_id = tm.id
    WHERE tm.id = p_mention_id
    GROUP BY tm.id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- FUNCTION: get_user_mentions_with_media
-- Purpose: Retrieve paginated mentions with media for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_mentions_with_media(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_sentiment VARCHAR DEFAULT NULL,
    p_risk_level VARCHAR DEFAULT NULL,
    p_has_media BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    tweet_id VARCHAR,
    tweet_text TEXT,
    author_username VARCHAR,
    author_display_name VARCHAR,
    author_verified BOOLEAN,
    author_profile_image_url TEXT,
    sentiment VARCHAR,
    sentiment_score DECIMAL,
    risk_level VARCHAR,
    risk_score DECIMAL,
    retweet_count INTEGER,
    reply_count INTEGER,
    like_count INTEGER,
    quote_count INTEGER,
    view_count INTEGER,
    engagement_score DECIMAL,
    tweet_created_at TIMESTAMP WITH TIME ZONE,
    tweet_url TEXT,
    media JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tm.id,
        tm.tweet_id,
        tm.tweet_text,
        tm.author_username,
        tm.author_display_name,
        tm.author_verified,
        tm.author_profile_image_url,
        tm.sentiment,
        tm.sentiment_score,
        tm.risk_level,
        tm.risk_score,
        tm.retweet_count,
        tm.reply_count,
        tm.like_count,
        tm.quote_count,
        tm.view_count,
        tm.engagement_score,
        tm.tweet_created_at,
        tm.tweet_url,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', media.id,
                        'type', media.media_type,
                        'url', media.media_url,
                        'preview_url', media.preview_image_url,
                        'width', media.width,
                        'height', media.height,
                        'alt_text', media.alt_text,
                        'display_order', media.display_order
                    ) ORDER BY media.display_order
                )
                FROM tweet_media media
                WHERE media.mention_id = tm.id
            ),
            '[]'::jsonb
        ) as media,
        tm.created_at
    FROM twitter_mentions tm
    WHERE tm.user_id = p_user_id
        AND (p_sentiment IS NULL OR tm.sentiment = p_sentiment)
        AND (p_risk_level IS NULL OR tm.risk_level = p_risk_level)
        AND (p_has_media IS NULL OR tm.has_media = p_has_media)
    ORDER BY tm.tweet_created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON tweet_media TO postgres;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE tweet_media IS 'Stores individual media attachments (photos, videos, GIFs) from Twitter mentions with metadata';
COMMENT ON COLUMN tweet_media.media_key IS 'Twitter media key from API for deduplication';
COMMENT ON COLUMN tweet_media.display_order IS 'Order of display when tweet has multiple images (0-3 typically)';
COMMENT ON COLUMN tweet_media.cdn_url IS 'Optional CDN URL if media is uploaded to MinIO or similar';

COMMENT ON FUNCTION get_mention_with_media IS 'Retrieve a single mention with all media attachments as JSONB array';
COMMENT ON FUNCTION get_user_mentions_with_media IS 'Retrieve paginated mentions with media, filterable by sentiment/risk/media presence';

-- Commit transaction
COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE - Tweet Media Enhancement
-- ============================================================================
