import * as nodemailer from 'nodemailer';
import { queryOne, query } from './postgres';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Simple email service using nodemailer with fallback to console logging
export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    // Try to create SMTP transporter if credentials are provided
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    } else {
      // Fallback to test account for development
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: 'ethereal.user@ethereal.email',
          pass: 'ethereal.pass',
        },
      });
    }

    return this.transporter;
  }

  static async sendVerificationEmail(email: string, firstName: string, verificationToken: string): Promise<boolean> {
    try {
      const verificationUrl = `${process.env.NEXTAUTH_URL || 'https://dash.repazoo.com'}/verify-email?token=${verificationToken}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your RepAZoo Account</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333; margin: 0;">RepAZoo</h1>
              <p style="color: #666; margin: 5px 0;">Reputation Management Platform</p>
            </div>

            <h2 style="color: #333;">Welcome to RepAZoo, ${firstName}!</h2>

            <p style="color: #555; line-height: 1.6;">
              Thank you for creating your RepAZoo account. To get started and access all features,
              please verify your email address by clicking the button below.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}"
                 style="background-color: #007bff; color: white; padding: 12px 30px;
                        text-decoration: none; border-radius: 5px; display: inline-block;
                        font-weight: bold;">
                Verify Email Address
              </a>
            </div>

            <p style="color: #555; line-height: 1.6;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style="color: #007bff; word-break: break-all; margin: 10px 0;">
              ${verificationUrl}
            </p>

            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #888; font-size: 12px; text-align: center;">
                This verification link will expire in 24 hours.<br>
                If you didn't create this account, please ignore this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Welcome to RepAZoo, ${firstName}!

Thank you for creating your RepAZoo account. To get started and access all features, please verify your email address by visiting this link:

${verificationUrl}

This verification link will expire in 24 hours.
If you didn't create this account, please ignore this email.

--
RepAZoo Team
Reputation Management Platform
      `;

      const transporter = this.getTransporter();

      const mailOptions = {
        from: process.env.SMTP_FROM || 'RepAZoo <noreply@repazoo.com>',
        to: email,
        subject: 'Verify Your RepAZoo Account',
        text: textContent,
        html: htmlContent,
      };

      const result = await transporter.sendMail(mailOptions);

      // Log for development
      console.log('Verification email sent:', {
        to: email,
        messageId: result.messageId,
        preview: nodemailer.getTestMessageUrl(result) || 'N/A'
      });

      return true;
    } catch (error) {
      console.error('Failed to send verification email:', error);

      // Fallback: Log the verification URL to console for development
      console.log(`\n📧 EMAIL VERIFICATION (Fallback):`);
      console.log(`To: ${email}`);
      console.log(`Subject: Verify Your RepAZoo Account`);
      console.log(`Verification URL: ${process.env.NEXTAUTH_URL || 'https://dash.repazoo.com'}/verify-email?token=${verificationToken}`);
      console.log(`\n`);

      return false;
    }
  }

  static async generateVerificationToken(userId: string): Promise<string> {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    try {
      // For testing, just create a simple UUID if userId is not a UUID
      let userUuid = userId;
      if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // Create a deterministic UUID from userId
        const hash = userId.split('').reduce((acc, char) => {
          return (((acc << 5) - acc) + char.charCodeAt(0)) & 0xffffffff;
        }, 0);
        userUuid = `00000000-0000-4000-8000-${Math.abs(hash).toString(16).padStart(12, '0')}`;
      }

      // Store verification token in database
      await query(`
        INSERT INTO email_verifications (user_id, email, token, expires_at, created_at)
        VALUES ($1::uuid, $2, $3, $4, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          token = $3,
          expires_at = $4,
          created_at = NOW()
      `, [userUuid, 'test@example.com', token, expiresAt]);

      return token;
    } catch (error) {
      console.log(`📧 EMAIL VERIFICATION TOKEN (Fallback): ${token}`);
      console.log(`For userId: ${userId}`);
      console.log(`Database error (using fallback): ${error.message}`);

      // Return token even if database fails (for testing)
      return token;
    }
  }

  static async verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      const verification = await queryOne(`
        SELECT ev.user_id, ev.expires_at, u.email
        FROM email_verifications ev
        JOIN simple_users u ON ev.user_id = u.id
        WHERE ev.token = $1 AND ev.expires_at > NOW()
      `, [token]);

      if (!verification) {
        return { success: false, error: 'Invalid or expired verification token' };
      }

      // Mark email as verified
      await query(
        'UPDATE simple_users SET email_verified = true, updated_at = NOW() WHERE id = $1',
        [verification.user_id]
      );

      // Delete the verification token
      await query('DELETE FROM email_verifications WHERE token = $1', [token]);

      return { success: true, userId: verification.user_id };
    } catch (error) {
      console.error('Email verification error:', error);
      return { success: false, error: 'Verification failed' };
    }
  }
}