import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth';
import { queryOne, queryMany } from '@/lib/postgres';

const createMentionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  url: z.string().url('Valid URL is required'),
  author: z.string().optional(),
  sentiment: z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL']).default('NEUTRAL'),
  sentimentScore: z.number().min(-1).max(1).default(0),
});

// GET /api/mentions - Get mentions for authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sentiment = searchParams.get('sentiment');
    const search = searchParams.get('search');

    let whereClause = 'WHERE user_id = $1';
    let params: any[] = [user.userId];
    let paramCount = 1;

    if (sentiment) {
      paramCount++;
      whereClause += ` AND sentiment = $${paramCount}`;
      params.push(sentiment);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (title ILIKE $${paramCount} OR content ILIKE $${paramCount} OR author ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Get mentions
    const mentions = await queryMany(`
      SELECT id, title, content, url, author, sentiment, sentiment_score, published_at, created_at
      FROM simple_mentions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    // Get total count
    const totalResult = await queryOne(`
      SELECT COUNT(*) as total FROM simple_mentions ${whereClause}
    `, params);

    const total = parseInt(totalResult.total);

    return NextResponse.json({
      success: true,
      mentions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('GET mentions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/mentions - Create new mention
export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const mentionData = createMentionSchema.parse(body);

    // Check if mention with same URL already exists for this user
    const existingMention = await queryOne(
      'SELECT id FROM simple_mentions WHERE user_id = $1 AND url = $2',
      [user.userId, mentionData.url]
    );

    if (existingMention) {
      return NextResponse.json(
        { error: 'Mention with this URL already exists' },
        { status: 409 }
      );
    }

    const mention = await queryOne(`
      INSERT INTO simple_mentions (
        user_id, title, content, url, author, sentiment, sentiment_score
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
      RETURNING id, title, content, url, author, sentiment, sentiment_score, published_at, created_at
    `, [
      user.userId,
      mentionData.title,
      mentionData.content,
      mentionData.url,
      mentionData.author,
      mentionData.sentiment,
      mentionData.sentimentScore
    ]);

    return NextResponse.json({
      success: true,
      mention
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('POST mentions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/mentions - Delete mention
export async function DELETE(request: NextRequest) {
  try {
    const user = await AuthService.authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mentionId = searchParams.get('id');

    if (!mentionId) {
      return NextResponse.json({ error: 'Mention ID is required' }, { status: 400 });
    }

    // Verify mention belongs to user and delete
    const result = await queryOne(
      'DELETE FROM simple_mentions WHERE id = $1 AND user_id = $2 RETURNING id',
      [mentionId, user.userId]
    );

    if (!result) {
      return NextResponse.json({ error: 'Mention not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Mention deleted successfully'
    });
  } catch (error) {
    console.error('DELETE mentions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}