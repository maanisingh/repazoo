import { query } from '../config/database.js';

interface CachedTweet {
  id: string;
  twitter_account_id: string;
  tweet_id: string;
  tweet_text: string;
  created_at: Date;
  public_metrics: any;
  entities: any;
  fetched_at: Date;
  has_media?: boolean;
  media_count?: number;
  media_data?: any;
  image_analysis?: any;
}

export class TweetCacheService {
  /**
   * Get cached tweets for a Twitter account
   */
  async getCachedTweets(twitter_account_id: string): Promise<any[]> {
    const result = await query<CachedTweet>(
      `SELECT
        id,
        tweet_id,
        tweet_text as text,
        created_at,
        public_metrics,
        entities,
        has_media,
        media_count,
        media_data,
        image_analysis,
        fetched_at
       FROM tweets
       WHERE twitter_account_id = $1
       ORDER BY created_at DESC`,
      [twitter_account_id]
    );

    return result.rows;
  }

  /**
   * Cache tweets in database (UPSERT to avoid duplicates)
   * Also updates twitter_accounts with newest_tweet_id and sync timestamp
   */
  async cacheTweets(
    twitter_account_id: string,
    tweets: any[],
    newest_id?: string | null
  ): Promise<number> {
    if (tweets.length === 0) {
      return 0;
    }

    let cached_count = 0;

    for (const tweet of tweets) {
      await query(
        `INSERT INTO tweets (
          twitter_account_id,
          tweet_id,
          tweet_text,
          created_at,
          public_metrics,
          entities,
          has_media,
          media_count,
          media_data,
          fetched_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (twitter_account_id, tweet_id)
        DO UPDATE SET
          tweet_text = $3,
          public_metrics = $5,
          entities = $6,
          has_media = $7,
          media_count = $8,
          media_data = $9,
          fetched_at = NOW()`,
        [
          twitter_account_id,
          tweet.id,
          tweet.text,
          tweet.created_at,
          JSON.stringify(tweet.public_metrics || {}),
          JSON.stringify(tweet.entities || {}),
          tweet.has_media || false,
          tweet.media_count || 0,
          tweet.media ? JSON.stringify(tweet.media) : null,
        ]
      );
      cached_count++;
    }

    // Update twitter_accounts with newest_tweet_id and sync info
    const updateNewestId = newest_id || tweets[0]?.id || null;
    await query(
      `UPDATE twitter_accounts
       SET newest_tweet_id = $1,
           last_sync_at = NOW(),
           total_tweets_cached = (SELECT COUNT(*) FROM tweets WHERE twitter_account_id = $2)
       WHERE id = $2`,
      [updateNewestId, twitter_account_id]
    );

    return cached_count;
  }

  /**
   * Check if cache needs refresh (older than 24 hours or empty)
   */
  async needsRefresh(twitter_account_id: string): Promise<boolean> {
    const result = await query<{ last_fetch: Date | null; count: number }>(
      `SELECT
        MAX(fetched_at) as last_fetch,
        COUNT(*) as count
       FROM tweets
       WHERE twitter_account_id = $1`,
      [twitter_account_id]
    );

    if (result.rows.length === 0 || result.rows[0].count === 0) {
      return true; // No tweets cached
    }

    const lastFetch = result.rows[0].last_fetch;
    if (!lastFetch) {
      return true;
    }

    // Check if older than 24 hours
    const hoursSinceLastFetch = (Date.now() - new Date(lastFetch).getTime()) / (1000 * 60 * 60);
    return hoursSinceLastFetch > 24;
  }

  /**
   * Get last fetch time for a Twitter account
   */
  async getLastFetchTime(twitter_account_id: string): Promise<Date | null> {
    const result = await query<{ last_fetch: Date }>(
      `SELECT MAX(fetched_at) as last_fetch
       FROM tweets
       WHERE twitter_account_id = $1`,
      [twitter_account_id]
    );

    return result.rows[0]?.last_fetch || null;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(twitter_account_id: string): Promise<{
    tweet_count: number;
    last_fetch: Date | null;
    needs_refresh: boolean;
  }> {
    const result = await query<{ count: number; last_fetch: Date | null }>(
      `SELECT
        COUNT(*) as count,
        MAX(fetched_at) as last_fetch
       FROM tweets
       WHERE twitter_account_id = $1`,
      [twitter_account_id]
    );

    const row = result.rows[0];
    const needsRefresh = await this.needsRefresh(twitter_account_id);

    return {
      tweet_count: parseInt(row.count.toString()),
      last_fetch: row.last_fetch,
      needs_refresh: needsRefresh,
    };
  }
}

export const tweetCacheService = new TweetCacheService();
