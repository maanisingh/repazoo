import { Pool } from 'pg';

// Create a connection pool
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'repazoo_db',
  user: 'repazoo',
  password: 'repazoo123',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

export default pool;

// Helper function for queries
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper function for single row queries
export async function queryOne(text: string, params?: any[]) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

// Helper function for multiple row queries
export async function queryMany(text: string, params?: any[]) {
  const result = await query(text, params);
  return result.rows;
}

// Database health check
export async function healthCheck() {
  try {
    await query('SELECT 1 as health');
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    throw new Error(`Database health check failed: ${error}`);
  }
}