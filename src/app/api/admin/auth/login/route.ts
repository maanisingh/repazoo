import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService, AuthRateLimit } from '@/lib/auth';
import { queryOne } from '@/lib/postgres';

const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = adminLoginSchema.parse(body);

    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    if (!AuthRateLimit.checkRateLimit(`admin-login:${clientIP}`, 3, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many admin login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Find admin user in database
    const user = await queryOne(
      'SELECT id, email, password, first_name, last_name, plan, is_admin FROM simple_users WHERE email = $1 AND is_admin = true',
      [email]
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await AuthService.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token with admin flag
    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      isAdmin: true,
      plan: user.plan || 'ENTERPRISE'
    });

    // Return admin user data
    const response = NextResponse.json({
      success: true,
      admin: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        plan: user.plan || 'ENTERPRISE',
        isAdmin: true,
      },
      token,
    });

    // Set HTTP-only cookie with JWT token
    response.cookies.set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60, // 8 hours for admin sessions
      path: '/admin',
    });

    // Reset rate limit on successful login
    AuthRateLimit.resetRateLimit(`admin-login:${clientIP}`);

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}