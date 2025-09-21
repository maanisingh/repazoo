import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email';

// GET /api/verify-email?token=xxx - Verify email address
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    const result = await EmailService.verifyEmailToken(token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Signal the Temporal workflow that email is verified
    if (result.userId) {
      try {
        const { TemporalService } = await import('@/temporal/services/temporal-service');
        await TemporalService.markEmailAsVerified(result.userId);
        console.log(`Signaled email verification completion for user ${result.userId}`);
      } catch (error) {
        console.error('Failed to signal email verification workflow:', error);
        // Don't fail the verification if Temporal signaling fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now access all features.'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}

// POST /api/verify-email - Resend verification email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists and is not already verified
    const { queryOne } = await import('@/lib/postgres');
    const user = await queryOne(
      'SELECT id, first_name, email_verified FROM simple_users WHERE email = $1',
      [email]
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.email_verified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Generate new verification token and send email
    const verificationToken = await EmailService.generateVerificationToken(user.id);
    const emailSent = await EmailService.sendVerificationEmail(
      email,
      user.first_name || 'User',
      verificationToken
    );

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully',
      emailSent
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}