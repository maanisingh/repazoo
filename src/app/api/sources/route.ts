import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/auth';
import { queryMany, queryOne } from '../../../lib/postgres';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's monitoring sources
    const sources = await queryMany(`
      SELECT
        id,
        name,
        url,
        source_type,
        is_active,
        scan_frequency,
        last_scanned,
        total_mentions,
        created_at,
        updated_at
      FROM user_monitoring_sources
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [authResult.user.id]);

    // Get source statistics
    const stats = await queryMany(`
      SELECT
        source,
        source_type,
        COUNT(*) as total_mentions,
        COUNT(CASE WHEN sentiment = 'POSITIVE' THEN 1 END) as positive_mentions,
        COUNT(CASE WHEN sentiment = 'NEGATIVE' THEN 1 END) as negative_mentions,
        COUNT(CASE WHEN sentiment = 'NEUTRAL' THEN 1 END) as neutral_mentions,
        AVG(sentiment_score) as avg_sentiment_score,
        MAX(created_at) as last_mention
      FROM simple_mentions
      WHERE user_id = $1
      GROUP BY source, source_type
      ORDER BY total_mentions DESC
    `, [authResult.user.id]);

    return NextResponse.json({
      sources,
      stats,
      totalSources: sources.length,
      activeSources: sources.filter((s: any) => s.is_active).length
    });

  } catch (error) {
    console.error('[Sources API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, url, sourceType, scanFrequency } = await request.json();

    if (!name || !url || !sourceType) {
      return NextResponse.json({
        error: 'Name, URL, and sourceType are required'
      }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Check if source already exists for this user
    const existing = await queryOne(
      'SELECT id FROM user_monitoring_sources WHERE user_id = $1 AND url = $2',
      [authResult.user.id, url]
    );

    if (existing) {
      return NextResponse.json({
        error: 'Source with this URL already exists'
      }, { status: 409 });
    }

    // Insert new monitoring source
    const newSource = await queryOne(`
      INSERT INTO user_monitoring_sources (
        user_id, name, url, source_type, scan_frequency, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING id, name, url, source_type, scan_frequency, is_active, created_at
    `, [
      authResult.user.id,
      name,
      url,
      sourceType,
      scanFrequency || 'DAILY'
    ]);

    console.log(`[Sources API] Created new source: ${name} for user ${authResult.user.id}`);

    return NextResponse.json({
      success: true,
      source: newSource
    }, { status: 201 });

  } catch (error) {
    console.error('[Sources API] Error creating source:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, url, sourceType, scanFrequency, isActive } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Source ID is required' }, { status: 400 });
    }

    // Verify source belongs to user
    const source = await queryOne(
      'SELECT id FROM user_monitoring_sources WHERE id = $1 AND user_id = $2',
      [id, authResult.user.id]
    );

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (url !== undefined) {
      updates.push(`url = $${paramIndex++}`);
      values.push(url);
    }
    if (sourceType !== undefined) {
      updates.push(`source_type = $${paramIndex++}`);
      values.push(sourceType);
    }
    if (scanFrequency !== undefined) {
      updates.push(`scan_frequency = $${paramIndex++}`);
      values.push(scanFrequency);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, authResult.user.id);

    const updatedSource = await queryOne(`
      UPDATE user_monitoring_sources
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING id, name, url, source_type, scan_frequency, is_active, updated_at
    `, values);

    console.log(`[Sources API] Updated source ${id} for user ${authResult.user.id}`);

    return NextResponse.json({
      success: true,
      source: updatedSource
    });

  } catch (error) {
    console.error('[Sources API] Error updating source:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('id');

    if (!sourceId) {
      return NextResponse.json({ error: 'Source ID is required' }, { status: 400 });
    }

    // Verify source belongs to user
    const source = await queryOne(
      'SELECT id, name FROM user_monitoring_sources WHERE id = $1 AND user_id = $2',
      [sourceId, authResult.user.id]
    );

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Delete the source
    await queryOne(
      'DELETE FROM user_monitoring_sources WHERE id = $1 AND user_id = $2',
      [sourceId, authResult.user.id]
    );

    console.log(`[Sources API] Deleted source ${source.name} (${sourceId}) for user ${authResult.user.id}`);

    return NextResponse.json({
      success: true,
      message: `Source "${source.name}" deleted successfully`
    });

  } catch (error) {
    console.error('[Sources API] Error deleting source:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}