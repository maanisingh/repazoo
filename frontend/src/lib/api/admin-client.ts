/**
 * Admin API Client
 * Client for admin panel endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://cfy.repazoo.com/api';

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export interface QueueJob {
  id: string;
  name: string;
  data: any;
  progress: number;
  attemptsMade: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
  stacktrace?: string[];
  timestamp: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: string | null;
  is_admin: boolean;
  created_at: string;
  last_login: string | null;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  redis: {
    connected: boolean;
    used_memory: string;
    connected_clients: number;
  };
  database: {
    connected: boolean;
    active_connections: number;
    max_connections: number;
  };
  queues: {
    total: number;
    healthy: number;
    paused: number;
  };
  system: {
    platform: string;
    memory_usage: number;
    memory_total: number;
    cpu_count: number;
    load_average: number[];
  };
}

export interface DatabaseTable {
  name: string;
  row_count: number;
}

export interface TableColumn {
  column_name: string;
  data_type: string;
}

export interface TableData {
  columns: TableColumn[];
  rows: any[];
  total: number;
}

export interface QueryResult {
  columns: { name: string; type: number }[];
  rows: any[];
  rowCount: number;
}

class AdminClient {
  private baseURL: string;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || API_BASE_URL;
  }

  private getToken(): string | null {
    return localStorage.getItem('repazoo_token');
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
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
          error: response.statusText,
        }));
        throw new Error(error.error || error.message || 'API request failed');
      }

      return response.json();
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Network error or server unavailable'
      );
    }
  }

  // ===== Queue Management =====

  async getQueueStats(): Promise<QueueStats[]> {
    const response = await this.request<{ success: boolean; queues: QueueStats[] }>(
      '/admin/queues'
    );
    return response.queues;
  }

  async getQueueJobs(
    queueName: string,
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' = 'waiting',
    limit = 50
  ): Promise<QueueJob[]> {
    const response = await this.request<{ success: boolean; jobs: QueueJob[] }>(
      `/admin/queues/${queueName}/jobs?status=${status}&limit=${limit}`
    );
    return response.jobs;
  }

  async retryFailedJob(queueName: string, jobId: string): Promise<void> {
    await this.request(`/admin/queues/${queueName}/jobs/${jobId}/retry`, {
      method: 'POST',
    });
  }

  // ===== User Management =====

  async getUsers(
    limit = 50,
    offset = 0,
    search?: string
  ): Promise<{ users: User[]; total: number }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    if (search) {
      params.append('search', search);
    }

    const response = await this.request<{
      success: boolean;
      users: User[];
      total: number;
    }>(`/admin/users?${params.toString()}`);

    return { users: response.users, total: response.total };
  }

  async updateUser(
    userId: string,
    updates: {
      full_name?: string;
      subscription_tier?: 'free' | 'basic' | 'pro' | 'enterprise';
      is_admin?: boolean;
    }
  ): Promise<User> {
    const response = await this.request<{ success: boolean; user: User }>(
      `/admin/users/${userId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
    return response.user;
  }

  // ===== System Health =====

  async getSystemHealth(): Promise<SystemHealth> {
    const response = await this.request<{ success: boolean; health: SystemHealth }>(
      '/admin/health'
    );
    return response.health;
  }

  // ===== Database Management =====

  async getDatabaseTables(): Promise<DatabaseTable[]> {
    const response = await this.request<{ success: boolean; tables: DatabaseTable[] }>(
      '/admin/tables'
    );
    return response.tables;
  }

  async getTableData(
    tableName: string,
    limit = 50,
    offset = 0
  ): Promise<TableData> {
    const response = await this.request<{
      success: boolean;
      columns: TableColumn[];
      rows: any[];
      total: number;
    }>(`/admin/tables/${tableName}?limit=${limit}&offset=${offset}`);

    return {
      columns: response.columns,
      rows: response.rows,
      total: response.total,
    };
  }

  async executeQuery(query: string): Promise<QueryResult> {
    const response = await this.request<{
      success: boolean;
      columns: { name: string; type: number }[];
      rows: any[];
      rowCount: number;
    }>('/admin/query', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });

    return {
      columns: response.columns,
      rows: response.rows,
      rowCount: response.rowCount,
    };
  }
}

// Export singleton instance
export const adminClient = new AdminClient();
export default adminClient;
