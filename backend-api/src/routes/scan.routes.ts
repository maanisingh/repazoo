import { Router, Response } from 'express';
import { z } from 'zod';
import { QueueEvents } from 'bullmq';
import { scanQueue } from '../queues/index.js';
import { scanService } from '../services/scan.service.js';
import { createRedisConnection } from '../config/redis.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware.js';

const queueEvents = new QueueEvents('reputation-scan', { connection: createRedisConnection() });

const router = Router();

// Validation schema
const createScanSchema = z.object({
  scan_id: z.string(),
  purpose: z.string(),
  custom_context: z.string().optional(),
});

/**
 * POST /api/scans/create
 * Create a new reputation scan
 */
router.post('/create', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = createScanSchema.parse(req.body);

    // Get Twitter handle for user - enforce authenticated user's ID
    const { scan_id, purpose, custom_context } = validated;
    const user_id = req.user!.user_id; // Use authenticated user's ID

    // Verify user has Twitter connected
    const twitterService = await import('../services/twitter.service.js');
    const status = await twitterService.twitterService.getUserTwitterStatus(user_id);

    if (!status.connected || !status.twitter_handle) {
      return res.status(400).json({
        status: 'error',
        error: 'Twitter account not connected',
      });
    }

    // Add job to queue
    const job = await scanQueue.add('reputation-scan', {
      scan_id,
      user_id,
      twitter_handle: status.twitter_handle,
      purpose,
      custom_context,
    });

    // Don't wait for completion - return immediately
    res.json({
      status: 'success',
      scan_id,
      message: 'Scan started successfully',
    });

    // Process in background
    job.waitUntilFinished(queueEvents).catch((error) => {
      console.error(`Background scan ${scan_id} failed:`, error);
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ status: 'error', error: 'Validation error', details: error.issues });
    }
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to create scan',
    });
  }
});

/**
 * GET /api/scans/:scan_id
 * Get a specific scan by ID
 */
router.get('/:scan_id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { scan_id } = req.params;
    const scan = await scanService.getScanById(scan_id);

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found',
      });
    }

    // Verify ownership
    if (scan.user_id !== req.user!.user_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own scans.',
      });
    }

    res.json({
      success: true,
      scan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch scan',
    });
  }
});

/**
 * GET /api/scans
 * Get all scans for the authenticated user
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // SECURITY: Always filter by authenticated user's ID
    const user_id = req.user!.user_id;
    const scans = await scanService.getAllScans(user_id);

    res.json({
      success: true,
      total: scans.length,
      scans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch scans',
    });
  }
});

/**
 * GET /api/scans/stats/dashboard
 * Get dashboard statistics for the authenticated user
 */
router.get('/stats/dashboard', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // SECURITY: Get stats only for authenticated user
    const user_id = req.user!.user_id;
    const stats = await scanService.getDashboardStats(user_id);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats',
    });
  }
});

export default router;
