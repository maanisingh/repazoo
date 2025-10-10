import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import * as adminService from '../services/admin.service.js';

const router = Router();

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// ===== Queue Management Routes =====

/**
 * GET /api/admin/queues
 * Get stats for all queues
 */
router.get('/queues', async (req: Request, res: Response) => {
  try {
    const stats = await adminService.getQueueStats();
    res.json({ success: true, queues: stats });
  } catch (error) {
    console.error('Failed to get queue stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch queue stats',
    });
  }
});

/**
 * GET /api/admin/queues/:queueName/jobs
 * Get jobs for a specific queue
 */
const getJobsSchema = z.object({
  status: z.enum(['waiting', 'active', 'completed', 'failed', 'delayed']).default('waiting'),
  limit: z.coerce.number().min(1).max(100).default(50),
});

router.get('/queues/:queueName/jobs', async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const validated = getJobsSchema.parse(req.query);

    const jobs = await adminService.getQueueJobs(queueName, validated.status, validated.limit);
    res.json({ success: true, jobs });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.issues });
    }
    console.error('Failed to get queue jobs:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch queue jobs',
    });
  }
});

/**
 * POST /api/admin/queues/:queueName/jobs/:jobId/retry
 * Retry a failed job
 */
router.post('/queues/:queueName/jobs/:jobId/retry', async (req: Request, res: Response) => {
  try {
    const { queueName, jobId } = req.params;
    const result = await adminService.retryFailedJob(queueName, jobId);
    res.json(result);
  } catch (error) {
    console.error('Failed to retry job:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retry job',
    });
  }
});

// ===== User Management Routes =====

/**
 * GET /api/admin/users
 * Get all users with pagination and search
 */
const getUsersSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
});

router.get('/users', async (req: Request, res: Response) => {
  try {
    const validated = getUsersSchema.parse(req.query);
    const result = await adminService.getAllUsers(validated.limit, validated.offset, validated.search);
    res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.issues });
    }
    console.error('Failed to get users:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users',
    });
  }
});

/**
 * PUT /api/admin/users/:userId
 * Update user details
 */
const updateUserSchema = z.object({
  full_name: z.string().optional(),
  subscription_tier: z.enum(['free', 'basic', 'pro', 'enterprise']).optional(),
  is_admin: z.boolean().optional(),
});

router.put('/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const validated = updateUserSchema.parse(req.body);

    const user = await adminService.updateUser(userId, validated);
    res.json({ success: true, user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.issues });
    }
    console.error('Failed to update user:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user',
    });
  }
});

// ===== System Health Routes =====

/**
 * GET /api/admin/health
 * Get system health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await adminService.getSystemHealth();
    res.json({ success: true, health });
  } catch (error) {
    console.error('Failed to get system health:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch system health',
    });
  }
});

// ===== Database Management Routes =====

/**
 * GET /api/admin/tables
 * Get list of all database tables
 */
router.get('/tables', async (req: Request, res: Response) => {
  try {
    const tables = await adminService.getDatabaseTables();
    res.json({ success: true, tables });
  } catch (error) {
    console.error('Failed to get tables:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch tables',
    });
  }
});

/**
 * GET /api/admin/tables/:tableName
 * Get data from a specific table
 */
const getTableDataSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

router.get('/tables/:tableName', async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const validated = getTableDataSchema.parse(req.query);

    const data = await adminService.getTableData(tableName, validated.limit, validated.offset);
    res.json({ success: true, ...data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.issues });
    }
    console.error('Failed to get table data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch table data',
    });
  }
});

/**
 * POST /api/admin/query
 * Execute a read-only SQL query
 */
const querySchema = z.object({
  query: z.string().min(1),
});

router.post('/query', async (req: Request, res: Response) => {
  try {
    const validated = querySchema.parse(req.body);
    const result = await adminService.executeReadOnlyQuery(validated.query);
    res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.issues });
    }
    console.error('Failed to execute query:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute query',
    });
  }
});

export default router;
