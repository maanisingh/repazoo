import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { queryOne } from '@/lib/postgres';

export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get fresh user data from database
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