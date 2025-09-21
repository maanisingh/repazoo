import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { TemporalService } from '@/temporal/services/temporal-service';
import { z } from 'zod';

const startMonitoringSchema = z.object({
  scanIntervalMinutes: z.number().min(5).max(1440).optional(), // 5 minutes to 24 hours
});

const startNotificationsSchema = z.object({
  daily: z.boolean().optional().default(false),
  weekly: z.boolean().optional().default(false),
  monthly: z.boolean().optional().default(false),
});

// GET /api/automation - Get user's automation status
export async function GET(request: NextRequest) {
  try {
    const user = await AuthService.authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all workflows for this user
    const workflows = await TemporalService.listWorkflowsForUser(user.userId);

    // Get specific workflow statuses
    const [emailStatus, monitoringStatus] = await Promise.all([
      TemporalService.getEmailVerificationStatus(user.userId),
      TemporalService.getMonitoringStatus(user.userId),
    ]);

    return NextResponse.json({
      success: true,
      automation: {
        workflows,
        emailVerification: emailStatus,
        monitoring: monitoringStatus,
      }
    });

  } catch (error) {
    console.error('GET automation status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/automation - Start automation workflows
export async function POST(request: NextRequest) {
  try {
    const user = await AuthService.authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'start_monitoring': {
        const { scanIntervalMinutes } = startMonitoringSchema.parse(body);

        const workflowId = await TemporalService.startMonitoringWorkflow({
          userId: user.userId,
          scanIntervalMinutes: scanIntervalMinutes || 60,
        });

        return NextResponse.json({
          success: true,
          message: 'Monitoring workflow started',
          workflowId,
        });
      }

      case 'start_notifications': {
        const { daily, weekly, monthly } = startNotificationsSchema.parse(body);

        // Get user email from the authenticated user info
        const userEmail = user.email || 'user@example.com'; // Fallback

        const workflowId = await TemporalService.startNotificationWorkflows(
          user.userId,
          userEmail,
          { daily, weekly, monthly }
        );

        return NextResponse.json({
          success: true,
          message: 'Notification workflows started',
          workflowId,
        });
      }

      case 'force_scan': {
        await TemporalService.forceScan(user.userId);

        return NextResponse.json({
          success: true,
          message: 'Force scan triggered',
        });
      }

      case 'pause_monitoring': {
        await TemporalService.pauseMonitoring(user.userId);

        return NextResponse.json({
          success: true,
          message: 'Monitoring paused',
        });
      }

      case 'resume_monitoring': {
        await TemporalService.resumeMonitoring(user.userId);

        return NextResponse.json({
          success: true,
          message: 'Monitoring resumed',
        });
      }

      case 'resend_verification': {
        await TemporalService.resendVerificationEmail(user.userId);

        return NextResponse.json({
          success: true,
          message: 'Verification email resend triggered',
        });
      }

      case 'send_immediate_report': {
        const { reportType } = body;

        if (!['daily', 'weekly', 'monthly'].includes(reportType)) {
          return NextResponse.json(
            { error: 'Invalid report type' },
            { status: 400 }
          );
        }

        await TemporalService.sendImmediateReport(user.userId, reportType);

        return NextResponse.json({
          success: true,
          message: `Immediate ${reportType} report triggered`,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('POST automation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/automation - Cancel automation workflows
export async function DELETE(request: NextRequest) {
  try {
    const user = await AuthService.authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');
    const action = searchParams.get('action');

    if (!workflowId && !action) {
      return NextResponse.json(
        { error: 'workflowId or action is required' },
        { status: 400 }
      );
    }

    if (workflowId) {
      // Cancel specific workflow
      await TemporalService.cancelWorkflow(workflowId);

      return NextResponse.json({
        success: true,
        message: `Workflow ${workflowId} cancelled`,
      });
    }

    if (action) {
      // Cancel workflows by type
      const workflows = await TemporalService.listWorkflowsForUser(user.userId);

      let cancelCount = 0;
      for (const workflow of workflows) {
        if (workflow.workflowId.includes(action) && workflow.status === 'Running') {
          try {
            await TemporalService.cancelWorkflow(workflow.workflowId);
            cancelCount++;
          } catch (error) {
            console.error(`Failed to cancel workflow ${workflow.workflowId}:`, error);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Cancelled ${cancelCount} ${action} workflows`,
      });
    }

  } catch (error) {
    console.error('DELETE automation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}