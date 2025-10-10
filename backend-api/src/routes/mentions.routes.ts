import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { mentionsService } from '../services/mentions.service.js';
import { query } from '../config/database.js';

const router = Router();

const scanMentionsSchema = z.object({
  user_id: z.string(),
  max_results: z.number().optional().default(100),
});

/**
 * POST /api/mentions/scan
 * Fetch and store new mentions for a user
 */
router.post('/scan', async (req: Request, res: Response) => {
  try {
    const validated = scanMentionsSchema.parse(req.body);
    const { user_id, max_results } = validated;

    console.log(`Scanning mentions for user ${user_id}`);

    const result = await mentionsService.fetchAndStoreMentions(user_id, max_results);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to scan mentions',
      });
    }

    return res.status(200).json({
      success: true,
      mentions_fetched: result.mentions_fetched,
      mentions_stored: result.mentions_stored,
      message: `Successfully fetched ${result.mentions_fetched} mentions, stored ${result.mentions_stored}`,
    });
  } catch (error) {
    console.error('Mentions scan error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scan mentions',
    });
  }
});

/**
 * GET /api/mentions
 * Get mentions for a user with pagination and filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required',
      });
    }
    const {
      page = 1,
      limit = 20,
      sentiment,
      risk_level,
      has_media,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Build WHERE clause
    const conditions = ['user_id = $1'];
    const params: any[] = [user_id as string];
    let paramIndex = 2;

    if (sentiment) {
      conditions.push(`sentiment = $${paramIndex}`);
      params.push(sentiment);
      paramIndex++;
    }

    if (risk_level) {
      conditions.push(`risk_level = $${paramIndex}`);
      params.push(risk_level);
      paramIndex++;
    }

    if (has_media !== undefined) {
      conditions.push(`has_media = $${paramIndex}`);
      params.push(has_media === 'true');
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get mentions
    const mentionsResult = await query(
      `SELECT * FROM twitter_mentions
       WHERE ${whereClause}
       ORDER BY tweet_created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, Number(limit), offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM twitter_mentions WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    return res.status(200).json({
      success: true,
      mentions: mentionsResult.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        total_pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get mentions error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get mentions',
    });
  }
});

/**
 * GET /api/mentions/stats
 * Get mentions statistics for a user
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required',
      });
    }

    const stats = await mentionsService.getMentionsStats(user_id as string);

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Get mentions stats error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get mentions stats',
    });
  }
});

/**
 * GET /api/mentions/:mention_id
 * Get a specific mention by ID
 */
router.get('/:mention_id', async (req: Request, res: Response) => {
  try {
    const { mention_id } = req.params;
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required',
      });
    }

    const mentionResult = await query(
      `SELECT m.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', tm.id,
                    'media_key', tm.media_key,
                    'type', tm.type,
                    'url', tm.url,
                    'preview_url', tm.preview_url,
                    'width', tm.width,
                    'height', tm.height,
                    'alt_text', tm.alt_text,
                    'display_order', tm.display_order
                  ) ORDER BY tm.display_order
                ) FILTER (WHERE tm.id IS NOT NULL),
                '[]'
              ) as media
       FROM twitter_mentions m
       LEFT JOIN tweet_media tm ON m.id = tm.mention_id
       WHERE m.id = $1 AND m.user_id = $2
       GROUP BY m.id`,
      [mention_id, user_id as string]
    );

    if (mentionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Mention not found',
      });
    }

    return res.status(200).json({
      success: true,
      mention: mentionResult.rows[0],
    });
  } catch (error) {
    console.error('Get mention error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get mention',
    });
  }
});

export default router;
