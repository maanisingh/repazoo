import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  condition,
  sleep,
  startChild,
  ChildWorkflowOptions,
} from '@temporalio/workflow';
import type * as emailActivities from '../activities/email';

// Configure activity options
const { sendEmailNotification } = proxyActivities<typeof emailActivities>({
  startToCloseTimeout: '30 seconds',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '30 seconds',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export interface NotificationWorkflowParams {
  userId: string;
  userEmail: string;
  notificationType: 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
}

export interface NotificationStatus {
  enabled: boolean;
  lastSentAt?: string;
  nextScheduledAt?: string;
  totalSent: number;
  failedAttempts: number;
}

// Signals for controlling notifications
export const enableNotificationsSignal = defineSignal<[]>('enableNotifications');
export const disableNotificationsSignal = defineSignal<[]>('disableNotifications');
export const sendImmediateReportSignal = defineSignal<[]>('sendImmediateReport');

// Queries for checking status
export const getNotificationStatusQuery = defineQuery<NotificationStatus>('getNotificationStatus');

export async function notificationWorkflow(
  params: NotificationWorkflowParams
): Promise<void> {
  let status: NotificationStatus = {
    enabled: params.enabled,
    totalSent: 0,
    failedAttempts: 0,
  };

  let isEnabled = params.enabled;
  let sendImmediate = false;

  // Calculate interval based on notification type
  const getIntervalHours = (type: string): number => {
    switch (type) {
      case 'daily': return 24;
      case 'weekly': return 24 * 7;
      case 'monthly': return 24 * 30;
      default: return 24;
    }
  };

  const intervalHours = getIntervalHours(params.notificationType);

  // Set up signal handlers
  setHandler(enableNotificationsSignal, () => {
    isEnabled = true;
    status.enabled = true;
    console.log(`[Workflow] Notifications enabled for user ${params.userId}`);
  });

  setHandler(disableNotificationsSignal, () => {
    isEnabled = false;
    status.enabled = false;
    console.log(`[Workflow] Notifications disabled for user ${params.userId}`);
  });

  setHandler(sendImmediateReportSignal, () => {
    sendImmediate = true;
    console.log(`[Workflow] Immediate report requested for user ${params.userId}`);
  });

  setHandler(getNotificationStatusQuery, () => status);

  console.log(`[Workflow] Starting ${params.notificationType} notification workflow for user ${params.userId}`);

  try {
    while (true) {
      // Calculate next scheduled time
      status.nextScheduledAt = new Date(Date.now() + intervalHours * 60 * 60 * 1000).toISOString();

      // Wait for the interval or immediate send signal
      await condition(() => sendImmediate || !isEnabled, `${intervalHours} hours`);

      // Reset immediate send flag
      if (sendImmediate) {
        sendImmediate = false;
      }

      // Skip if disabled (unless immediate send was requested)
      if (!isEnabled && !sendImmediate) {
        console.log(`[Workflow] Notifications disabled, skipping for user ${params.userId}`);
        continue;
      }

      // Generate and send the report
      try {
        console.log(`[Workflow] Generating ${params.notificationType} report for user ${params.userId}`);

        // Generate report content based on type
        const reportContent = await generateReportContent(params.userId, params.notificationType);

        // Send the notification
        const result = await sendEmailNotification({
          userId: params.userId,
          email: params.userEmail,
          subject: `Your ${params.notificationType.charAt(0).toUpperCase() + params.notificationType.slice(1)} RepAZoo Report`,
          content: reportContent,
          type: `${params.notificationType}_report` as any,
        });

        if (result.success) {
          status.totalSent++;
          status.lastSentAt = new Date().toISOString();
          console.log(`[Workflow] ${params.notificationType} report sent successfully to ${params.userEmail}`);
        } else {
          status.failedAttempts++;
          console.error(`[Workflow] Failed to send ${params.notificationType} report to ${params.userEmail}`);
        }

      } catch (error) {
        status.failedAttempts++;
        console.error(`[Workflow] Error sending ${params.notificationType} report:`, error);
      }

      // Add some randomization to prevent all users from sending at the same time
      const randomDelay = Math.floor(Math.random() * 60); // 0-59 minutes
      if (randomDelay > 0) {
        await sleep(`${randomDelay} minutes`);
      }
    }

  } catch (error) {
    console.error(`[Workflow] Notification workflow failed for user ${params.userId}:`, error);
    throw error;
  }
}

// Helper function to generate report content
async function generateReportContent(userId: string, reportType: string): Promise<string> {
  // This would typically query the database for user's mention data
  // For now, return a simple template

  const timeframe = reportType === 'daily' ? 'yesterday' :
                   reportType === 'weekly' ? 'this week' : 'this month';

  return `
    <h2>Your ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} RepAZoo Report</h2>

    <p>Here's a summary of your reputation monitoring for ${timeframe}:</p>

    <ul>
      <li><strong>New Mentions:</strong> 0</li>
      <li><strong>Positive Sentiment:</strong> 0%</li>
      <li><strong>Negative Sentiment:</strong> 0%</li>
      <li><strong>Neutral Sentiment:</strong> 0%</li>
      <li><strong>Overall Reputation Score:</strong> N/A</li>
    </ul>

    <p>You can view detailed analytics and manage your monitoring sources at your RepAZoo dashboard.</p>

    <p>Best regards,<br>The RepAZoo Team</p>
  `;
}

// Workflow to manage all notification types for a user
export async function userNotificationManagerWorkflow(
  userId: string,
  userEmail: string,
  enabledNotifications: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
  }
): Promise<void> {
  console.log(`[Workflow] Starting notification manager for user ${userId}`);

  const getWorkflowId = (type: string) => `notification-${type}-${userId}`;

  try {
    // Start child workflows for each notification type
    const childWorkflows = await Promise.all([
      enabledNotifications.daily ? startChild(notificationWorkflow, {
        args: [{
          userId,
          userEmail,
          notificationType: 'daily',
          enabled: true,
        }],
        workflowId: getWorkflowId('daily'),
      }) : null,

      enabledNotifications.weekly ? startChild(notificationWorkflow, {
        args: [{
          userId,
          userEmail,
          notificationType: 'weekly',
          enabled: true,
        }],
        workflowId: getWorkflowId('weekly'),
      }) : null,

      enabledNotifications.monthly ? startChild(notificationWorkflow, {
        args: [{
          userId,
          userEmail,
          notificationType: 'monthly',
          enabled: true,
        }],
        workflowId: getWorkflowId('monthly'),
      }) : null,
    ]);

    console.log(`[Workflow] Child notification workflows started for user ${userId}`);

    // Keep the manager workflow alive
    // In a real implementation, you might want to handle signals to start/stop child workflows
    await condition(() => false, '365 days'); // Run for a year then restart

  } catch (error) {
    console.error(`[Workflow] Notification manager workflow failed for user ${userId}:`, error);
    throw error;
  }
}