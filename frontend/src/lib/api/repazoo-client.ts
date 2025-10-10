/**
 * Repazoo API Client
 * Unified client for backend FastAPI endpoints
 * Replaces n8n webhook-based architecture
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://cfy.repazoo.com/api';

export interface ApiError {
  detail: string;
  status: number;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  twitter_username?: string;
  subscription_tier?: 'free' | 'basic' | 'pro' | 'enterprise';
  created_at: string;
}

export interface Scan {
  id: string;
  user_id: string;
  twitter_handle: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  risk_score?: number;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  analysis_result?: any;
  created_at: string;
  completed_at?: string;
}

export interface DashboardStats {
  total_scans: number;
  today_scans: number;
  average_risk_score: number;
  high_risk_accounts: number;
}

export interface AnalyzeRequest {
  twitter_username: string;
  analysis_type?: 'reputation' | 'content' | 'engagement';
  include_tweets?: boolean;
}

export interface UsageQuota {
  tier: string;
  api_calls_used: number;
  api_calls_limit: number;
  scans_used: number;
  scans_limit: number;
  reset_date: string;
}

class RepazooClient {
  private baseURL: string;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || API_BASE_URL;
  }

  private getToken(): string | null {
    return localStorage.getItem('repazoo_token');
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          detail: response.statusText,
        }));
        throw {
          detail: error.detail || error.message || 'API request failed',
          status: response.status,
        } as ApiError;
      }

      return response.json();
    } catch (error) {
      if ((error as ApiError).status) {
        throw error;
      }
      throw {
        detail: 'Network error or server unavailable',
        status: 0,
      } as ApiError;
    }
  }

  // ===== Authentication =====

  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: { email: string; password: string; full_name?: string }): Promise<User> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request('/users/me');
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // ===== Scans =====

  async getScans(limit = 50, offset = 0): Promise<Scan[]> {
    return this.request(`/scans?limit=${limit}&offset=${offset}`);
  }

  async getScan(id: string): Promise<Scan> {
    return this.request(`/scans/${id}`);
  }

  async createScan(data: { twitter_handle: string }): Promise<Scan> {
    return this.request('/scans', {
      method: 'POST',
      body: JSON.stringify({
        twitter_username: data.twitter_handle,
        analysis_type: 'reputation',
        include_tweets: true,
      }),
    });
  }

  // ===== Dashboard =====

  async getDashboardStats(): Promise<DashboardStats> {
    return this.request('/dashboard/stats');
  }

  // ===== Analysis =====

  async createAnalysis(data: AnalyzeRequest): Promise<any> {
    return this.request('/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAnalyses(limit = 50, offset = 0): Promise<any[]> {
    return this.request(`/analyses?limit=${limit}&offset=${offset}`);
  }

  async getAnalysis(id: string): Promise<any> {
    return this.request(`/analyses/${id}`);
  }

  // ===== Usage =====

  async getUsageQuota(): Promise<UsageQuota> {
    return this.request('/usage/quota');
  }

  // ===== Subscriptions =====

  async getSubscriptionStatus(userId: string): Promise<any> {
    return this.request(`/subscriptions/status?user_id=${userId}`);
  }

  async createSubscription(data: {
    user_id: string;
    tier: string;
    payment_method_id: string;
  }): Promise<any> {
    return this.request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ===== Twitter OAuth =====

  async initiateTwitterOAuth(domain: string = 'dash'): Promise<{ authorization_url: string }> {
    return this.request(`/auth/twitter/login?domain=${domain}`);
  }

  async getTwitterStatus(userId: string): Promise<{ connected: boolean; username?: string }> {
    return this.request(`/auth/twitter/status?user_id=${userId}`);
  }

  // ===== Health Check =====

  async healthCheck(): Promise<{ status: string }> {
    return this.request('/healthz');
  }

  // ===== Mentions =====

  async getMentions(userId: string, filters?: any): Promise<any> {
    const params = new URLSearchParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, String(filters[key]));
        }
      });
    }
    return this.request(`/mentions?user_id=${userId}&${params.toString()}`);
  }

  async getMention(userId: string, mentionId: string): Promise<any> {
    return this.request(`/mentions/${mentionId}?user_id=${userId}`);
  }

  async getMentionsStats(userId: string): Promise<any> {
    return this.request(`/mentions/stats/summary?user_id=${userId}`);
  }

  async scanMentions(userId: string, data?: any): Promise<any> {
    return this.request(`/mentions/scan`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, ...data }),
    });
  }
}

// Export singleton instance
export const repazooClient = new RepazooClient();
export default repazooClient;
