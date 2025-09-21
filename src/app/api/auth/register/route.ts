import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService, AuthRateLimit } from '@/lib/auth';
import { queryOne, query } from '@/lib/postgres';
import { EmailService } from '@/lib/email';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']).default('BASIC'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, plan } = registerSchema.parse(body);

    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    if (!AuthRateLimit.checkRateLimit(`register:${clientIP}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Check if user already exists
    const existingUser = await queryOne(
      'SELECT id FROM simple_users WHERE email = $1',
      [email]
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await AuthService.hashPassword(password);

    // Create user
    const user = await queryOne(`
      INSERT INTO simple_users (email, password, first_name, last_name, plan, is_active, email_verified)
      VALUES ($1, $2, $3, $4, $5, true, false)
      RETURNING id, email, first_name, last_name, plan
    `, [email, hashedPassword, firstName, lastName, plan]);

    // Generate JWT token
    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
      isAdmin: false,
      plan: user.plan || 'BASIC'
    });

    // Return user data
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        plan: user.plan,
        isAdmin: false,
      },
      token,
    }, { status: 201 });

    // Set HTTP-only cookie with JWT token
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    // Start email verification workflow using Temporal
    try {
      const { TemporalService } = await import('@/temporal/services/temporal-service');
      await TemporalService.startEmailVerificationWorkflow({
        userId: user.id,
        email,
        firstName,
        maxResendAttempts: 3,
        resendDelayMinutes: 60,
      });
      console.log(`Started email verification workflow for user ${user.id}`);
    } catch (error) {
      console.error('Failed to start email verification workflow:', error);
      // Fallback to the old method if Temporal is not available
      setTimeout(async () => {
        try {
          const verificationToken = await EmailService.generateVerificationToken(user.id);
          await EmailService.sendVerificationEmail(email, firstName, verificationToken);
        } catch (error) {
          console.error('Failed to send verification email:', error);
        }
      }, 100);
    }

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}