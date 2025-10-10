/**
 * Repazoo API Client
 *
 * Originally designed for n8n webhooks, now supports both:
 * - Legacy: /webhook/* paths (redirects to new API)
 * - New: /api/* paths (direct code-first backend)
 *
 * Both work identically thanks to backward compatibility.
 * Migration to code-first BullMQ backend completed Oct 2025.
 */

// Using new BullMQ backend API directly (cfy environment)
// Migration to code-first BullMQ backend completed Oct 2025
const N8N_WEBHOOK_BASE = 'https://cfy.repazoo.com/api';

// Legacy webhook path (deprecated, redirects handled by backend)
// const OLD_WEBHOOK_BASE = 'https://ntf.repazoo.com/webhook';

export interface Scan {
  id: number;
  scan_id: string;
  user_id: string;
  twitter_handle: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  overall_score?: number;
  risk_level?: string;
  summary?: {
    overall_score: number;
    risk_level: string;
    toxicity_score: number;
  };
  analysis_result?: {
    overall_score: number;
    risk_level: string;
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
    toxicity_score: number;
    hate_speech_detected: boolean;
    key_findings: string[];
    recommendations: string[];
    tweets_analyzed?: number;
    tweets_list?: Array<{
      text: string;
      created_at: string;
      public_metrics?: {
        likes: number;
        retweets: number;
        replies: number;
        views: number;
      };
    }>;
  };
  cache_info?: {
    used_cached_tweets?: boolean;
    used_cached_analysis?: boolean;
    new_tweets_analyzed?: number;
    new_tweets_fetched?: number;
    total_tweets_cached?: number;
    last_sync?: string | null;
  } | null;
  error_message?: string | null;
}

export interface DashboardStats {
  total_scans: number;
  today_scans: number;
  average_risk_score: number;
  high_risk_accounts: number;
}

export interface CreateScanRequest {
  twitter_handle?: string;
  user_id: string;
  scan_id: string;
  purpose?: string;
  custom_context?: string;
}

export interface CreateScanResponse {
  status: string;
  scan_id: string;
  result?: any;
  error?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user_id?: string;
  message?: string;
}

export interface TwitterOAuthRequest {
  user_id: string;
  callback_url: string;
}

export interface TwitterOAuthResponse {
  success: boolean;
  auth_url?: string;
  error?: string;
}

export interface PostTweetRequest {
  user_id: string;
  tweet_text: string;
}

export interface DeleteTweetRequest {
  user_id: string;
  tweet_id: string;
}

export interface SavePurposeRequest {
  user_id: string;
  purpose: string;
  purpose_category: string;
}

class N8NClient {
  private baseURL: string;

  constructor(baseURL: string = N8N_WEBHOOK_BASE) {
    this.baseURL = baseURL;
  }

  /**
   * Get JWT token from localStorage
   */
  private getToken(): string | null {
    return localStorage.getItem('repazoo_auth_token');
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // ========== Authentication APIs ==========

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<{ success: boolean; user_id?: string; message?: string }> {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Registration failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * Login user and get JWT token
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Login failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * Request password reset
   */
  async passwordReset(email: string): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${this.baseURL}/auth/password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error(`Password reset failed: ${response.statusText}`);
    return response.json();
  }

  // ========== Reputation Scan APIs ==========

  /**
   * Get all scans from database
   */
  async getAllScans(): Promise<{ success: boolean; total: number; scans: Scan[] }> {
    const response = await fetch(`${this.baseURL}/scans`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch scans: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get a specific scan by ID
   */
  async getScanById(scanId: string): Promise<{ success: boolean; scan: Scan; error?: string }> {
    const response = await fetch(`${this.baseURL}/scans/${scanId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch scan: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<{ success: boolean; stats: DashboardStats }> {
    const response = await fetch(`${this.baseURL}/scans/stats/dashboard`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Create a new Twitter reputation scan (self-service)
   */
  async createScan(data: CreateScanRequest): Promise<CreateScanResponse> {
    const response = await fetch(`${this.baseURL}/scans/create`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        scan_id: data.scan_id,
        purpose: data.purpose || 'general',
        custom_context: data.custom_context || '',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create scan: ${response.statusText}`);
    }

    return response.json();
  }

  // ========== Twitter OAuth APIs ==========

  /**
   * Initiate Twitter OAuth connection
   */
  async connectTwitter(data: TwitterOAuthRequest): Promise<TwitterOAuthResponse> {
    const response = await fetch(`${this.baseURL}/twitter/oauth/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Twitter OAuth failed: ${response.statusText}`);
    return response.json();
  }

  /**
   * Disconnect Twitter account
   */
  async disconnectTwitter(userId: string): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${this.baseURL}/twitter/disconnect/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to disconnect Twitter: ${response.statusText}`);
    return response.json();
  }

  /**
   * Get user's own tweets
   */
  async getMyPosts(userId: string): Promise<{ success: boolean; tweets?: any[]; error?: string }> {
    const response = await fetch(`${this.baseURL}/twitter/my-posts/${userId}`);
    if (!response.ok) throw new Error(`Failed to fetch tweets: ${response.statusText}`);
    return response.json();
  }

  // ========== Twitter Management APIs ==========

  /**
   * Post a new tweet
   */
  async postTweet(data: PostTweetRequest): Promise<{ success: boolean; tweet_id?: string; error?: string }> {
    const response = await fetch(`${this.baseURL}/twitter/post-tweet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Failed to post tweet: ${response.statusText}`);
    return response.json();
  }

  /**
   * Delete a tweet
   */
  async deleteTweet(data: DeleteTweetRequest): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${this.baseURL}/twitter/delete-tweet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Failed to delete tweet: ${response.statusText}`);
    return response.json();
  }

  // ========== User Management APIs ==========

  /**
   * Get user's Twitter connection status
   */
  async getUserTwitterStatus(userId: string): Promise<{ success: boolean; connected: boolean; twitter_handle?: string; twitter_user_id?: string }> {
    const response = await fetch(`${this.baseURL}/twitter/status/${userId}`);
    if (!response.ok) throw new Error(`Failed to get user status: ${response.statusText}`);
    return response.json();
  }

  /**
   * Save user's purpose
   */
  async savePurpose(data: SavePurposeRequest): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${this.baseURL}/user/purpose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Failed to save purpose: ${response.statusText}`);
    return response.json();
  }

  // ========== Utility Functions ==========

  /**
   * Generate a unique scan ID
   */
  generateScanId(): string {
    return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const n8nClient = new N8NClient();

// Export types
export type { N8NClient };
