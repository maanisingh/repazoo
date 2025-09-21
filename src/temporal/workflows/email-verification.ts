import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  condition,
  sleep,
} from '@temporalio/workflow';
import type * as activities from '../activities/email';

// Configure activity options
const { sendVerificationEmail, resendVerificationEmail } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 seconds',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '30 seconds',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export interface EmailVerificationWorkflowParams {
  userId: string;
  email: string;
  firstName: string;
  maxResendAttempts?: number;
  resendDelayMinutes?: number;
}

export interface EmailVerificationStatus {
  sent: boolean;
  resendCount: number;
  lastSentAt?: string;
  verified: boolean;
  completedAt?: string;
}

// Signals for external communication
export const emailVerifiedSignal = defineSignal<[]>('emailVerified');
export const resendEmailSignal = defineSignal<[]>('resendEmail');

// Queries to check workflow status
export const getStatusQuery = defineQuery<EmailVerificationStatus>('getStatus');

export async function emailVerificationWorkflow(
  params: EmailVerificationWorkflowParams
): Promise<EmailVerificationStatus> {
  let status: EmailVerificationStatus = {
    sent: false,
    resendCount: 0,
    verified: false,
  };

  const maxResends = params.maxResendAttempts || 3;
  const resendDelay = params.resendDelayMinutes || 60; // 1 hour default

  // Set up signal and query handlers
  setHandler(emailVerifiedSignal, () => {
    status.verified = true;
    status.completedAt = new Date().toISOString();
  });

  setHandler(resendEmailSignal, () => void 0); // Will trigger resend in main loop

  setHandler(getStatusQuery, () => status);

  try {
    // Send initial verification email
    console.log(`[Workflow] Starting email verification for user ${params.userId}`);

    const initialResult = await sendVerificationEmail({
      userId: params.userId,
      email: params.email,
      firstName: params.firstName,
    });

    status.sent = initialResult.success;
    status.lastSentAt = new Date().toISOString();

    if (!initialResult.success) {
      console.log(`[Workflow] Email sending failed but continuing workflow for testing...`);
      // For testing purposes, continue even if email fails
      status.sent = false;
    }

    console.log(`[Workflow] Initial verification email sent to ${params.email}`);

    // Wait for email verification or handle resend requests
    let shouldContinue = true;

    while (shouldContinue && !status.verified && status.resendCount < maxResends) {
      // Wait for either verification signal, resend signal, or timeout
      const signalReceived = await condition(
        () => status.verified || status.resendCount < maxResends,
        `${resendDelay} minutes` // Wait for the resend delay period
      );

      if (status.verified) {
        console.log(`[Workflow] Email verified for user ${params.userId}`);
        shouldContinue = false;
        break;
      }

      // Check if we should resend (either by signal or timeout)
      if (status.resendCount < maxResends) {
        try {
          console.log(`[Workflow] Resending verification email (attempt ${status.resendCount + 1})`);

          const resendResult = await resendVerificationEmail({
            userId: params.userId,
            email: params.email,
            firstName: params.firstName,
          });

          if (resendResult.success) {
            status.resendCount++;
            status.lastSentAt = new Date().toISOString();
            console.log(`[Workflow] Verification email resent (${status.resendCount}/${maxResends})`);
          } else {
            console.error(`[Workflow] Failed to resend verification email`);
          }
        } catch (error) {
          console.error(`[Workflow] Error resending verification email:`, error);
          status.resendCount++; // Count failed attempts
        }
      } else {
        console.log(`[Workflow] Max resend attempts (${maxResends}) reached for user ${params.userId}`);
        shouldContinue = false;
      }
    }

    // Final check - wait up to 24 hours for verification after last send
    if (!status.verified) {
      console.log(`[Workflow] Waiting 24 hours for final verification chance`);
      await condition(() => status.verified, '24 hours');
    }

    if (status.verified) {
      console.log(`[Workflow] Email verification completed for user ${params.userId}`);
    } else {
      console.log(`[Workflow] Email verification timed out for user ${params.userId}`);
    }

  } catch (error) {
    console.error(`[Workflow] Email verification workflow failed:`, error);
    throw error;
  }

  return status;
}