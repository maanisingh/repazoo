import { Router, Response } from 'express';
import { z } from 'zod';
import { workflowService } from '../services/workflow.service.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware.js';

const router = Router();

// Validation schema
const saveConfigSchema = z.object({
  user_id: z.string(),
  scan_frequency: z.string().optional(),
  scan_schedule: z.string().optional().nullable(),
  keywords: z.array(z.string()).optional(),
  custom_analysis_prompt: z.string().optional().nullable(),
  model_preference: z.string().optional(),
  notification_enabled: z.boolean().optional(),
  notification_email: z.string().optional().nullable(),
});

/**
 * GET /api/workflows/config
 * Get workflow configuration for the authenticated user
 */
router.get('/config', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user_id = req.user!.user_id;
    const config = await workflowService.getWorkflowConfig(user_id);

    res.json(config);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get workflow configuration',
    });
  }
});

/**
 * POST /api/workflows/config
 * Save workflow configuration for the authenticated user
 */
router.post('/config', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = saveConfigSchema.parse(req.body);

    // Use authenticated user's ID instead of body user_id
    const user_id = req.user!.user_id;

    const config = await workflowService.saveWorkflowConfig({
      ...validated,
      user_id,
    });

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.issues,
      });
    }
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save workflow configuration',
    });
  }
});

/**
 * GET /api/workflows/quota
 * Get scan quota status for the authenticated user
 */
router.get('/quota', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user_id = req.user!.user_id;

    // Check and reset quota if needed
    await workflowService.checkAndResetQuota(user_id);

    const config = await workflowService.getWorkflowConfig(user_id);

    res.json({
      success: true,
      quota: {
        max_scans_per_month: config?.max_scans_per_month || 10,
        scans_used: config?.scans_used || 0,
        scans_remaining: (config?.max_scans_per_month || 10) - (config?.scans_used || 0),
        quota_reset_date: config?.quota_reset_date,
        has_quota_available: await workflowService.hasQuotaAvailable(user_id),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get quota status',
    });
  }
});

export default router;
