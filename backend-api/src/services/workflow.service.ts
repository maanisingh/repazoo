import { query } from '../config/database.js';

export interface WorkflowConfig {
  id?: string;
  user_id: string;
  scan_frequency: string;
  scan_schedule?: string | null;
  keywords: string[];
  custom_analysis_prompt?: string | null;
  model_preference: string;
  notification_enabled: boolean;
  notification_email?: string | null;
  max_scans_per_month: number;
  scans_used: number;
  quota_reset_date?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

export class WorkflowService {
  /**
   * Get workflow configuration for a user
   */
  async getWorkflowConfig(user_id: string): Promise<WorkflowConfig | null> {
    const configResult = await query<WorkflowConfig>(
      `SELECT
        wc.*,
        COALESCE(usq.max_scans_per_month, 10) as max_scans_per_month,
        COALESCE(usq.scans_used, 0) as scans_used,
        usq.quota_reset_date
       FROM workflow_configurations wc
       LEFT JOIN user_scan_quotas usq ON wc.user_id = usq.user_id
       WHERE wc.user_id = $1`,
      [user_id]
    );

    if (configResult.rows.length === 0) {
      // Return default config with quota info
      const quotaResult = await query<{ max_scans_per_month: number; scans_used: number; quota_reset_date: Date }>(
        `SELECT
          COALESCE(max_scans_per_month, 10) as max_scans_per_month,
          COALESCE(scans_used, 0) as scans_used,
          quota_reset_date
         FROM user_scan_quotas
         WHERE user_id = $1`,
        [user_id]
      );

      const quotaData = quotaResult.rows[0] || {
        max_scans_per_month: 10,
        scans_used: 0,
        quota_reset_date: null,
      };

      return {
        user_id,
        scan_frequency: 'manual',
        keywords: [],
        model_preference: 'llama3:8b',
        notification_enabled: true,
        ...quotaData,
      };
    }

    return configResult.rows[0];
  }

  /**
   * Create or update workflow configuration
   */
  async saveWorkflowConfig(config: Partial<WorkflowConfig> & { user_id: string }): Promise<WorkflowConfig> {
    const {
      user_id,
      scan_frequency,
      scan_schedule,
      keywords,
      custom_analysis_prompt,
      model_preference,
      notification_enabled,
      notification_email,
    } = config;

    // Upsert workflow configuration
    const result = await query<WorkflowConfig>(
      `INSERT INTO workflow_configurations (
        user_id, scan_frequency, scan_schedule, keywords,
        custom_analysis_prompt, model_preference, notification_enabled,
        notification_email, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        scan_frequency = $2,
        scan_schedule = $3,
        keywords = $4,
        custom_analysis_prompt = $5,
        model_preference = $6,
        notification_enabled = $7,
        notification_email = $8,
        updated_at = NOW()
      RETURNING *`,
      [
        user_id,
        scan_frequency || 'manual',
        scan_schedule || null,
        keywords || [],
        custom_analysis_prompt || null,
        model_preference || 'llama3:8b',
        notification_enabled !== false,
        notification_email || null,
      ]
    );

    // Initialize quota if doesn't exist
    await query(
      `INSERT INTO user_scan_quotas (user_id, subscription_tier, scans_per_month, scans_used, quota_reset_date)
       VALUES ($1, 'free', 10, 0, NOW() + INTERVAL '1 month')
       ON CONFLICT (user_id) DO NOTHING`,
      [user_id]
    );

    return result.rows[0];
  }

  /**
   * Increment scan usage for a user
   */
  async incrementScanUsage(user_id: string): Promise<void> {
    // Initialize quota if doesn't exist
    await query(
      `INSERT INTO user_scan_quotas (user_id, subscription_tier, scans_per_month, scans_used, quota_reset_date, created_at, updated_at)
       VALUES ($1, 'free', 10, 1, NOW() + INTERVAL '1 month', NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         scans_used = user_scan_quotas.scans_used + 1,
         updated_at = NOW()`,
      [user_id]
    );
  }

  /**
   * Check if user has scan quota available
   */
  async hasQuotaAvailable(user_id: string): Promise<boolean> {
    const result = await query<{ scans_used: number; scans_per_month: number }>(
      `SELECT scans_used, scans_per_month
       FROM user_scan_quotas
       WHERE user_id = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return true; // First scan, allow it
    }

    const { scans_used, scans_per_month } = result.rows[0];
    return scans_used < scans_per_month;
  }

  /**
   * Reset quota if reset date has passed
   */
  async checkAndResetQuota(user_id: string): Promise<void> {
    await query(
      `UPDATE user_scan_quotas
       SET scans_used = 0, quota_reset_date = NOW() + INTERVAL '1 month', updated_at = NOW()
       WHERE user_id = $1 AND quota_reset_date < NOW()`,
      [user_id]
    );
  }

  /**
   * Get all users with scheduled scans
   */
  async getUsersWithScheduledScans(frequency: string): Promise<WorkflowConfig[]> {
    const result = await query<WorkflowConfig>(
      `SELECT * FROM workflow_configurations
       WHERE scan_frequency = $1`,
      [frequency]
    );

    return result.rows;
  }
}

export const workflowService = new WorkflowService();
