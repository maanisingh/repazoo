import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { twitterService } from '../services/twitter.service.js';
import type { TwitterOAuthJobData } from '../types/index.js';

const connection = createRedisConnection();

export const twitterOAuthWorker = new Worker<TwitterOAuthJobData>(
  'twitter-oauth',
  async (job: Job<TwitterOAuthJobData>) => {
    const { user_id, oauth_token, oauth_verifier, callback_url } = job.data;

    console.log(`Processing Twitter OAuth job for user: ${user_id}`);
    console.log(`Job data:`, JSON.stringify(job.data, null, 2));

    try {
      // If we have oauth_token and oauth_verifier, complete the OAuth flow
      if (oauth_token && oauth_verifier) {
        const state = oauth_token; // Using oauth_token as state for OAuth 2.0
        const result = await twitterService.handleOAuthCallback(oauth_verifier, state);

        if (!result.success) {
          throw new Error(result.error || 'OAuth callback failed');
        }

        return {
          success: true,
          user_id: result.user_id,
          twitter_handle: result.twitter_handle,
          message: 'Twitter account connected successfully',
        };
      }

      // Otherwise, generate auth URL
      if (!callback_url) {
        throw new Error('callback_url required for OAuth initiation');
      }

      const { auth_url, state } = await twitterService.generateAuthUrl(user_id, callback_url);

      return {
        success: true,
        auth_url,
        state,
        message: 'OAuth URL generated successfully',
      };
    } catch (error) {
      console.error(`Twitter OAuth job failed for user ${user_id}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

twitterOAuthWorker.on('completed', (job) => {
  console.log(`✅ Twitter OAuth job ${job.id} completed for user: ${job.data.user_id}`);
});

twitterOAuthWorker.on('failed', (job, err) => {
  console.error(`❌ Twitter OAuth job ${job?.id} failed:`, err.message);
});

console.log('✅ Twitter OAuth worker started');
