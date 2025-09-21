import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminAuthService } from '@/lib/admin-auth';
import { queryOne, query } from '@/lib/postgres';

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']).optional(),
  isActive: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
});

// GET /api/admin/users/[id] - Get specific user details
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await AdminAuthService.authenticateAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const userId = params.id;

    // Get user details with mention statistics
    const user = await queryOne(`
      SELECT
        u.id, u.email, u.first_name, u.last_name, u.plan, u.is_admin,
        u.is_active, u.email_verified, u.created_at, u.updated_at,
        COUNT(m.id) as mention_count,
        COUNT(m.id) FILTER (WHERE m.sentiment = 'POSITIVE') as positive_mentions,
        COUNT(m.id) FILTER (WHERE m.sentiment = 'NEGATIVE') as negative_mentions,
        COUNT(m.id) FILTER (WHERE m.sentiment = 'NEUTRAL') as neutral_mentions,
        AVG(m.sentiment_score) as avg_sentiment_score
      FROM simple_users u
      LEFT JOIN simple_mentions m ON u.id = m.user_id
      WHERE u.id = $1
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.plan, u.is_admin,
               u.is_active, u.email_verified, u.created_at, u.updated_at
    `, [userId]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get recent mentions
    const recentMentions = await queryOne(`
      SELECT
        id, title, content, url, author, sentiment, sentiment_score,
        published_at, created_at
      FROM simple_mentions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        plan: user.plan,
        isAdmin: user.is_admin,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        statistics: {
          mentionCount: parseInt(user.mention_count),
          positiveMentions: parseInt(user.positive_mentions),
          negativeMentions: parseInt(user.negative_mentions),
          neutralMentions: parseInt(user.neutral_mentions),
          averageSentimentScore: parseFloat(user.avg_sentiment_score) || 0,
        },
        recentMentions: recentMentions || [],
      }
    });
  } catch (error) {
    console.error('Admin user GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id] - Update user
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await AdminAuthService.authenticateAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const userId = params.id;
    const body = await request.json();
    const updateData = updateUserSchema.parse(body);

    // Check if user exists
    const existingUser = await queryOne(
      'SELECT id, email FROM simple_users WHERE id = $1',
      [userId]
    );

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If updating email, check if it's already taken
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await queryOne(
        'SELECT id FROM simple_users WHERE email = $1 AND id != $2',
        [updateData.email, userId]
      );

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already taken' },
          { status: 409 }
        );
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (updateData.email) {
      updateFields.push(`email = $${paramCount++}`);
      values.push(updateData.email);
    }
    if (updateData.firstName) {
      updateFields.push(`first_name = $${paramCount++}`);
      values.push(updateData.firstName);
    }
    if (updateData.lastName) {
      updateFields.push(`last_name = $${paramCount++}`);
      values.push(updateData.lastName);
    }
    if (updateData.plan) {
      updateFields.push(`plan = $${paramCount++}`);
      values.push(updateData.plan);
    }
    if (updateData.isActive !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      values.push(updateData.isActive);
    }
    if (updateData.emailVerified !== undefined) {
      updateFields.push(`email_verified = $${paramCount++}`);
      values.push(updateData.emailVerified);
    }
    if (updateData.isAdmin !== undefined) {
      updateFields.push(`is_admin = $${paramCount++}`);
      values.push(updateData.isAdmin);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(userId);

    const updatedUser = await queryOne(`
      UPDATE simple_users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, plan, is_admin, is_active, email_verified, created_at, updated_at
    `, values);

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        plan: updatedUser.plan,
        isAdmin: updatedUser.is_admin,
        isActive: updatedUser.is_active,
        emailVerified: updatedUser.email_verified,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Admin user PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user and all associated data
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await AdminAuthService.authenticateAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const userId = params.id;

    // Check if user exists
    const existingUser = await queryOne(
      'SELECT id, email FROM simple_users WHERE id = $1',
      [userId]
    );

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admin from deleting themselves
    if (userId === admin.userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own admin account' },
        { status: 400 }
      );
    }

    // Delete user and all associated data (cascade will handle mentions)
    await query('DELETE FROM simple_users WHERE id = $1', [userId]);

    return NextResponse.json({
      success: true,
      message: `User ${existingUser.email} and all associated data deleted successfully`
    });
  } catch (error) {
    console.error('Admin user DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}