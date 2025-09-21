import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  condition,
  sleep,
  ContinueAsNew,
  continueAsNew,
  workflowInfo,
  log,
} from '@temporalio/workflow';
import type * as activities from '../activities/crisis-management';

// Configure activity options for crisis management
const urgentActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '10 seconds',
    backoffCoefficient: 1.5,
    maximumAttempts: 5,
  },
});

const standardActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '5 seconds',
    maximumInterval: '1 minute',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

// Crisis management workflow parameters
export interface CrisisManagementParams {
  userId: string;
  tenantId: string;
  profileId: string;
  profileName: string;
  triggerEvent: CrisisTrigger;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  responseTeam: ResponseTeamMember[];
  escalationPlan: EscalationLevel[];
  autoResponseEnabled: boolean;
  notificationChannels: NotificationChannel[];
}

export interface CrisisTrigger {
  type: 'SENTIMENT_DROP' | 'VOLUME_SPIKE' | 'NEGATIVE_KEYWORDS' | 'MANUAL' | 'EXTERNAL_ALERT';
  description: string;
  triggerData: Record<string, any>;
  detectedAt: string;
  confidence: number;
  affectedMentions: string[];
  estimatedReach: number;
}

export interface ResponseTeamMember {
  id: string;
  name: string;
  role: 'LEAD' | 'SPECIALIST' | 'COORDINATOR' | 'EXECUTIVE';
  email: string;
  phone?: string;
  skills: string[];
  availability: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
}

export interface EscalationLevel {
  level: number;
  triggerCondition: string;
  actions: CrisisAction[];
  timeThreshold: number; // minutes
  requiredApprovals: string[];
}

export interface NotificationChannel {
  type: 'EMAIL' | 'SMS' | 'SLACK' | 'WEBHOOK' | 'PHONE';
  config: Record<string, any>;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isEnabled: boolean;
}

export interface CrisisAction {
  id: string;
  type: 'RESPONSE_DRAFT' | 'SOCIAL_MONITOR' | 'MEDIA_OUTREACH' | 'LEGAL_REVIEW' | 'EXECUTIVE_BRIEF';
  title: string;
  description: string;
  assignedTo: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  deadline: string;
  dependencies: string[];
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  automationConfig?: Record<string, any>;
}

export interface CrisisStatus {
  isActive: boolean;
  currentSeverity: string;
  currentLevel: number;
  timeElapsed: number;
  actionsCompleted: number;
  totalActions: number;
  teamMembersNotified: number;
  responsesSent: number;
  estimatedResolutionTime: number;
  lastUpdate: string;
}

// Signals for crisis management control
export const escalateCrisisSignal = defineSignal<[number]>('escalateCrisis');
export const deEscalateCrisisSignal = defineSignal<[number]>('deEscalateCrisis');
export const addCrisisActionSignal = defineSignal<[CrisisAction]>('addCrisisAction');
export const updateActionStatusSignal = defineSignal<[string, string]>('updateActionStatus');
export const assignTeamMemberSignal = defineSignal<[string, string]>('assignTeamMember');
export const sendEmergencyAlertSignal = defineSignal<[]>('sendEmergencyAlert');
export const resolveCrisisSignal = defineSignal<[string]>('resolveCrisis');

// Queries for crisis status
export const getCrisisStatusQuery = defineQuery<CrisisStatus>('getCrisisStatus');
export const getActiveActionsQuery = defineQuery<CrisisAction[]>('getActiveActions');
export const getTeamStatusQuery = defineQuery<ResponseTeamMember[]>('getTeamStatus');
export const getCrisisTimelineQuery = defineQuery<any[]>('getCrisisTimeline');

/**
 * Enhanced Crisis Management Workflow
 * Handles reputation crises with automated response, team coordination,
 * and escalation management
 */
