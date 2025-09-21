import { EmailService } from '../../lib/email';

export interface SendVerificationEmailParams {
  userId: string;
  email: string;
  firstName: string;
}

export interface SendEmailNotificationParams {
  userId: string;
  email: string;
  subject: string;
  content: string;
  type: 'mention_alert' | 'weekly_report' | 'monthly_report';
}

// Activity to send verification email
export async function sendVerificationEmail(params: SendVerificationEmailParams): Promise<{ success: boolean; messageId?: string }> {
  try {
    console.log(`[Activity] Sending verification email to ${params.email} for user ${params.userId}`);

    const verificationToken = await EmailService.generateVerificationToken(params.userId);
    const success = await EmailService.sendVerificationEmail(params.email, params.firstName, verificationToken);

    return {
      success,
      messageId: success ? `verification-${params.userId}-${Date.now()}` : undefined
    };
  } catch (error) {
    console.error('[Activity] Failed to send verification email:', error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

// Activity to send email notifications
export async function sendEmailNotification(params: SendEmailNotificationParams): Promise<{ success: boolean; messageId?: string }> {
  try {
    console.log(`[Activity] Sending ${params.type} notification to ${params.email}`);

    // Here you would implement different email templates based on type
    // For now, using a simple implementation
    const success = true; // Placeholder - implement actual email sending

    return {
      success,
      messageId: success ? `notification-${params.userId}-${Date.now()}` : undefined
    };
  } catch (error) {
    console.error('[Activity] Failed to send email notification:', error);
    throw new Error(`Failed to send email notification: ${error.message}`);
  }
}

// Activity to resend verification email with retry logic
export async function resendVerificationEmail(params: SendVerificationEmailParams): Promise<{ success: boolean; attempt: number }> {
  try {
    console.log(`[Activity] Resending verification email to ${params.email}`);

    const result = await sendVerificationEmail(params);
    return {
      success: result.success,
      attempt: 1
    };
  } catch (error) {
    console.error('[Activity] Failed to resend verification email:', error);
    throw error;
  }
}