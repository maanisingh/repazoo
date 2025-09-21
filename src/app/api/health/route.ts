import { NextRequest, NextResponse } from 'next/server';
import { healthCheck } from '@/lib/postgres';

export async function GET(request: NextRequest) {
  try {
    const dbHealth = await healthCheck();

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      version: '0.1.0',
      backend: 'PostgreSQL Direct'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}