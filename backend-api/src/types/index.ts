// User types
export interface User {
  id: string;
  email: string;
  password_hash?: string;
  full_name: string;
  display_name?: string;
  subscription_tier: 'free' | 'basic' | 'pro';
  created_at: Date;
  updated_at: Date;
}

// Twitter types
export interface TwitterAccount {
  id: number;
  user_id: string;
  twitter_user_id: string;
  twitter_handle: string;
  display_name: string;
  profile_image_url?: string;
  connected_at: Date;
}

export interface TwitterCredentials {
  id: number;
  user_id: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: Date;
  created_at: Date;
}

// Scan types
export interface ReputationScan {
  id: number;
  scan_id: string;
  user_id: string;
  twitter_handle: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  purpose: string;
  custom_context?: string;
  created_at: Date;
  completed_at?: Date;
}

export interface AnalysisResult {
  id: number;
  scan_id: string;
  overall_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  toxicity_score: number;
  hate_speech_detected: boolean;
  key_findings: string[];
  recommendations: string[];
  analysis_data: any;
  created_at: Date;
}

// Job types
export interface AuthJobData {
  type: 'register' | 'login' | 'password-reset';
  email: string;
  password?: string;
  full_name?: string;
}

export interface TwitterOAuthJobData {
  user_id: string;
  oauth_token?: string;
  oauth_verifier?: string;
  callback_url?: string;
}

export interface ScanJobData {
  scan_id: string;
  user_id: string;
  twitter_handle: string;
  purpose: string;
  custom_context?: string;
}

export interface TweetJobData {
  user_id: string;
  action: 'post' | 'delete';
  tweet_text?: string;
  tweet_id?: string;
}
