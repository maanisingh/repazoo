import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { QueueEvents } from 'bullmq';
import { twitterOAuthQueue } from '../queues/index.js';
import { twitterService } from '../services/twitter.service.js';
import { createRedisConnection } from '../config/redis.js';

const queueEvents = new QueueEvents('twitter-oauth', { connection: createRedisConnection() });

const router = Router();

// Validation schemas
const connectSchema = z.object({
  user_id: z.string(),
  callback_url: z.string().url(),
});

const callbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

/**
 * POST /api/twitter/oauth/connect
 * Initiate Twitter OAuth connection
 */
router.post('/oauth/connect', async (req: Request, res: Response) => {
  try {
    const validated = connectSchema.parse(req.body);

    // Add job to queue
    const job = await twitterOAuthQueue.add('oauth-connect', {
      user_id: validated.user_id,
      callback_url: validated.callback_url,
    });

    // Wait for job completion
    const result = await job.waitUntilFinished(queueEvents);

    res.json({
      success: true,
      auth_url: result.auth_url,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.issues });
    }
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'OAuth initiation failed',
    });
  }
});

/**
 * GET /api/twitter/oauth/callback
 * Handle Twitter OAuth callback
 */
router.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      return res.status(400).send('Missing OAuth parameters');
    }

    // Process callback directly (no queue needed for this)
    const result = await twitterService.handleOAuthCallback(code, state);

    if (!result.success) {
      return res.redirect(`${process.env.FRONTEND_URL}/twitter-error?error=${encodeURIComponent(result.error || 'OAuth failed')}`);
    }

    // Redirect to success page
    res.redirect(`${process.env.FRONTEND_URL}/twitter-success?twitter_handle=${result.twitter_handle}`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/twitter-error?error=oauth_failed`);
  }
});

/**
 * GET /api/twitter/status/:user_id
 * Get user's Twitter connection status
 */
router.get('/status/:user_id', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;
    const status = await twitterService.getUserTwitterStatus(user_id);

    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get Twitter status',
    });
  }
});

/**
 * POST /api/twitter/disconnect/:user_id
 * Disconnect Twitter account
 */
router.post('/disconnect/:user_id', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;
    await twitterService.disconnectTwitter(user_id);

    res.json({
      success: true,
      message: 'Twitter account disconnected successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect Twitter',
    });
  }
});

/**
 * GET /api/twitter/my-posts/:user_id
 * Get user's own tweets
 */
router.get('/my-posts/:user_id', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.params;
    const tweets = await twitterService.fetchUserTweets(user_id);

    res.json({
      success: true,
      tweets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch tweets',
    });
  }
});

/**
 * POST /api/twitter/post-tweet
 * Post a new tweet
 */
router.post('/post-tweet', async (req: Request, res: Response) => {
  try {
    const { user_id, tweet_text } = req.body;

    if (!user_id || !tweet_text) {
      return res.status(400).json({ success: false, error: 'user_id and tweet_text required' });
    }

    const result = await twitterService.postTweet(user_id, tweet_text);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to post tweet',
    });
  }
});

/**
 * POST /api/twitter/delete-tweet
 * Delete a tweet
 */
router.post('/delete-tweet', async (req: Request, res: Response) => {
  try {
    const { user_id, tweet_id } = req.body;

    if (!user_id || !tweet_id) {
      return res.status(400).json({ success: false, error: 'user_id and tweet_id required' });
    }

    const result = await twitterService.deleteTweet(user_id, tweet_id);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete tweet',
    });
  }
});

export default router;
