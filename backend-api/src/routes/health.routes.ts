import { Router, Request, Response } from 'express';
import { pool } from '../services/database.service';

const router = Router();

/**
 * Health check endpoint
 * Returns system health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connectivity
    const dbCheck = await pool.query('SELECT 1');
    const dbHealthy = dbCheck.rowCount === 1;

    // Get uptime
    const uptime = process.uptime();

    // Get memory usage
    const memUsage = process.memoryUsage();

    const healthStatus = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      database: {
        connected: dbHealthy,
        responseTime: 'OK',
      },
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        unit: 'MB',
      },
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    };

    res.status(dbHealthy ? 200 : 503).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Readiness check endpoint
 * Checks if service is ready to accept traffic
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if database is ready
    await pool.query('SELECT 1');

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Database not ready',
    });
  }
});

/**
 * Liveness check endpoint
 * Checks if service is alive
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export default router;
