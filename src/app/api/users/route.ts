import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth';
import { queryOne } from '@/lib/postgres';

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

// GET /api/users - Get current user profile
export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await queryOne(
      'SELECT id, email, first_name, last_name, plan, is_admin, is_active, email_verified, created_at, updated_at FROM simple_users WHERE id = $1',
      [user.userId]
    );

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        plan: userData.plan,
        isAdmin: userData.is_admin,
        isActive: userData.is_active,
        emailVerified: userData.email_verified,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at,
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/users - Update current user profile
export async function PUT(request: NextRequest) {
  try {
    const user = await AuthService.authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updateData = updateUserSchema.parse(body);

    // If updating email, check if it's already taken
    if (updateData.email) {
      const existingUser = await queryOne(
        'SELECT id FROM simple_users WHERE email = $1 AND id != $2',
        [updateData.email, user.userId]
      );

      if (existingUser) {
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

    if (updateData.firstName) {
      updateFields.push(`first_name = $${paramCount++}`);
      values.push(updateData.firstName);
    }
    if (updateData.lastName) {
      updateFields.push(`last_name = $${paramCount++}`);
      values.push(updateData.lastName);
    }
    if (updateData.email) {
      updateFields.push(`email = $${paramCount++}`);
      values.push(updateData.email);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(user.userId);

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

    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users - Delete current user account
export async function DELETE(request: NextRequest) {
  try {
    const user = await AuthService.authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete - mark as inactive instead of hard delete
    await queryOne(
      'UPDATE simple_users SET is_active = false, updated_at = NOW() WHERE id = $1',
      [user.userId]
    );

    const response = NextResponse.json({
      success: true,
      message: 'Account deactivated successfully'
    });

    // Clear auth cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}