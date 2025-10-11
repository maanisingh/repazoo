import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import twitterRoutes from './routes/twitter.routes.js';
import scanRoutes from './routes/scan.routes.js';
import mentionsRoutes from './routes/mentions.routes.js';
import adminRoutes from './routes/admin.routes.js';
import helpRoutes from './routes/help.routes.js';
import healthRoutes from './routes/health.routes.js';
import workflowsRoutes from './routes/workflows.routes.js';

// Import workers - they will start automatically when imported
import './workers/scan.worker.js';
import './workers/auth.worker.js';
import './workers/twitter-oauth.worker.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api', healthRoutes);  // Health, readiness, and liveness checks
app.use('/api/auth', authRoutes);
app.use('/api/twitter', twitterRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/mentions', mentionsRoutes);
app.use('/api/workflows', workflowsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/help', helpRoutes);

// No backward compatibility routes needed - n8n removed

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`
🚀 Repazoo Backend API Server Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: ${config.NODE_ENV}
Port:        ${config.PORT}
API URL:     http://0.0.0.0:${config.PORT}
Health:      http://localhost:${config.PORT}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await shutdownWorkers();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await shutdownWorkers();
  process.exit(0);
});

async function shutdownWorkers() {
  try {
    console.log('Closing workers...');
    const { scanWorker } = await import('./workers/scan.worker.js');
    const { authWorker } = await import('./workers/auth.worker.js');
    const { twitterOAuthWorker } = await import('./workers/twitter-oauth.worker.js');

    await Promise.all([
      scanWorker.close(),
      authWorker.close(),
      twitterOAuthWorker.close(),
    ]);
    console.log('✅ All workers closed');
  } catch (error) {
    console.error('Error closing workers:', error);
  }
}
