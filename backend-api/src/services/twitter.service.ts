import { TwitterApi } from 'twitter-api-v2';
import { query } from '../config/database.js';
import { config } from '../config/env.js';
import type { TwitterAccount, TwitterCredentials } from '../types/index.js';

export class TwitterService {
  /**
   * Generate OAuth 2.0 authorization URL
   */
  async generateAuthUrl(user_id: string, callback_url: string): Promise<{ auth_url: string; state: string }> {
    const client = new TwitterApi({
      clientId: config.TWITTER_CLIENT_ID,
      clientSecret: config.TWITTER_CLIENT_SECRET,
    });

    // Generate state for CSRF protection
    const state = `${user_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate OAuth 2.0 authorization URL
    const { url, codeVerifier } = client.generateOAuth2AuthLink(callback_url, {
      scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
      state,
    });

    // Store state, code_verifier, AND callback_url temporarily (5 minutes expiry)
    // Delete any existing tokens for this user first
    await query('DELETE FROM oauth_temp_tokens WHERE user_id = $1', [user_id]);

    await query(
      `INSERT INTO oauth_temp_tokens (user_id, state, code_verifier, callback_url, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '5 minutes')`,
      [user_id, state, codeVerifier, callback_url]
    );

    return {
      auth_url: url,
      state,
    };
  }

  /**
   * Complete OAuth 2.0 callback and store tokens
   */
  async handleOAuthCallback(
    code: string,
    state: string
  ): Promise<{ success: boolean; user_id?: string; twitter_handle?: string; error?: string }> {
    try {
      // Extract user_id from state
      const user_id = state.split('_')[0];

      // Retrieve code_verifier AND callback_url from database
      const tempTokenResult = await query<{ code_verifier: string; callback_url: string }>(
        'SELECT code_verifier, callback_url FROM oauth_temp_tokens WHERE user_id = $1 AND state = $2 AND expires_at > NOW()',
        [user_id, state]
      );

      if (tempTokenResult.rows.length === 0) {
        return {
          success: false,
          error: 'Invalid or expired OAuth state',
        };
      }

      const { code_verifier, callback_url } = tempTokenResult.rows[0];

      // Exchange code for access token
      const client = new TwitterApi({
        clientId: config.TWITTER_CLIENT_ID,
        clientSecret: config.TWITTER_CLIENT_SECRET,
      });

      const { accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
        code,
        codeVerifier: code_verifier,
        redirectUri: callback_url, // Use the same callback_url from generateAuthUrl
      });

      // Get Twitter user info
      const userClient = new TwitterApi(accessToken);
      const { data: twitterUser } = await userClient.v2.me({
        'user.fields': ['username', 'name', 'profile_image_url'],
      });

      // Store credentials in twitter_credentials table
      const expires_at = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

      await query(
        `INSERT INTO twitter_credentials (user_id, access_token, refresh_token, expires_at,
          twitter_user_id, twitter_username, twitter_display_name, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET
           access_token = $2,
           refresh_token = $3,
           expires_at = $4,
           twitter_user_id = $5,
           twitter_username = $6,
           twitter_display_name = $7,
           is_active = true,
           updated_at = NOW()`,
        [user_id, accessToken, refreshToken || null, expires_at, twitterUser.id, twitterUser.username, twitterUser.name]
      );

      // Clean up temporary tokens
      await query('DELETE FROM oauth_temp_tokens WHERE user_id = $1', [user_id]);

      return {
        success: true,
        user_id,
        twitter_handle: twitterUser.username,
      };
    } catch (error) {
      console.error('OAuth callback error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth callback failed',
      };
    }
  }

  /**
   * Get user's Twitter connection status
   */
  async getUserTwitterStatus(user_id: string): Promise<{
    connected: boolean;
    twitter_handle?: string;
    twitter_user_id?: string;
    display_name?: string;
  }> {
    const result = await query<{
      twitter_user_id: string;
      twitter_username: string;
      twitter_display_name: string;
    }>(
      'SELECT twitter_user_id, twitter_username, twitter_display_name FROM twitter_credentials WHERE user_id = $1 AND is_active = true',
      [user_id]
    );

    if (result.rows.length === 0) {
      return { connected: false };
    }

    const creds = result.rows[0];
    return {
      connected: true,
      twitter_user_id: creds.twitter_user_id,
      twitter_handle: creds.twitter_username,
      display_name: creds.twitter_display_name,
    };
  }

  /**
   * Disconnect Twitter account by setting is_active to false
   */
  async disconnectTwitter(user_id: string): Promise<void> {
    await query(
      'UPDATE twitter_credentials SET is_active = false, updated_at = NOW() WHERE user_id = $1',
      [user_id]
    );
  }

  /**
   * Get Twitter API client for user
   */
  async getTwitterClient(user_id: string): Promise<TwitterApi | null> {
    const result = await query<TwitterCredentials>(
      'SELECT access_token, refresh_token FROM twitter_credentials WHERE user_id = $1',
      [user_id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const { access_token } = result.rows[0];
    return new TwitterApi(access_token);
  }

  /**
   * Fetch user's recent tweets using GET /2/users/:id/tweets endpoint
   * Rate limits (Free tier): 1 req/15min PER USER
   */
  async fetchUserTweets(user_id: string, max_results: number = 100): Promise<any[]> {
    const client = await this.getTwitterClient(user_id);
    if (!client) {
      throw new Error('Twitter not connected');
    }

    // Get twitter_user_id from database to avoid extra API call to .me()
    const credResult = await query<{ twitter_user_id: string }>(
      'SELECT twitter_user_id FROM twitter_credentials WHERE user_id = $1',
      [user_id]
    );

    if (credResult.rows.length === 0) {
      throw new Error('Twitter credentials not found');
    }

    const twitter_user_id = credResult.rows[0].twitter_user_id;

    // Use userTimeline which calls GET /2/users/:id/tweets
    const tweets = await client.v2.userTimeline(twitter_user_id, {
      max_results: Math.min(max_results, 100), // API max is 100
      'tweet.fields': ['created_at', 'public_metrics', 'entities'],
    });

    return tweets.data.data || [];
  }

  /**
   * Fetch user's tweets incrementally using since_id
   * Only fetches tweets posted AFTER the given since_id
   * Rate limits (Free tier): 1 req/15min PER USER
   */
  async fetchUserTweetsIncremental(
    user_id: string,
    since_id?: string,
    max_results: number = 100
  ): Promise<{
    tweets: any[];
    newest_id: string | null;
    oldest_id: string | null;
    result_count: number;
  }> {
    const client = await this.getTwitterClient(user_id);
    if (!client) {
      throw new Error('Twitter not connected');
    }

    // Get twitter_user_id from database
    const credResult = await query<{ twitter_user_id: string }>(
      'SELECT twitter_user_id FROM twitter_credentials WHERE user_id = $1',
      [user_id]
    );

    if (credResult.rows.length === 0) {
      throw new Error('Twitter credentials not found');
    }

    const twitter_user_id = credResult.rows[0].twitter_user_id;

    // Build query parameters with media support
    const params: any = {
      max_results: Math.min(max_results, 100),
      'tweet.fields': ['created_at', 'public_metrics', 'entities', 'attachments'],
      expansions: ['attachments.media_keys'],
      'media.fields': ['url', 'preview_image_url', 'type', 'alt_text'],
    };

    // Add since_id for incremental fetching
    if (since_id) {
      params.since_id = since_id;
    }

    // Fetch tweets
    const response = await client.v2.userTimeline(twitter_user_id, params);

    // Enrich tweets with media information from includes
    const enrichedTweets = (response.data.data || []).map((tweet: any) => {
      if (tweet.attachments?.media_keys && response.includes?.media) {
        const tweetMedia = response.includes.media.filter((media: any) =>
          tweet.attachments.media_keys.includes(media.media_key)
        );
        return {
          ...tweet,
          media: tweetMedia,
          has_media: tweetMedia.length > 0,
          media_count: tweetMedia.length,
        };
      }
      return {
        ...tweet,
        has_media: false,
        media_count: 0,
      };
    });

    return {
      tweets: enrichedTweets,
      newest_id: response.data.meta?.newest_id || null,
      oldest_id: response.data.meta?.oldest_id || null,
      result_count: response.data.meta?.result_count || 0,
    };
  }

  /**
   * Fetch user mentions using GET /2/users/:id/mentions endpoint
   * Rate limits: Free tier - 15 requests per 15 minutes (shared with timeline)
   */
  async fetchUserMentions(
    user_id: string,
    max_results: number = 100,
    since_id?: string
  ): Promise<{
    mentions: any[];
    newest_id: string | null;
    oldest_id: string | null;
    result_count: number;
  }> {
    const client = await this.getTwitterClient(user_id);
    if (!client) {
      throw new Error('Twitter not connected');
    }

    // Get twitter_user_id from database
    const credResult = await query<{ twitter_user_id: string }>(
      'SELECT twitter_user_id FROM twitter_credentials WHERE user_id = $1',
      [user_id]
    );

    if (credResult.rows.length === 0) {
      throw new Error('Twitter credentials not found');
    }

    const twitter_user_id = credResult.rows[0].twitter_user_id;

    // Build query parameters
    const params: any = {
      max_results: Math.min(max_results, 100),
      'tweet.fields': ['created_at', 'public_metrics', 'entities', 'referenced_tweets', 'conversation_id'],
      'user.fields': ['username', 'name', 'verified', 'profile_image_url', 'public_metrics'],
      expansions: ['author_id', 'attachments.media_keys', 'referenced_tweets.id'],
      'media.fields': ['url', 'preview_image_url', 'type', 'width', 'height', 'alt_text']
    };

    // Add since_id for incremental fetching
    if (since_id) {
      params.since_id = since_id;
    }

    // Fetch mentions using userMentionTimeline
    const response = await client.v2.userMentionTimeline(twitter_user_id, params);

    return {
      mentions: response.data.data || [],
      newest_id: response.data.meta?.newest_id || null,
      oldest_id: response.data.meta?.oldest_id || null,
      result_count: response.data.meta?.result_count || 0,
    };
  }

  /**
   * Post a tweet
   */
  async postTweet(user_id: string, tweet_text: string): Promise<{ success: boolean; tweet_id?: string; error?: string }> {
    try {
      const client = await this.getTwitterClient(user_id);
      if (!client) {
        return { success: false, error: 'Twitter not connected' };
      }

      const result = await client.v2.tweet(tweet_text);

      return {
        success: true,
        tweet_id: result.data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post tweet',
      };
    }
  }

  /**
   * Delete a tweet
   */
  async deleteTweet(user_id: string, tweet_id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await this.getTwitterClient(user_id);
      if (!client) {
        return { success: false, error: 'Twitter not connected' };
      }

      await client.v2.deleteTweet(tweet_id);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete tweet',
      };
    }
  }
}

export const twitterService = new TwitterService();
