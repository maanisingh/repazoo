-- Workflow configuration table
CREATE TABLE IF NOT EXISTS workflow_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  scan_frequency TEXT DEFAULT 'manual',
  scan_schedule TEXT,
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  custom_analysis_prompt TEXT,
  model_preference TEXT DEFAULT 'llama3:8b',
  notification_enabled BOOLEAN DEFAULT true,
  notification_email TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User scan quotas table
CREATE TABLE IF NOT EXISTS user_scan_quotas (
  user_id UUID PRIMARY KEY,
  subscription_tier TEXT DEFAULT 'free',
  scans_per_month INTEGER DEFAULT 10,
  scans_used INTEGER DEFAULT 0,
  quota_reset_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workflow_configs_user_id ON workflow_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_configs_scan_frequency ON workflow_configurations(scan_frequency);
CREATE INDEX IF NOT EXISTS idx_user_quotas_user_id ON user_scan_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quotas_reset_date ON user_scan_quotas(quota_reset_date);

-- Add foreign key constraint if users table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE workflow_configurations
      ADD CONSTRAINT fk_workflow_user_id
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

    ALTER TABLE user_scan_quotas
      ADD CONSTRAINT fk_quota_user_id
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE workflow_configurations IS 'Stores user workflow configuration for scan automation and preferences';
COMMENT ON TABLE user_scan_quotas IS 'Tracks scan usage quotas per user based on subscription tier';
COMMENT ON COLUMN workflow_configurations.scan_frequency IS 'How often to run scans: manual, daily, weekly, monthly';
COMMENT ON COLUMN workflow_configurations.keywords IS 'Custom keywords to focus on during analysis';
COMMENT ON COLUMN workflow_configurations.model_preference IS 'Preferred AI model for analysis: llama3:8b, mistral:7b, llava:13b';
COMMENT ON COLUMN user_scan_quotas.scans_per_month IS 'Maximum scans allowed per month based on subscription';
COMMENT ON COLUMN user_scan_quotas.scans_used IS 'Number of scans used in current billing cycle';
COMMENT ON COLUMN user_scan_quotas.quota_reset_date IS 'Date when quota will reset to 0';
