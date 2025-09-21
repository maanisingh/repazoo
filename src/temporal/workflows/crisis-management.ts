import { proxyActivities, defineSignal, defineQuery, setHandler, condition, sleep } from '@temporalio/workflow';
import type * as activities from '../activities';

const {
  detectCrisis,
  escalateCrisis,
  generateCrisisReport,
  notifyStakeholders,
  implementCrisisResponse,
  monitorCrisisResolution
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '1 minute',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export const pauseCrisisSignal = defineSignal<[]>('pauseCrisis');
export const resumeCrisisSignal = defineSignal<[]>('resumeCrisis');
export const escalateSignal = defineSignal<[{ severity: 'HIGH' | 'CRITICAL', reason: string }]>('escalateCrisis');
export const resolveSignal = defineSignal<[{ resolution: string, actionsTaken: string[] }]>('resolveCrisis');

export const crisisStatusQuery = defineQuery<string>('crisisStatus');
export const crisisMetricsQuery = defineQuery<any>('crisisMetrics');

export interface CrisisWorkflowParams {
  userId: string;
  triggerMentionId: string;
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alertThreshold: number;
  autoEscalateAfter: string; // e.g., '30 minutes'
}

export async function crisisManagementWorkflow(params: CrisisWorkflowParams): Promise<void> {
  let isPaused = false;
  let currentStatus = 'ACTIVE';
  let escalationLevel = params.severity;
  let resolved = false;

  // Set up signal handlers
  setHandler(pauseCrisisSignal, () => {
    isPaused = true;
    currentStatus = 'PAUSED';
  });

  setHandler(resumeCrisisSignal, () => {
    isPaused = false;
    currentStatus = 'ACTIVE';
  });

  setHandler(escalateSignal, ({ severity, reason }) => {
    escalationLevel = severity;
    currentStatus = 'ESCALATED';
  });

  setHandler(resolveSignal, ({ resolution, actionsTaken }) => {
    resolved = true;
    currentStatus = 'RESOLVED';
  });

  // Set up query handlers
  setHandler(crisisStatusQuery, () => currentStatus);
  setHandler(crisisMetricsQuery, () => ({
    severity: escalationLevel,
    status: currentStatus,
    startTime: new Date().toISOString(),
    userId: params.userId
  }));

  console.log(`[Crisis] Starting crisis management workflow for user ${params.userId} - Severity: ${params.severity}`);

  // Initial crisis detection and alert
  await detectCrisis({
    userId: params.userId,
    keywords: ['crisis', 'reputation'],
    platforms: ['twitter', 'facebook', 'linkedin'],
    severity: params.severity
  });

  // Send immediate notification
  await notifyStakeholders({
    userId: params.userId,
    crisisId: params.triggerMentionId,
    stakeholders: ['admin@company.com'],
    urgency: params.severity
  });

  // Implement crisis response
  await implementCrisisResponse({
    userId: params.userId,
    crisisId: params.triggerMentionId,
    responseType: 'IMMEDIATE_RESPONSE'
  });

  let monitoringInterval = 0;
  const maxMonitoringTime = 24 * 60; // 24 hours in minutes

  // Crisis monitoring loop
  while (!resolved && monitoringInterval < maxMonitoringTime) {
    // Wait if paused
    await condition(() => !isPaused || resolved);

    if (resolved) break;

    // Check for auto-escalation
    if (escalationLevel !== 'CRITICAL' && monitoringInterval >= parseInt(params.autoEscalateAfter.split(' ')[0])) {
      escalationLevel = escalationLevel === 'MEDIUM' ? 'HIGH' : 'CRITICAL';
      currentStatus = 'AUTO_ESCALATED';

      await escalateCrisis({
        userId: params.userId,
        crisisId: params.triggerMentionId,
        escalationLevel: escalationLevel
      });
    }

    // Monitor crisis progression
    const crisisUpdate = await monitorCrisisResolution({
      userId: params.userId,
      crisisId: params.triggerMentionId
    });

    // Check if crisis is naturally resolving
    if (crisisUpdate.resolutionStatus === 'IMPROVING' && escalationLevel !== 'CRITICAL') {
      currentStatus = 'IMPROVING';
    }

    // Generate periodic crisis reports
    if (monitoringInterval % 60 === 0) { // Every hour
      await generateCrisisReport({
        userId: params.userId,
        crisisId: params.triggerMentionId,
        timeframe: '1h'
      });
    }

    // Wait 5 minutes before next check
    await sleep(5 * 60 * 1000);
    monitoringInterval += 5;
  }

  // Final crisis resolution
  if (resolved) {
    // Crisis resolved - implement final response
    await implementCrisisResponse({
      userId: params.userId,
      crisisId: params.triggerMentionId,
      responseType: 'RESOLUTION_COMPLETE'
    });

    // Generate final crisis report
    await generateCrisisReport({
      userId: params.userId,
      crisisId: params.triggerMentionId,
      timeframe: 'full_crisis'
    });
  }

  console.log(`[Crisis] Crisis management workflow completed for user ${params.userId} - Final status: ${currentStatus}`);
}