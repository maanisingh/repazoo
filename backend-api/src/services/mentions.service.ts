import { query } from '../config/database.js';
import { twitterService } from './twitter.service.js';

export class MentionsService {
  /**
   * Fetch and store user mentions from Twitter
   */
  async fetchAndStoreMentions(
    user_id: string,
    max_results: number = 100
  ): Promise<{
    success: boolean;
    mentions_fetched: number;
    mentions_stored: number;
    error?: string;
  }> {
    try {
      // Get last synced mention ID for incremental fetching
      const lastMentionResult = await query<{ tweet_id: string }>(
        `SELECT tweet_id FROM twitter_mentions
         WHERE user_id = $1
         ORDER BY tweet_created_at DESC
         LIMIT 1`,
        [user_id]
      );

      const since_id = lastMentionResult.rows.length > 0 ? lastMentionResult.rows[0].tweet_id : undefined;

      // Fetch mentions from Twitter API
      const { mentions, result_count } = await twitterService.fetchUserMentions(
        user_id,
        max_results,
        since_id
      );

      console.log(`Fetched ${mentions.length} mentions for user ${user_id}`);

      if (mentions.length === 0) {
        return {
          success: true,
          mentions_fetched: 0,
          mentions_stored: 0,
        };
      }

      // Store mentions in database
      let stored_count = 0;
      for (const mention of mentions) {
        try {
          await this.storeMention(user_id, mention);
          stored_count++;
        } catch (error) {
          console.error(`Failed to store mention ${mention.id}:`, error);
        }
      }

      return {
        success: true,
        mentions_fetched: mentions.length,
        mentions_stored: stored_count,
      };
    } catch (error) {
      console.error('Failed to fetch mentions:', error);
      return {
        success: false,
        mentions_fetched: 0,
        mentions_stored: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch mentions',
      };
    }
  }

  /**
   * Store a single mention in the database
   */
  private async storeMention(user_id: string, mention: any): Promise<void> {
    const author = mention.author || {};
    const metrics = mention.public_metrics || {};

    await query(
      `INSERT INTO twitter_mentions (
        user_id, tweet_id, author_id, author_username, author_display_name,
        author_verified, author_followers_count, author_profile_image_url,
        tweet_text, tweet_language, tweet_url, tweet_created_at,
        retweet_count, reply_count, like_count, quote_count, view_count, bookmark_count,
        conversation_id, is_retweet, is_quote,
        engagement_score, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW()
      )
      ON CONFLICT (tweet_id) DO UPDATE SET
        retweet_count = EXCLUDED.retweet_count,
        reply_count = EXCLUDED.reply_count,
        like_count = EXCLUDED.like_count,
        quote_count = EXCLUDED.quote_count,
        view_count = EXCLUDED.view_count,
        bookmark_count = EXCLUDED.bookmark_count,
        engagement_score = EXCLUDED.engagement_score,
        updated_at = NOW()`,
      [
        user_id,
        mention.id,
        mention.author_id,
        author.username || 'unknown',
        author.name || null,
        author.verified || false,
        author.public_metrics?.followers_count || 0,
        author.profile_image_url || null,
        mention.text,
        mention.lang || null,
        `https://twitter.com/${author.username}/status/${mention.id}`,
        mention.created_at ? new Date(mention.created_at) : new Date(),
        metrics.retweet_count || 0,
        metrics.reply_count || 0,
        metrics.like_count || 0,
        metrics.quote_count || 0,
        metrics.impression_count || 0,
        metrics.bookmark_count || 0,
        mention.conversation_id || null,
        mention.referenced_tweets?.some((ref: any) => ref.type === 'retweeted') || false,
        mention.referenced_tweets?.some((ref: any) => ref.type === 'quoted') || false,
        this.calculateEngagementScore(metrics),
      ]
    );

    // Store media if present
    if (mention.attachments?.media_keys && mention.includes?.media) {
      await this.storeMedia(mention.id, mention.includes.media);
    }
  }

  /**
   * Store media attachments for a mention
   */
  private async storeMedia(mention_id: string, mediaItems: any[]): Promise<void> {
    // Get mention UUID from tweet_id
    const mentionResult = await query<{ id: string }>(
      'SELECT id FROM twitter_mentions WHERE tweet_id = $1',
      [mention_id]
    );

    if (mentionResult.rows.length === 0) return;

    const mention_uuid = mentionResult.rows[0].id;

    for (let i = 0; i < mediaItems.length; i++) {
      const media = mediaItems[i];

      await query(
        `INSERT INTO tweet_media (
          mention_id, media_key, type, url, preview_url,
          width, height, alt_text, display_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (mention_id, media_key) DO NOTHING`,
        [
          mention_uuid,
          media.media_key,
          media.type,
          media.url || media.preview_image_url || '',
          media.preview_image_url || null,
          media.width || null,
          media.height || null,
          media.alt_text || null,
          i,
        ]
      );
    }

    // Update has_media flag
    await query(
      `UPDATE twitter_mentions
       SET has_media = true, media_count = $2
       WHERE id = $1`,
      [mention_uuid, mediaItems.length]
    );
  }

  /**
   * Calculate engagement score for a mention
   */
  private calculateEngagementScore(metrics: any): number {
    const likes = metrics.like_count || 0;
    const retweets = metrics.retweet_count || 0;
    const replies = metrics.reply_count || 0;
    const quotes = metrics.quote_count || 0;

    // Weighted engagement: retweets and quotes are more valuable
    return likes * 1 + replies * 2 + retweets * 3 + quotes * 3;
  }

  /**
   * Get mentions stats for a user
   */
  async getMentionsStats(user_id: string): Promise<any> {
    const result = await query(
      `SELECT
        COUNT(*) as total_mentions,
        COUNT(CASE WHEN sentiment = 'positive' THEN 1 END) as positive_mentions,
        COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) as negative_mentions,
        COUNT(CASE WHEN has_media = true THEN 1 END) as mentions_with_media,
        AVG(engagement_score) as avg_engagement,
        MAX(tweet_created_at) as last_mention_date
       FROM twitter_mentions
       WHERE user_id = $1`,
      [user_id]
    );

    return result.rows[0];
  }
}

export const mentionsService = new MentionsService();
