import { getTemporalClient } from '../client';
import {
  emailVerificationWorkflow,
  emailVerifiedSignal,
  resendEmailSignal,
  getStatusQuery,
  type EmailVerificationWorkflowParams,
} from '../workflows/email-verification';
import {
  monitoringWorkflow,
  pauseMonitoringSignal,
  resumeMonitoringSignal,
  forceScenSignal,
  getMonitoringStatusQuery,
  type MonitoringWorkflowParams,
} from '../workflows/monitoring';
import {
  notificationWorkflow,
  userNotificationManagerWorkflow,
  enableNotificationsSignal,
  disableNotificationsSignal,
  sendImmediateReportSignal,
  type NotificationWorkflowParams,
} from '../workflows/notifications';

export class TemporalService {
  static async startEmailVerificationWorkflow(params: EmailVerificationWorkflowParams): Promise<string> {
    try {
      const client = await getTemporalClient();
      const workflowId = `email-verification-${params.userId}`;

      const handle = await client.workflow.start(emailVerificationWorkflow, {
        args: [params],
        taskQueue: 'repazoo-tasks',
        workflowId,
        // Email verification should complete within 7 days
        workflowExecutionTimeout: '7 days',
      });

      console.log(`Started email verification workflow for user ${params.userId} with ID: ${workflowId}`);
      return workflowId;
    } catch (error) {
      console.error('Failed to start email verification workflow:', error);
      throw error;
    }
  }

  static async markEmailAsVerified(userId: string): Promise<void> {
    try {
      const client = await getTemporalClient();
      const workflowId = `email-verification-${userId}`;

      const handle = client.workflow.getHandle(workflowId);
      await handle.signal(emailVerifiedSignal);

      console.log(`Marked email as verified for user ${userId}`);
    } catch (error) {
      console.error(`Failed to mark email as verified for user ${userId}:`, error);
      // Don't throw - this is not critical if the workflow doesn't exist
    }
  }

  static async resendVerificationEmail(userId: string): Promise<void> {
    try {
      const client = await getTemporalClient();
      const workflowId = `email-verification-${userId}`;

      const handle = client.workflow.getHandle(workflowId);
      await handle.signal(resendEmailSignal);

      console.log(`Triggered resend verification email for user ${userId}`);
    } catch (error) {
      console.error(`Failed to trigger resend for user ${userId}:`, error);
      throw error;
    }
  }

  static async getEmailVerificationStatus(userId: string) {
    try {
      const client = await getTemporalClient();
      const workflowId = `email-verification-${userId}`;

      const handle = client.workflow.getHandle(workflowId);
      const status = await handle.query(getStatusQuery);

      return status;
    } catch (error) {
      console.error(`Failed to get email verification status for user ${userId}:`, error);
      return null;
    }
  }

  static async startMonitoringWorkflow(params: MonitoringWorkflowParams): Promise<string> {
    try {
      const client = await getTemporalClient();
      const workflowId = `monitoring-${params.userId}`;

      const handle = await client.workflow.start(monitoringWorkflow, {
        args: [params],
        taskQueue: 'repazoo-tasks',
        workflowId,
        // Long-running workflow, will continue as new when needed
        workflowExecutionTimeout: '30 days',
      });

      console.log(`Started monitoring workflow for user ${params.userId} with ID: ${workflowId}`);
      return workflowId;
    } catch (error) {
      console.error('Failed to start monitoring workflow:', error);
      throw error;
    }
  }

  static async pauseMonitoring(userId: string): Promise<void> {
    try {
      const client = await getTemporalClient();
      const workflowId = `monitoring-${userId}`;

      const handle = client.workflow.getHandle(workflowId);
      await handle.signal(pauseMonitoringSignal);

      console.log(`Paused monitoring for user ${userId}`);
    } catch (error) {
      console.error(`Failed to pause monitoring for user ${userId}:`, error);
      throw error;
    }
  }

