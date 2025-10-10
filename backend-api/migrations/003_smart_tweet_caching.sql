-- Migration: Smart Tweet Caching & Incremental Analysis
-- Purpose: Track analyzed tweets and enable incremental fetching

-- 1. Create tweet_analyses junction table
-- Links tweets to analysis results (many-to-many)
CREATE TABLE IF NOT EXISTS tweet_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id UUID NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  analysis_result_id UUID NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tweet_id, analysis_result_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tweet_analyses_tweet ON tweet_analyses(tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweet_analyses_result ON tweet_analyses(analysis_result_id);
CREATE INDEX IF NOT EXISTS idx_tweet_analyses_purpose ON tweet_analyses(purpose);

-- 2. Add tracking columns to twitter_accounts
ALTER TABLE twitter_accounts
  ADD COLUMN IF NOT EXISTS newest_tweet_id TEXT,
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS total_tweets_cached INTEGER DEFAULT 0;

-- Create index on last_sync_at for cache expiration queries
CREATE INDEX IF NOT EXISTS idx_twitter_accounts_last_sync ON twitter_accounts(last_sync_at);

-- 3. Add cache_info column to analysis_results for metadata
ALTER TABLE analysis_results
  ADD COLUMN IF NOT EXISTS cache_info JSONB DEFAULT '{}'::jsonb;

-- Create index on cache_info for queries
CREATE INDEX IF NOT EXISTS idx_analysis_results_cache_info ON analysis_results USING gin(cache_info);

-- 4. Add comments for documentation
COMMENT ON TABLE tweet_analyses IS 'Junction table tracking which tweets were analyzed in which scans';
COMMENT ON COLUMN twitter_accounts.newest_tweet_id IS 'Twitter ID of the most recent tweet (for incremental fetching with since_id)';
COMMENT ON COLUMN twitter_accounts.last_sync_at IS 'Timestamp of last successful tweet fetch from Twitter API';
COMMENT ON COLUMN twitter_accounts.total_tweets_cached IS 'Total count of tweets cached for this account';
COMMENT ON COLUMN analysis_results.cache_info IS 'Metadata about cache usage: new_tweets_analyzed, used_cached_tweets, etc.';
