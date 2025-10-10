import { query } from '../config/database.js';

interface CachedTweet {
  id: string;
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

interface PreviousAnalysis {
  analysis_result_id: string;
  output_data: any;
  analyzed_count: number;
  created_at: Date;
}

export class AnalysisReuseService {
  /**
   * Get tweets that haven't been analyzed for a specific purpose
   */
  async getUnanalyzedTweets(twitter_account_id: string, purpose: string): Promise<CachedTweet[]> {
    const result = await query<CachedTweet>(
      `SELECT t.* FROM tweets t
       WHERE t.twitter_account_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM tweet_analyses ta
         JOIN analysis_results ar ON ta.analysis_result_id = ar.id
         WHERE ta.tweet_id = t.id
         AND ar.purpose = $2
         AND ar.output_data->>'status' = 'completed'
       )
       ORDER BY t.created_at DESC`,
      [twitter_account_id, purpose]
    );

    return result.rows;
  }

  /**
   * Get most recent analysis results for this account + purpose
   * Returns null if no previous analysis exists
   */
  async getPreviousAnalysis(twitter_account_id: string, purpose: string): Promise<PreviousAnalysis | null> {
    const result = await query<PreviousAnalysis>(
      `SELECT
        ar.id as analysis_result_id,
        ar.output_data,
        COUNT(ta.tweet_id) as analyzed_count,
        ar.created_at
       FROM analysis_results ar
       LEFT JOIN tweet_analyses ta ON ta.analysis_result_id = ar.id
       WHERE ar.twitter_account_id = $1
       AND ar.purpose = $2
       AND ar.output_data->>'status' = 'completed'
       GROUP BY ar.id, ar.output_data, ar.created_at
       ORDER BY ar.created_at DESC
       LIMIT 1`,
      [twitter_account_id, purpose]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Link analyzed tweets to an analysis result
   */
  async linkAnalyzedTweets(
    analysis_result_id: string,
    tweet_ids: string[],
    purpose: string
  ): Promise<void> {
    if (tweet_ids.length === 0) return;

    // Batch insert all tweet analyses
    const values = tweet_ids
      .map((tweet_id, idx) => `($${idx * 3 + 1}, $${idx * 3 + 2}, $${idx * 3 + 3})`)
      .join(', ');

    const params = tweet_ids.flatMap((tweet_id) => [tweet_id, analysis_result_id, purpose]);

    await query(
      `INSERT INTO tweet_analyses (tweet_id, analysis_result_id, purpose)
       VALUES ${values}
       ON CONFLICT (tweet_id, analysis_result_id) DO NOTHING`,
      params
    );
  }

  /**
   * Get cache statistics for a Twitter account
   */
  async getCacheStats(twitter_account_id: string): Promise<{
    tweet_count: number;
    last_sync: Date | null;
    newest_tweet_id: string | null;
    needs_refresh: boolean;
  }> {
    // Get cache stats from twitter_accounts
    const accountResult = await query<{
      total_tweets_cached: number;
      last_sync_at: Date | null;
      newest_tweet_id: string | null;
    }>(
      `SELECT total_tweets_cached, last_sync_at, newest_tweet_id
       FROM twitter_accounts
       WHERE id = $1`,
      [twitter_account_id]
    );

    if (accountResult.rows.length === 0) {
      return {
        tweet_count: 0,
        last_sync: null,
        newest_tweet_id: null,
        needs_refresh: true,
      };
    }

    const account = accountResult.rows[0];
    const lastSync = account.last_sync_at;

    // Check if cache needs refresh (> 24 hours or no last sync)
    let needsRefresh = true;
    if (lastSync) {
      const hoursSinceSync = (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60);
      needsRefresh = hoursSinceSync > 24;
    }

    return {
      tweet_count: account.total_tweets_cached || 0,
      last_sync: lastSync,
      newest_tweet_id: account.newest_tweet_id,
      needs_refresh: needsRefresh,
    };
  }

  /**
   * Get analysis count by purpose for an account
   */
  async getAnalysisHistory(twitter_account_id: string): Promise<
    Array<{
      purpose: string;
      scan_count: number;
      last_scan: Date;
      tweets_analyzed: number;
    }>
  > {
    const result = await query<{
      purpose: string;
      scan_count: number;
      last_scan: Date;
      tweets_analyzed: number;
    }>(
      `SELECT
        ar.purpose,
        COUNT(DISTINCT ar.id) as scan_count,
        MAX(ar.created_at) as last_scan,
        COUNT(DISTINCT ta.tweet_id) as tweets_analyzed
       FROM analysis_results ar
       LEFT JOIN tweet_analyses ta ON ta.analysis_result_id = ar.id
       WHERE ar.twitter_account_id = $1
       AND ar.output_data->>'status' = 'completed'
       GROUP BY ar.purpose
       ORDER BY last_scan DESC`,
      [twitter_account_id]
    );

    return result.rows;
  }
}

export const analysisReuseService = new AnalysisReuseService();
