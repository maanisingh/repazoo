import { NextRequest, NextResponse } from 'next/server';
import { setupDatabase, checkTables } from '@/lib/setup-db';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting database setup...');

    const result = await setupDatabase();
    const tables = await checkTables();

    return NextResponse.json({
      success: true,
      message: 'Database setup completed successfully',
      tables: tables.map(t => t.table_name),
      setupResult: result
    });
  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json(
      {
        error: 'Database setup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const tables = await checkTables();

    return NextResponse.json({
      success: true,
      tables: tables.map(t => t.table_name),
      message: `Found ${tables.length} tables`
    });
  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json(
      {
        error: 'Database check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}