export async function enhancedCrisisManagementWorkflow(
  params: CrisisManagementParams
): Promise<void> {
  log.info('Starting enhanced crisis management workflow', {
    userId: params.userId,
    profileName: params.profileName,
    severity: params.severity,
    triggerType: params.triggerEvent.type,
  });

  // Crisis state
  let isActive = true;
  let isResolved = false;
  let currentSeverity = params.severity;
  let currentLevel = 1;
  let crisisStartTime = Date.now();
  let lastUpdate = new Date().toISOString();

  let activeActions: CrisisAction[] = [];
  let responseTeam = params.responseTeam;
  let crisisTimeline: any[] = [];
  let actionsCompleted = 0;
  let teamMembersNotified = 0;
  let responsesSent = 0;

  // Initialize crisis
  addToTimeline('CRISIS_STARTED', `Crisis triggered: ${params.triggerEvent.description}`);

  // Set up signal handlers
  setHandler(escalateCrisisSignal, async (level: number) => {
    currentLevel = Math.min(level, params.escalationPlan.length);
    addToTimeline('ESCALATED', `Crisis escalated to level ${currentLevel}`);
    await executeEscalationLevel(currentLevel);
  });

  setHandler(deEscalateCrisisSignal, async (level: number) => {
    currentLevel = Math.max(level, 1);
    addToTimeline('DE_ESCALATED', `Crisis de-escalated to level ${currentLevel}`);
  });

  setHandler(addCrisisActionSignal, (action: CrisisAction) => {
    activeActions.push(action);
    addToTimeline('ACTION_ADDED', `New action added: ${action.title}`);
  });

  setHandler(updateActionStatusSignal, (actionId: string, status: string) => {
    const action = activeActions.find(a => a.id === actionId);
    if (action) {
      action.status = status as any;
      if (status === 'COMPLETED') {
        actionsCompleted++;
      }
      addToTimeline('ACTION_UPDATED', `Action ${action.title} status: ${status}`);
    }
  });

  setHandler(assignTeamMemberSignal, async (memberId: string, actionId: string) => {
    const action = activeActions.find(a => a.id === actionId);
    const member = responseTeam.find(m => m.id === memberId);
    if (action && member) {
      action.assignedTo = memberId;
      addToTimeline('ASSIGNMENT', `${member.name} assigned to ${action.title}`);
      await notifyTeamMember(member, action);
    }
  });

  setHandler(sendEmergencyAlertSignal, async () => {
    await sendEmergencyAlert();
    addToTimeline('EMERGENCY_ALERT', 'Emergency alert sent to all channels');
  });

  setHandler(resolveCrisisSignal, (resolution: string) => {
    isResolved = true;
    isActive = false;
    addToTimeline('RESOLVED', `Crisis resolved: ${resolution}`);
  });

  // Set up query handlers
  setHandler(getCrisisStatusQuery, (): CrisisStatus => ({
    isActive,
    currentSeverity,
    currentLevel,
    timeElapsed: Math.floor((Date.now() - crisisStartTime) / 1000 / 60), // minutes
    actionsCompleted,
    totalActions: activeActions.length,
    teamMembersNotified,
    responsesSent,
    estimatedResolutionTime: calculateEstimatedResolution(),
    lastUpdate,
  }));

  setHandler(getActiveActionsQuery, (): CrisisAction[] =>
    activeActions.filter(a => a.status !== 'COMPLETED')
  );

  setHandler(getTeamStatusQuery, (): ResponseTeamMember[] => responseTeam);

  setHandler(getCrisisTimelineQuery, () => crisisTimeline);

  try {
    // Initial crisis response
    await initialCrisisResponse();

    // Execute initial escalation level
    await executeEscalationLevel(currentLevel);

    // Main crisis management loop
    while (isActive && !isResolved) {
      try {
        // Check for automatic escalation conditions
        await checkEscalationConditions();

        // Update action statuses
        await updateActionStatuses();

        // Check for crisis resolution
        await checkResolutionConditions();

        // Send periodic updates
        await sendPeriodicUpdates();

        // Sleep for monitoring interval
        await sleep(30000); // 30 seconds

        // Update last activity timestamp
        lastUpdate = new Date().toISOString();

        // Continue as new if running too long
        if (Date.now() - crisisStartTime > 24 * 60 * 60 * 1000) { // 24 hours
          await continueAsNew<typeof enhancedCrisisManagementWorkflow>(params);
        }

      } catch (error) {
        log.error('Crisis management loop error', { error: error instanceof Error ? error.message : 'Unknown error' });
        await sleep(10000); // Wait 10 seconds before retrying
      }
    }

    // Crisis concluded
    await concludeCrisis();

  } catch (error) {
    log.error('Crisis management workflow error', { error: error instanceof Error ? error.message : 'Unknown error' });
    await handleCrisisWorkflowError(error);
  }

  log.info('Enhanced crisis management workflow completed', {
    duration: Math.floor((Date.now() - crisisStartTime) / 1000 / 60),
    actionsCompleted,
    currentLevel,
  });

  // Helper functions
  async function initialCrisisResponse(): Promise<void> {
    log.info('Executing initial crisis response');

    try {
      // Create crisis event in database
      await standardActivities.createCrisisEvent({
        userId: params.userId,
        profileId: params.profileId,
        profileName: params.profileName,
        triggerEvent: params.triggerEvent,
        severity: currentSeverity,
        responseTeam: params.responseTeam,
      });

      // Send immediate notifications to response team leads
      const teamLeads = responseTeam.filter(member => member.role === 'LEAD');
      for (const lead of teamLeads) {
        await urgentActivities.notifyTeamMember({
          member: lead,
          message: `URGENT: Crisis detected for ${params.profileName}. Severity: ${currentSeverity}. Please check dashboard immediately.`,
          urgency: 'CRITICAL',
          channels: params.notificationChannels,
        });
        teamMembersNotified++;
      }

      // Generate initial assessment
      const assessment = await standardActivities.generateCrisisAssessment({
        triggerEvent: params.triggerEvent,
        profileId: params.profileId,
        severity: currentSeverity,
      });

      addToTimeline('ASSESSMENT', `Initial assessment completed: ${assessment.summary}`);

      // Create initial response actions
      const initialActions = await standardActivities.generateInitialActions({
        assessment,
        severity: currentSeverity,
        autoResponseEnabled: params.autoResponseEnabled,
      });

      activeActions.push(...initialActions);

    } catch (error) {
      log.error('Initial crisis response failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  async function executeEscalationLevel(level: number): Promise<void> {
    log.info(`Executing escalation level ${level}`);

    const escalationConfig = params.escalationPlan.find(plan => plan.level === level);
    if (!escalationConfig) {
      log.warn(`No escalation plan found for level ${level}`);
      return;
    }

    try {
      // Add escalation actions
      activeActions.push(...escalationConfig.actions);

      // Notify additional team members
      const levelTeamMembers = getTeamMembersForLevel(level);
      for (const member of levelTeamMembers) {
        await urgentActivities.notifyTeamMember({
          member,
          message: `Crisis escalated to level ${level} for ${params.profileName}. Your immediate attention is required.`,
          urgency: level >= 3 ? 'CRITICAL' : 'HIGH',
          channels: params.notificationChannels,
        });
        teamMembersNotified++;
      }

      // Execute automated actions
      for (const action of escalationConfig.actions) {
        if (action.automationConfig) {
          await executeAutomatedAction(action);
        }
      }

    } catch (error) {
      log.error(`Escalation level ${level} execution failed`, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async function checkEscalationConditions(): Promise<void> {
    for (const escalationLevel of params.escalationPlan) {
      if (escalationLevel.level <= currentLevel) continue;

      const shouldEscalate = await standardActivities.evaluateEscalationCondition({
        condition: escalationLevel.triggerCondition,
        crisisData: {
          timeElapsed: Math.floor((Date.now() - crisisStartTime) / 1000 / 60),
          actionsCompleted,
          totalActions: activeActions.length,
          currentSeverity,
        },
      });

      if (shouldEscalate) {
        currentLevel = escalationLevel.level;
        addToTimeline('AUTO_ESCALATED', `Automatically escalated to level ${currentLevel}`);
        await executeEscalationLevel(currentLevel);
        break;
      }
    }
  }

  async function updateActionStatuses(): Promise<void> {
    for (const action of activeActions) {
      if (action.status === 'PENDING' || action.status === 'IN_PROGRESS') {
        try {
          const status = await standardActivities.checkActionStatus({
            actionId: action.id,
            actionType: action.type,
          });

          if (status !== action.status) {
            action.status = status;
            if (status === 'COMPLETED') {
              actionsCompleted++;
            }
            addToTimeline('ACTION_STATUS', `${action.title}: ${status}`);
          }
        } catch (error) {
          log.error(`Failed to update action status for ${action.id}`, { error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }
  }

  async function checkResolutionConditions(): Promise<void> {
    // Check if crisis can be resolved
    const completedCriticalActions = activeActions.filter(
      a => a.priority === 'CRITICAL' && a.status === 'COMPLETED'
    ).length;

    const totalCriticalActions = activeActions.filter(
      a => a.priority === 'CRITICAL'
    ).length;

    if (totalCriticalActions > 0 && completedCriticalActions === totalCriticalActions) {
      const resolutionCheck = await standardActivities.evaluateResolutionReadiness({
        userId: params.userId,
        profileId: params.profileId,
        crisisStartTime,
        actionsCompleted,
      });

      if (resolutionCheck.canResolve) {
        addToTimeline('RESOLUTION_READY', 'All critical actions completed, crisis ready for resolution');
        // Auto-resolve for lower severity crises
        if (currentSeverity === 'LOW' || currentSeverity === 'MEDIUM') {
          isResolved = true;
          isActive = false;
          addToTimeline('AUTO_RESOLVED', 'Crisis automatically resolved');
        }
      }
    }
  }

  async function sendPeriodicUpdates(): Promise<void> {
    // Send updates every 15 minutes during active crisis
    const minutesElapsed = Math.floor((Date.now() - crisisStartTime) / 1000 / 60);
    if (minutesElapsed > 0 && minutesElapsed % 15 === 0) {
      const statusUpdate = {
        timeElapsed: minutesElapsed,
        currentLevel,
        actionsCompleted,
        totalActions: activeActions.length,
        teamStatus: responseTeam.length,
      };

      await standardActivities.sendStatusUpdate({
        userId: params.userId,
        profileName: params.profileName,
        statusUpdate,
        recipients: responseTeam.map(m => m.email),
      });

      addToTimeline('STATUS_UPDATE', `Periodic status update sent (${minutesElapsed}m elapsed)`);
    }
  }

  async function executeAutomatedAction(action: CrisisAction): Promise<void> {
    try {
      const result = await standardActivities.executeAutomatedAction({
        action,
        crisisContext: {
          userId: params.userId,
          profileId: params.profileId,
          severity: currentSeverity,
          triggerEvent: params.triggerEvent,
        },
      });

      if (result.success) {
        action.status = 'COMPLETED';
        actionsCompleted++;
        responsesSent++;
        addToTimeline('AUTO_ACTION', `Automated action completed: ${action.title}`);
      } else {
        action.status = 'BLOCKED';
        addToTimeline('AUTO_ACTION_FAILED', `Automated action failed: ${action.title} - ${result.error}`);
      }
    } catch (error) {
      log.error(`Automated action failed: ${action.title}`, { error: error instanceof Error ? error.message : 'Unknown error' });
      action.status = 'BLOCKED';
    }
  }

  async function notifyTeamMember(member: ResponseTeamMember, action: CrisisAction): Promise<void> {
    await urgentActivities.notifyTeamMember({
      member,
      message: `You have been assigned to: ${action.title}. Deadline: ${action.deadline}. Priority: ${action.priority}`,
      urgency: action.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      channels: params.notificationChannels,
    });
  }

  async function sendEmergencyAlert(): Promise<void> {
    await urgentActivities.sendEmergencyBroadcast({
      userId: params.userId,
      profileName: params.profileName,
      message: `EMERGENCY: Critical reputation crisis detected. All hands on deck.`,
      channels: params.notificationChannels,
      recipients: responseTeam.map(m => m.email),
    });
  }

  async function concludeCrisis(): Promise<void> {
    const duration = Math.floor((Date.now() - crisisStartTime) / 1000 / 60);

    await standardActivities.concludeCrisis({
      userId: params.userId,
      profileId: params.profileId,
      duration,
      actionsCompleted,
      finalLevel: currentLevel,
      resolution: isResolved ? 'RESOLVED' : 'TERMINATED',
    });

    // Send final report
    await standardActivities.generateCrisisReport({
      userId: params.userId,
      profileName: params.profileName,
      crisisTimeline,
      duration,
      metrics: {
        actionsCompleted,
        teamMembersNotified,
        responsesSent,
        finalLevel: currentLevel,
      },
    });

    addToTimeline('CONCLUDED', `Crisis management concluded after ${duration} minutes`);
  }

  async function handleCrisisWorkflowError(error: any): Promise<void> {
    log.error('Crisis workflow encountered fatal error', { error: error instanceof Error ? error.message : 'Unknown error' });

    // Send emergency notification
    await urgentActivities.sendEmergencyBroadcast({
      userId: params.userId,
      profileName: params.profileName,
      message: `ALERT: Crisis management workflow error. Manual intervention required.`,
      channels: params.notificationChannels,
      recipients: responseTeam.filter(m => m.role === 'LEAD').map(m => m.email),
    });
  }

  function addToTimeline(event: string, description: string): void {
    crisisTimeline.push({
      timestamp: new Date().toISOString(),
      event,
      description,
      level: currentLevel,
    });
  }

  function getTeamMembersForLevel(level: number): ResponseTeamMember[] {
    // Return team members appropriate for the escalation level
    switch (level) {
      case 1:
        return responseTeam.filter(m => m.role === 'SPECIALIST');
      case 2:
        return responseTeam.filter(m => m.role === 'LEAD' || m.role === 'COORDINATOR');
      case 3:
      default:
        return responseTeam.filter(m => m.role === 'EXECUTIVE');
    }
  }

  function calculateEstimatedResolution(): number {
    // Calculate estimated resolution time based on current progress
    const completionRate = actionsCompleted / (activeActions.length || 1);
    const timeElapsed = Math.floor((Date.now() - crisisStartTime) / 1000 / 60);

    if (completionRate > 0) {
      return Math.ceil(timeElapsed / completionRate) - timeElapsed;
    }

    // Default estimates based on severity
    switch (currentSeverity) {
      case 'LOW': return 60; // 1 hour
      case 'MEDIUM': return 180; // 3 hours
      case 'HIGH': return 480; // 8 hours
      case 'CRITICAL': return 1440; // 24 hours
      default: return 240; // 4 hours
    }
  }
}

export {
  enhancedCrisisManagementWorkflow as crisisManagementWorkflow,
};