import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { QueueEvents } from 'bullmq';
import { authQueue } from '../queues/index.js';
import { createRedisConnection } from '../config/redis.js';

const queueEvents = new QueueEvents('auth', { connection: createRedisConnection() });

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const passwordResetSchema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const validated = registerSchema.parse(req.body);

    // Add job to queue
    const job = await authQueue.add('register', {
      type: 'register',
      ...validated,
    });

    // Wait for job completion
    const result = await job.waitUntilFinished(queueEvents);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.issues });
    }
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Registration failed',
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validated = loginSchema.parse(req.body);

    // Add job to queue
    const job = await authQueue.add('login', {
      type: 'login',
      ...validated,
    });

    // Wait for job completion
    const result = await job.waitUntilFinished(queueEvents);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.issues });
    }
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Login failed',
    });
  }
});

/**
 * POST /api/auth/password-reset
 * Request password reset
 */
router.post('/password-reset', async (req: Request, res: Response) => {
  try {
    const validated = passwordResetSchema.parse(req.body);

    // Add job to queue
    const job = await authQueue.add('password-reset', {
      type: 'password-reset',
      email: validated.email,
    });

    // Wait for job completion
    const result = await job.waitUntilFinished(queueEvents);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation error', errors: error.issues });
    }
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
    });
  }
});

export default router;
