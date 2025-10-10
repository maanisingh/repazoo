import { Queue } from 'bullmq';
import { queues } from '../queues/index.js';
import { query, pool } from '../config/database.js';
import { redis } from '../config/redis.js';
import os from 'os';

/**
 * Admin Service
 * Provides administrative functions for system monitoring and management
 */

// ===== Queue Management =====

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export async function getQueueStats(): Promise<QueueStats[]> {
  const stats: QueueStats[] = [];

  for (const [name, queue] of Object.entries(queues)) {
    const counts = await queue.getJobCounts();
    const isPaused = await queue.isPaused();

    stats.push({
      name,
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: isPaused,
    });
  }

  return stats;
}

export async function getQueueJobs(queueName: string, status: string, limit = 50) {
  const queue = queues[queueName as keyof typeof queues];
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }

  let jobs;
  switch (status) {
    case 'waiting':
      jobs = await queue.getWaiting(0, limit - 1);
      break;
    case 'active':
      jobs = await queue.getActive(0, limit - 1);
      break;
    case 'completed':
      jobs = await queue.getCompleted(0, limit - 1);
      break;
    case 'failed':
      jobs = await queue.getFailed(0, limit - 1);
      break;
    case 'delayed':
      jobs = await queue.getDelayed(0, limit - 1);
      break;
    default:
      throw new Error(`Invalid status: ${status}`);
  }

  return jobs.map((job) => ({
    id: job.id,
    name: job.name,
    data: job.data,
    progress: job.progress,
    attemptsMade: job.attemptsMade,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
    stacktrace: job.stacktrace,
    timestamp: job.timestamp,
  }));
}

export async function retryFailedJob(queueName: string, jobId: string) {
  const queue = queues[queueName as keyof typeof queues];
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  await job.retry();
  return { success: true, message: 'Job retried successfully' };
}

// ===== User Management =====

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: string | null;
  is_admin: boolean;
  created_at: string;
  last_login: string | null;
}

export async function getAllUsers(limit = 100, offset = 0, search?: string) {
  let queryText = `
    SELECT id, email, full_name, subscription_tier, is_admin, created_at, last_login
    FROM users
  `;
  const params: any[] = [];

  if (search) {
    queryText += ` WHERE email ILIKE $1 OR full_name ILIKE $1`;
    params.push(`%${search}%`);
  }

  queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await query<User>(queryText, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as count FROM users';
  const countParams: any[] = [];
  if (search) {
    countQuery += ' WHERE email ILIKE $1 OR full_name ILIKE $1';
    countParams.push(`%${search}%`);
  }
  const countResult = await query<{ count: string }>(countQuery, countParams);

  return {
    users: result.rows,
    total: parseInt(countResult.rows[0].count),
  };
}

export async function updateUser(userId: string, updates: Partial<User>) {
  const allowedFields = ['full_name', 'subscription_tier', 'is_admin'];
  const updateFields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (allowedFields.includes(key)) {
      updateFields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  });

  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  values.push(userId);
  const queryText = `
    UPDATE users
    SET ${updateFields.join(', ')}, updated_at = NOW()
    WHERE id = $${paramCount}
    RETURNING id, email, full_name, subscription_tier, is_admin, created_at
  `;

  const result = await query<User>(queryText, values);
  return result.rows[0];
}

// ===== System Health =====

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

export async function getSystemHealth(): Promise<SystemHealth> {
  const health: SystemHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    redis: {
      connected: false,
      used_memory: '0',
      connected_clients: 0,
    },
    database: {
      connected: false,
      active_connections: 0,
      max_connections: 0,
    },
    queues: {
      total: 0,
      healthy: 0,
      paused: 0,
    },
    system: {
      platform: os.platform(),
      memory_usage: process.memoryUsage().heapUsed,
      memory_total: os.totalmem(),
      cpu_count: os.cpus().length,
      load_average: os.loadavg(),
    },
  };

  // Check Redis
  try {
    const info = await redis.info('memory');
    const clients = await redis.info('clients');
    health.redis.connected = true;

    const memoryMatch = info.match(/used_memory_human:(.+)/);
    if (memoryMatch) {
      health.redis.used_memory = memoryMatch[1].trim();
    }

    const clientsMatch = clients.match(/connected_clients:(\d+)/);
    if (clientsMatch) {
      health.redis.connected_clients = parseInt(clientsMatch[1]);
    }
  } catch (error) {
    console.error('Redis health check failed:', error);
    health.status = 'degraded';
  }

  // Check Database
  try {
    const dbResult = await query<{ total: string; max: string }>(
      `SELECT
        COUNT(*) as total,
        current_setting('max_connections') as max
      FROM pg_stat_activity
      WHERE state = 'active'`
    );
    health.database.connected = true;
    health.database.active_connections = parseInt(dbResult.rows[0].total);
    health.database.max_connections = parseInt(dbResult.rows[0].max);
  } catch (error) {
    console.error('Database health check failed:', error);
    health.status = 'unhealthy';
  }

  // Check Queues
  try {
    const queueStats = await getQueueStats();
    health.queues.total = queueStats.length;
    health.queues.healthy = queueStats.filter((q) => !q.paused).length;
    health.queues.paused = queueStats.filter((q) => q.paused).length;
  } catch (error) {
    console.error('Queue health check failed:', error);
    health.status = 'degraded';
  }

  return health;
}

// ===== Database Management =====

export async function getDatabaseTables() {
  const result = await query<{ table_name: string; row_count: string }>(
    `SELECT
      table_name,
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
    FROM information_schema.tables t
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name`
  );

  // Get row counts for each table
  const tables = [];
  for (const row of result.rows) {
    try {
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ${row.table_name}`
      );
      tables.push({
        name: row.table_name,
        row_count: parseInt(countResult.rows[0].count),
      });
    } catch (error) {
      tables.push({
        name: row.table_name,
        row_count: 0,
      });
    }
  }

  return tables;
}

export async function getTableData(tableName: string, limit = 50, offset = 0) {
  // Validate table name to prevent SQL injection
  const validTables = await getDatabaseTables();
  if (!validTables.some((t) => t.name === tableName)) {
    throw new Error('Invalid table name');
  }

  // Get table data
  const result = await query(
    `SELECT * FROM ${tableName} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  // Get column info
  const columns = await query(
    `SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position`,
    [tableName]
  );

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ${tableName}`
  );

  return {
    columns: columns.rows,
    rows: result.rows,
    total: parseInt(countResult.rows[0].count),
  };
}

export async function executeReadOnlyQuery(sqlQuery: string) {
  // Validate query is read-only
  const normalizedQuery = sqlQuery.trim().toUpperCase();
  if (
    !normalizedQuery.startsWith('SELECT') &&
    !normalizedQuery.startsWith('WITH') &&
    !normalizedQuery.startsWith('EXPLAIN')
  ) {
    throw new Error('Only SELECT, WITH, and EXPLAIN queries are allowed');
  }

  // Block dangerous keywords
  const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'TRUNCATE', 'ALTER', 'CREATE'];
  if (dangerousKeywords.some((keyword) => normalizedQuery.includes(keyword))) {
    throw new Error('Query contains forbidden keywords');
  }

  try {
    const result = await query(sqlQuery);
    return {
      columns: result.fields.map((f) => ({ name: f.name, type: f.dataTypeID })),
      rows: result.rows,
      rowCount: result.rowCount,
    };
  } catch (error) {
    throw new Error(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
