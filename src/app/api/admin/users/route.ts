import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminAuthService } from '@/lib/admin-auth';
import { queryOne, queryMany } from '@/lib/postgres';
import { AuthService } from '@/lib/auth';

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']).optional(),
  isActive: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
});

// GET /api/admin/users - Get all users with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const admin = await AdminAuthService.authenticateAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const plan = searchParams.get('plan') || '';
    const status = searchParams.get('status') || '';
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    let params: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (plan) {
      paramCount++;
      whereClause += ` AND plan = $${paramCount}`;
      params.push(plan);
    }

    if (status === 'active') {
      whereClause += ' AND is_active = true';
    } else if (status === 'inactive') {
      whereClause += ' AND is_active = false';
    }

    // Get users
    const users = await queryMany(`
      SELECT
        id, email, first_name, last_name, plan, is_admin, is_active,
        email_verified, created_at, updated_at,
        (SELECT COUNT(*) FROM simple_mentions WHERE user_id = simple_users.id) as mention_count
      FROM simple_users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    // Get total count
    const totalResult = await queryOne(`
      SELECT COUNT(*) as total FROM simple_users ${whereClause}
    `, params);

    const total = parseInt(totalResult.total);

    // Get summary statistics
    const stats = await queryOne(`
      SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE is_admin = true) as admin_users,
        COUNT(*) FILTER (WHERE plan = 'BASIC') as basic_users,
        COUNT(*) FILTER (WHERE plan = 'PRO') as pro_users,
        COUNT(*) FILTER (WHERE plan = 'ENTERPRISE') as enterprise_users,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d
      FROM simple_users
    `);

    return NextResponse.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        plan: user.plan,
        isAdmin: user.is_admin,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        mentionCount: parseInt(user.mention_count),
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
      },
      stats: {
        totalUsers: parseInt(stats.total_users),
        activeUsers: parseInt(stats.active_users),
        adminUsers: parseInt(stats.admin_users),
        basicUsers: parseInt(stats.basic_users),
        proUsers: parseInt(stats.pro_users),
        enterpriseUsers: parseInt(stats.enterprise_users),
        newUsers30d: parseInt(stats.new_users_30d),
      },
    });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const admin = await AdminAuthService.authenticateAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const userData = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']).default('BASIC'),
      isAdmin: z.boolean().default(false),
      emailVerified: z.boolean().default(false),
    }).parse(body);

    // Check if user already exists
    const existingUser = await queryOne(
      'SELECT id FROM simple_users WHERE email = $1',
      [userData.email]
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await AuthService.hashPassword(userData.password);

    // Create user
    const user = await queryOne(`
      INSERT INTO simple_users (
        email, password, first_name, last_name, plan,
        is_admin, is_active, email_verified
      )
      VALUES ($1, $2, $3, $4, $5, $6, true, $7)
      RETURNING id, email, first_name, last_name, plan, is_admin, is_active, email_verified, created_at
    `, [
      userData.email,
      hashedPassword,
      userData.firstName,
      userData.lastName,
      userData.plan,
      userData.isAdmin,
      userData.emailVerified
    ]);

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
      }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Admin users POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}