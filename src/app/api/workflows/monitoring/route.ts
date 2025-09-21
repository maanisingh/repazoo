import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { temporalService } from '../../../../temporal/services/temporal-service';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'status':
        const status = await temporalService.getMonitoringWorkflowStatus(user.id);
        return NextResponse.json(status);

      case 'stats':
        const stats = await temporalService.getMonitoringStats(user.id);
        return NextResponse.json(stats);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[API] Monitoring workflow error:', error);
    return NextResponse.json({
      error: 'Failed to get monitoring workflow info'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, sourceIds } = await request.json();

    switch (action) {
      case 'start':
        await temporalService.startMonitoringWorkflow(user.id, sourceIds || []);
        return NextResponse.json({ success: true });

      case 'pause':
        await temporalService.pauseMonitoringWorkflow(user.id);
        return NextResponse.json({ success: true });

      case 'resume':
        await temporalService.resumeMonitoringWorkflow(user.id);
        return NextResponse.json({ success: true });

      case 'force-scan':
        await temporalService.forceScanNow(user.id);
        return NextResponse.json({ success: true });

      case 'stop':
        await temporalService.stopMonitoringWorkflow(user.id);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[API] Monitoring workflow action error:', error);
    return NextResponse.json({
      error: 'Failed to perform monitoring action'
    }, { status: 500 });
  }
}