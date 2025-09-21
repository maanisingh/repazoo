import { NextRequest, NextResponse } from 'next/server';
import { TemporalService } from '@/temporal/services/temporal-service';
import { verifyJWT } from '@/lib/auth';
import { query, queryOne } from '@/lib/postgres';

/**
 * Enhanced Monitoring Workflow API Endpoints
 * Handles starting, controlling, and monitoring the reputation monitoring workflows
 */

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;

    // Get user's monitoring profiles and their workflow status
    const profiles = await query(`
      SELECT
        mp.id,
        mp.name,
        mp.keywords,
        mp.monitoring_sources,
        mp.is_active,
        mp.created_at,
        COUNT(ms.id) as source_count,
        COUNT(CASE WHEN ms.is_active THEN 1 END) as active_sources
      FROM monitoring_profiles mp
      LEFT JOIN monitoring_sources ms ON mp.id = ms.profile_id
      WHERE mp.user_id = $1
      GROUP BY mp.id, mp.name, mp.keywords, mp.monitoring_sources, mp.is_active, mp.created_at
      ORDER BY mp.created_at DESC
    `, [userId]);

    // Get workflow status for each profile
    const profilesWithStatus = await Promise.all(
      profiles.rows.map(async (profile) => {
        try {
          const workflowStatus = await TemporalService.getMonitoringStatus(userId);
          return {
            ...profile,
            workflowStatus: workflowStatus || {
              isRunning: false,
              isPaused: false,
              totalScans: 0,
              successfulScans: 0,
              failedScans: 0,
              totalMentionsFound: 0,
              currentReputationScore: 50,
            }
          };
        } catch (error) {
          return {
            ...profile,
            workflowStatus: {
              isRunning: false,
              isPaused: false,
              error: 'Could not fetch workflow status'
            }
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      profiles: profilesWithStatus,
    });

  } catch (error) {
    console.error('Enhanced monitoring GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;
    const body = await request.json();
    const { action, profileId, config } = body;

    // Get user and tenant information
    const user = await queryOne(`
      SELECT u.*, t.id as tenant_id, t.name as tenant_name
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.id = $1
    `, [userId]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    switch (action) {
      case 'start':
        return await startMonitoringWorkflow(userId, user.tenant_id, profileId, config);

      case 'stop':
        return await stopMonitoringWorkflow(userId);

      case 'pause':
        return await pauseMonitoringWorkflow(userId);

      case 'resume':
        return await resumeMonitoringWorkflow(userId);

      case 'force-scan':
        return await forceScanWorkflow(userId);

      case 'update-sources':
        return await updateMonitoringSources(userId, profileId, config.sources);

      case 'update-thresholds':
        return await updateAlertThresholds(userId, profileId, config.thresholds);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Enhanced monitoring POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process monitoring action' },
      { status: 500 }
    );
  }
}

// Action handlers

async function startMonitoringWorkflow(
  userId: string,
  tenantId: string,
  profileId: string,
  config: any
): Promise<NextResponse> {
  try {
    // Get monitoring profile details
    const profile = await queryOne(`
      SELECT * FROM monitoring_profiles WHERE id = $1 AND user_id = $2
    `, [profileId, userId]);

    if (!profile) {
      return NextResponse.json({ error: 'Monitoring profile not found' }, { status: 404 });
    }

    // Get monitoring sources for this profile
    const sources = await query(`
      SELECT * FROM monitoring_sources
      WHERE profile_id = $1 AND is_active = true
      ORDER BY created_at
    `, [profileId]);

    if (sources.rows.length === 0) {
      return NextResponse.json({
        error: 'No active monitoring sources found. Please add sources first.'
      }, { status: 400 });
    }

    // Prepare workflow parameters
    const workflowParams = {
      userId,
      tenantId,
      profileId,
      profileName: profile.name,
      keywords: profile.keywords || [],
      excludedKeywords: profile.excluded_keywords || [],
      sources: sources.rows.map(source => ({
        id: source.id,
        type: source.source_type,
        name: source.source_name,
        url: source.source_url,
        searchQuery: source.search_query,
        config: source.config || {},
        scanFrequency: source.scan_frequency || 60,
        isActive: source.is_active,
        lastScanAt: source.last_scan_at,
      })),
      scanIntervalMinutes: config?.scanIntervalMinutes || 60,
      alertThresholds: profile.alert_thresholds || {
        negativeSentimentThreshold: 0.3,
        volumeIncreaseThreshold: 50,
        reachThreshold: 10000,
        criticalKeywords: ['crisis', 'scandal', 'lawsuit'],
      },
      priorityKeywords: config?.priorityKeywords || [],
      maxMentionsPerScan: config?.maxMentionsPerScan || 100,
    };

    // Start the enhanced monitoring workflow
    const workflowId = await TemporalService.startMonitoringWorkflow(workflowParams);

    // Update profile status
    await query(`
      UPDATE monitoring_profiles
      SET is_active = true, updated_at = NOW()
      WHERE id = $1
    `, [profileId]);

    // Log workflow start
    await query(`
      INSERT INTO workflow_executions (
        user_id, workflow_id, workflow_type, status, input_data, started_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      userId,
      workflowId,
      'enhanced_monitoring',
      'RUNNING',
      JSON.stringify(workflowParams)
    ]);

    return NextResponse.json({
      success: true,
      message: 'Enhanced monitoring workflow started successfully',
      workflowId,
      profileName: profile.name,
      sourcesCount: sources.rows.length,
    });

  } catch (error) {
    console.error('Error starting monitoring workflow:', error);
    return NextResponse.json(
      { error: 'Failed to start monitoring workflow' },
      { status: 500 }
    );
  }
}

async function stopMonitoringWorkflow(userId: string): Promise<NextResponse> {
  try {
    await TemporalService.cancelWorkflow(`monitoring-${userId}`);

    // Update all user's profiles to inactive
    await query(`
      UPDATE monitoring_profiles
      SET is_active = false, updated_at = NOW()
      WHERE user_id = $1
    `, [userId]);

    return NextResponse.json({
      success: true,
      message: 'Monitoring workflow stopped successfully',
    });

  } catch (error) {
    console.error('Error stopping monitoring workflow:', error);
    return NextResponse.json(
      { error: 'Failed to stop monitoring workflow' },
      { status: 500 }
    );
  }
}

async function pauseMonitoringWorkflow(userId: string): Promise<NextResponse> {
  try {
    await TemporalService.pauseMonitoring(userId);

    return NextResponse.json({
      success: true,
      message: 'Monitoring workflow paused successfully',
    });

  } catch (error) {
    console.error('Error pausing monitoring workflow:', error);
    return NextResponse.json(
      { error: 'Failed to pause monitoring workflow' },
      { status: 500 }
    );
  }
}

async function resumeMonitoringWorkflow(userId: string): Promise<NextResponse> {
  try {
    await TemporalService.resumeMonitoring(userId);

    return NextResponse.json({
      success: true,
      message: 'Monitoring workflow resumed successfully',
    });

  } catch (error) {
    console.error('Error resuming monitoring workflow:', error);
    return NextResponse.json(
      { error: 'Failed to resume monitoring workflow' },
      { status: 500 }
    );
  }
}

async function forceScanWorkflow(userId: string): Promise<NextResponse> {
  try {
    await TemporalService.forceScan(userId);

    return NextResponse.json({
      success: true,
      message: 'Force scan triggered successfully',
    });

  } catch (error) {
    console.error('Error triggering force scan:', error);
    return NextResponse.json(
      { error: 'Failed to trigger force scan' },
      { status: 500 }
    );
  }
}

async function updateMonitoringSources(
  userId: string,
  profileId: string,
  sources: any[]
): Promise<NextResponse> {
  try {
    // Update sources in database
    for (const source of sources) {
      await query(`
        UPDATE monitoring_sources
        SET
          is_active = $1,
          scan_frequency = $2,
          config = $3,
          updated_at = NOW()
        WHERE id = $4 AND profile_id = $5
      `, [
        source.isActive,
        source.scanFrequency,
        JSON.stringify(source.config || {}),
        source.id,
        profileId
      ]);
    }

    // Signal the workflow to update its sources
    // Note: This would require implementing the updateSourcesSignal in the workflow

    return NextResponse.json({
      success: true,
      message: 'Monitoring sources updated successfully',
    });

  } catch (error) {
    console.error('Error updating monitoring sources:', error);
    return NextResponse.json(
      { error: 'Failed to update monitoring sources' },
      { status: 500 }
    );
  }
}

async function updateAlertThresholds(
  userId: string,
  profileId: string,
  thresholds: any
): Promise<NextResponse> {
  try {
    // Update thresholds in database
    await query(`
      UPDATE monitoring_profiles
      SET
        alert_thresholds = $1,
        updated_at = NOW()
      WHERE id = $2 AND user_id = $3
    `, [
      JSON.stringify(thresholds),
      profileId,
      userId
    ]);

    // Signal the workflow to update its thresholds
    // Note: This would require implementing the updateThresholdsSignal in the workflow

    return NextResponse.json({
      success: true,
      message: 'Alert thresholds updated successfully',
    });

  } catch (error) {
    console.error('Error updating alert thresholds:', error);
    return NextResponse.json(
      { error: 'Failed to update alert thresholds' },
      { status: 500 }
    );
  }
}