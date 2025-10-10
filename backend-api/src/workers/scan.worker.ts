import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { scanService } from '../services/scan.service.js';
import type { ScanJobData } from '../types/index.js';

const connection = createRedisConnection();

export const scanWorker = new Worker<ScanJobData>(
  'reputation-scan',
  async (job: Job<ScanJobData>) => {
    const { scan_id, user_id, twitter_handle, purpose, custom_context } = job.data;

    console.log(`Processing reputation scan ${scan_id} for @${twitter_handle}`);

    try {
      // Get twitter_account_id from twitter_credentials
      const { twitterService } = await import('../services/twitter.service.js');
      const twitterStatus = await twitterService.getUserTwitterStatus(user_id);

      if (!twitterStatus.connected) {
        throw new Error('Twitter account not connected');
      }

      // Get twitter_account_id from twitter_accounts table
      const { query } = await import('../config/database.js');
      const accountResult = await query<{ id: string }>(
        'SELECT id FROM twitter_accounts WHERE user_id = $1 AND twitter_username = $2',
        [user_id, twitter_handle]
      );

      let twitter_account_id: string;
      if (accountResult.rows.length === 0) {
        // Create twitter_accounts entry if it doesn't exist
        const createResult = await query<{ id: string }>(
          `INSERT INTO twitter_accounts (user_id, twitter_user_id, twitter_username)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [user_id, twitterStatus.twitter_user_id || 'unknown', twitter_handle]
        );
        twitter_account_id = createResult.rows[0].id;
      } else {
        twitter_account_id = accountResult.rows[0].id;
      }

      // Create scan record with external_scan_id for tracking
      const analysis_result_id = await scanService.createScan(user_id, twitter_account_id, purpose, custom_context, scan_id);

      // Perform AI analysis
      const result = await scanService.performReputationAnalysis(
        analysis_result_id,
        user_id,
        twitter_account_id,
        twitter_handle,
        purpose,
        custom_context
      );

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      return {
        success: true,
        scan_id,
        message: 'Reputation scan completed successfully',
      };
    } catch (error) {
      console.error(`Reputation scan failed for ${scan_id}:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 20, // Process 20 scans simultaneously for better throughput
  }
);

scanWorker.on('completed', (job) => {
  console.log(`✅ Scan job ${job.id} completed: ${job.data.scan_id}`);
});

scanWorker.on('failed', (job, err) => {
  console.error(`❌ Scan job ${job?.id} failed:`, err.message);
});

console.log('✅ Reputation scan worker started');
