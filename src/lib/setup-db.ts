import { query } from './postgres';
import * as fs from 'fs';
import * as path from 'path';

export async function setupDatabase() {
  try {
    console.log('Setting up simple database schema...');

    // Read the schema SQL file
    const schemaPath = path.join(process.cwd(), 'src/lib/simple-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Execute the schema
    await query(schemaSql);

    console.log('Database schema setup completed successfully!');
    return { success: true, message: 'Database schema setup completed' };
  } catch (error) {
    console.error('Database setup failed:', error);
    throw error;
  }
}

// Function to check if tables exist
export async function checkTables() {
  try {
    const tables = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    return tables.rows;
  } catch (error) {
    console.error('Error checking tables:', error);
    throw error;
  }
}