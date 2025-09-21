import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { temporalService } from '../../../../temporal/services/temporal-service';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await temporalService.getNotificationWorkflowStatus(user.id);
    return NextResponse.json(status);
  } catch (error) {
    console.error('[API] Notification workflow status error:', error);
    return NextResponse.json({
      error: 'Failed to get notification workflow status'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, preferences } = await request.json();

    switch (action) {
      case 'start':
        await temporalService.startNotificationWorkflow(user.id, preferences);
        return NextResponse.json({ success: true });

      case 'update':
        await temporalService.updateNotificationPreferences(user.id, preferences);
        return NextResponse.json({ success: true });

      case 'send-test':
        await temporalService.sendTestNotification(user.id);
        return NextResponse.json({ success: true });

      case 'stop':
        await temporalService.stopNotificationWorkflow(user.id);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[API] Notification workflow action error:', error);
    return NextResponse.json({
      error: 'Failed to perform notification action'
    }, { status: 500 });
  }
}