  static async resumeMonitoring(userId: string): Promise<void> {
    try {
      const client = await getTemporalClient();
      const workflowId = `monitoring-${userId}`;

      const handle = client.workflow.getHandle(workflowId);
      await handle.signal(resumeMonitoringSignal);

      console.log(`Resumed monitoring for user ${userId}`);
    } catch (error) {
      console.error(`Failed to resume monitoring for user ${userId}:`, error);
      throw error;
    }
  }

  static async forceScan(userId: string): Promise<void> {
    try {
      const client = await getTemporalClient();
      const workflowId = `monitoring-${userId}`;

      const handle = client.workflow.getHandle(workflowId);
      await handle.signal(forceScenSignal);

      console.log(`Triggered force scan for user ${userId}`);
    } catch (error) {
      console.error(`Failed to trigger force scan for user ${userId}:`, error);
      throw error;
    }
  }

  static async getMonitoringStatus(userId: string) {
    try {
      const client = await getTemporalClient();
      const workflowId = `monitoring-${userId}`;

      const handle = client.workflow.getHandle(workflowId);
      const status = await handle.query(getMonitoringStatusQuery);

      return status;
    } catch (error) {
      console.error(`Failed to get monitoring status for user ${userId}:`, error);
      return null;
    }
  }

  static async startNotificationWorkflows(
    userId: string,
    userEmail: string,
    enabledNotifications: { daily: boolean; weekly: boolean; monthly: boolean }
  ): Promise<string> {
    try {
      const client = await getTemporalClient();
      const workflowId = `notifications-${userId}`;

      const handle = await client.workflow.start(userNotificationManagerWorkflow, {
        args: [userId, userEmail, enabledNotifications],
        taskQueue: 'repazoo-tasks',
        workflowId,
        workflowExecutionTimeout: '365 days',
      });

      console.log(`Started notification workflows for user ${userId} with ID: ${workflowId}`);
      return workflowId;
    } catch (error) {
      console.error('Failed to start notification workflows:', error);
      throw error;
    }
  }

  static async sendImmediateReport(userId: string, reportType: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    try {
      const client = await getTemporalClient();
      const workflowId = `notification-${reportType}-${userId}`;

      const handle = client.workflow.getHandle(workflowId);
      await handle.signal(sendImmediateReportSignal);

      console.log(`Triggered immediate ${reportType} report for user ${userId}`);
    } catch (error) {
      console.error(`Failed to trigger immediate report for user ${userId}:`, error);
      throw error;
    }
  }

  static async listWorkflowsForUser(userId: string) {
    try {
      const client = await getTemporalClient();

      // List workflows for this user
      const workflows = await client.workflow.list({
        query: `WorkflowId STARTS_WITH "email-verification-${userId}" OR WorkflowId STARTS_WITH "monitoring-${userId}" OR WorkflowId STARTS_WITH "notification"`,
      });

      const userWorkflows = [];
      for await (const workflow of workflows) {
        if (workflow.workflowId.includes(userId)) {
          userWorkflows.push({
            workflowId: workflow.workflowId,
            runId: workflow.runId,
            workflowType: workflow.workflowType,
            status: workflow.status,
            startTime: workflow.startTime,
            closeTime: workflow.closeTime,
          });
        }
      }

      return userWorkflows;
    } catch (error) {
      console.error(`Failed to list workflows for user ${userId}:`, error);
      return [];
    }
  }

  static async cancelWorkflow(workflowId: string): Promise<void> {
    try {
      const client = await getTemporalClient();
      const handle = client.workflow.getHandle(workflowId);

      await handle.cancel();
      console.log(`Cancelled workflow: ${workflowId}`);
    } catch (error) {
      console.error(`Failed to cancel workflow ${workflowId}:`, error);
      throw error;
    }
  }

  static async terminateWorkflow(workflowId: string, reason?: string): Promise<void> {
    try {
      const client = await getTemporalClient();
      const handle = client.workflow.getHandle(workflowId);

      await handle.terminate(reason || 'Manual termination');
      console.log(`Terminated workflow: ${workflowId}`);
    } catch (error) {
      console.error(`Failed to terminate workflow ${workflowId}:`, error);
      throw error;
    }
  }
}