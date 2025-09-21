import { query, queryOne, queryMany } from '../../lib/postgres';
import { sendNotification } from '../../lib/email';
import { analyzeSentiment } from '../../lib/ai-sentiment';

// Crisis management activity interfaces
export interface CrisisEventParams {
  userId: string;
  profileId: string;
  profileName: string;
  triggerEvent: any;
  severity: string;
  responseTeam: any[];
}

export interface CrisisAssessmentParams {
  triggerEvent: any;
  profileId: string;
  severity: string;
}

export interface InitialActionsParams {
  assessment: any;
  severity: string;
  autoResponseEnabled: boolean;
}

export interface TeamNotificationParams {
  member: any;
  message: string;
  urgency: string;
  channels: any[];
}

export interface EscalationEvaluationParams {
  condition: string;
  crisisData: any;
}

export interface ActionStatusParams {
  actionId: string;
  actionType: string;
}

export interface ResolutionEvaluationParams {
  userId: string;
  profileId: string;
  crisisStartTime: number;
  actionsCompleted: number;
}

export interface StatusUpdateParams {
  userId: string;
  profileName: string;
  statusUpdate: any;
  recipients: string[];
}

export interface AutomatedActionParams {
  action: any;
  crisisContext: any;
}

export interface EmergencyBroadcastParams {
  userId: string;
  profileName: string;
  message: string;
  channels: any[];
  recipients: string[];
}

export interface ConcludeCrisisParams {
  userId: string;
  profileId: string;
  duration: number;
  actionsCompleted: number;
  finalLevel: number;
  resolution: string;
}

export interface CrisisReportParams {
  userId: string;
  profileName: string;
  crisisTimeline: any[];
  duration: number;
  metrics: any;
}

/**
 * Create a crisis event in the database
 */
export async function createCrisisEvent(params: CrisisEventParams): Promise<string> {
  try {
    const crisisId = 'crisis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    await query(`
      INSERT INTO crisis_events (
        id, user_id, profile_id, title, description, severity,
        trigger_conditions, response_plan, assigned_team, started_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [
      crisisId,
      params.userId,
      params.profileId,
      `Crisis: ${params.profileName}`,
      params.triggerEvent.description,
      params.severity,
      JSON.stringify(params.triggerEvent),
      JSON.stringify({ autoResponse: true }),
      JSON.stringify(params.responseTeam),
    ]);

    console.log(`Crisis event created: ${crisisId}`);
    return crisisId;

  } catch (error) {
    console.error('Error creating crisis event:', error);
    throw error;
  }
}

/**
 * Generate initial crisis assessment
 */
export async function generateCrisisAssessment(params: CrisisAssessmentParams): Promise<any> {
  try {
    // Get recent mentions for context
    const recentMentions = await query(`
      SELECT title, content, sentiment, sentiment_score, url, published_at
      FROM mentions
      WHERE profile_id = $1
      AND published_at >= NOW() - INTERVAL '24 hours'
      ORDER BY published_at DESC
      LIMIT 50
    `, [params.profileId]);

    // Analyze sentiment trends
    const sentimentStats = await queryOne(`
      SELECT
        AVG(sentiment_score) as avg_sentiment,
        COUNT(*) FILTER (WHERE sentiment = 'NEGATIVE') as negative_count,
        COUNT(*) FILTER (WHERE sentiment = 'POSITIVE') as positive_count,
        COUNT(*) as total_mentions
      FROM mentions
      WHERE profile_id = $1
      AND published_at >= NOW() - INTERVAL '24 hours'
    `, [params.profileId]);

    // Calculate impact assessment
    const impactScore = calculateImpactScore(params.triggerEvent, sentimentStats);

    const assessment = {
      summary: generateAssessmentSummary(params.triggerEvent, sentimentStats),
      impactScore,
      riskLevel: params.severity,
      affectedChannels: extractAffectedChannels(recentMentions.rows),
      keyMentions: recentMentions.rows.slice(0, 10), // Top 10 mentions
      recommendedActions: generateRecommendedActions(params.severity, impactScore),
      estimatedDuration: estimateCrisisDuration(params.severity),
      stakeholdersToNotify: identifyStakeholders(params.severity),
    };

    return assessment;

  } catch (error) {
    console.error('Error generating crisis assessment:', error);
    throw error;
  }
}

/**
 * Generate initial response actions
 */
export async function generateInitialActions(params: InitialActionsParams): Promise<any[]> {
  try {
    const actions = [];

    // Always include monitoring action
    actions.push({
      id: 'monitor_' + Date.now(),
      type: 'SOCIAL_MONITOR',
      title: 'Enhanced Social Media Monitoring',
      description: 'Increase monitoring frequency and coverage',
      assignedTo: '',
      priority: 'HIGH',
      deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      dependencies: [],
      status: 'PENDING',
      automationConfig: {
        scanFrequency: 300, // 5 minutes
        alertThreshold: 0.7,
      },
    });

    // Add severity-specific actions
    switch (params.severity) {
      case 'CRITICAL':
        actions.push(
          {
            id: 'exec_brief_' + Date.now(),
            type: 'EXECUTIVE_BRIEF',
            title: 'Executive Crisis Brief',
            description: 'Prepare and deliver executive crisis briefing',
            assignedTo: '',
            priority: 'CRITICAL',
            deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
            dependencies: [],
            status: 'PENDING',
          },
          {
            id: 'legal_review_' + Date.now(),
            type: 'LEGAL_REVIEW',
            title: 'Legal Impact Assessment',
            description: 'Review for potential legal implications',
            assignedTo: '',
            priority: 'HIGH',
            deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
            dependencies: [],
            status: 'PENDING',
          }
        );
        // Fall through to HIGH severity actions
      case 'HIGH':
        actions.push(
          {
            id: 'media_outreach_' + Date.now(),
            type: 'MEDIA_OUTREACH',
            title: 'Media Response Strategy',
            description: 'Develop and execute media response plan',
            assignedTo: '',
            priority: 'HIGH',
            deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
            dependencies: [],
            status: 'PENDING',
          }
        );
        // Fall through to MEDIUM severity actions
      case 'MEDIUM':
        actions.push(
          {
            id: 'response_draft_' + Date.now(),
            type: 'RESPONSE_DRAFT',
            title: 'Prepare Public Response',
            description: 'Draft public response and stakeholder communications',
            assignedTo: '',
            priority: 'MEDIUM',
            deadline: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
            dependencies: [],
            status: 'PENDING',
            automationConfig: params.autoResponseEnabled ? {
              template: 'standard_response',
              autoApproval: false,
            } : undefined,
          }
        );
        break;
    }

    return actions;

  } catch (error) {
    console.error('Error generating initial actions:', error);
    throw error;
  }
}

/**
 * Notify team member
 */
export async function notifyTeamMember(params: TeamNotificationParams): Promise<void> {
  try {
    // Send email notification
    await sendNotification({
      to: params.member.email,
      subject: `[${params.urgency}] Crisis Management Alert`,
      text: params.message,
      html: `
        <div style="background-color: ${params.urgency === 'CRITICAL' ? '#dc2626' : '#f59e0b'}; color: white; padding: 16px; border-radius: 8px;">
          <h2>[${params.urgency}] Crisis Management Alert</h2>
          <p>${params.message}</p>
          <p><strong>Team Member:</strong> ${params.member.name}</p>
          <p><strong>Role:</strong> ${params.member.role}</p>
          <a href="https://dash.repazoo.com/dashboard" style="color: white; font-weight: bold;">
            → Access Crisis Dashboard
          </a>
        </div>
      `,
    });

    // Log notification
    await query(`
      INSERT INTO notifications_log (
        user_id, type, title, message, channel, status, sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      params.member.id || 'system',
      'CRISIS_NOTIFICATION',
      `[${params.urgency}] Crisis Management Alert`,
      params.message,
      'email',
      'SENT'
    ]);

    console.log(`Crisis notification sent to ${params.member.email}`);

  } catch (error) {
    console.error('Error notifying team member:', error);
    throw error;
  }
}

/**
 * Evaluate escalation condition
 */
export async function evaluateEscalationCondition(params: EscalationEvaluationParams): Promise<boolean> {
  try {
    // Parse escalation condition
    const condition = params.condition.toLowerCase();

    // Time-based escalation
    if (condition.includes('time') && condition.includes('minutes')) {
      const minutes = parseInt(condition.match(/(\d+)\s*minutes?/)?.[1] || '0');
      return params.crisisData.timeElapsed >= minutes;
    }

    // Action completion based escalation
    if (condition.includes('actions') && condition.includes('incomplete')) {
      const completionRate = params.crisisData.actionsCompleted / (params.crisisData.totalActions || 1);
      return completionRate < 0.5 && params.crisisData.timeElapsed > 60; // Less than 50% complete after 1 hour
    }

    // Severity-based escalation
    if (condition.includes('severity') && condition.includes('increase')) {
      // Check if new high-severity mentions have appeared
      const recentHighSeverity = await queryOne(`
        SELECT COUNT(*) as count
        FROM mentions
        WHERE priority IN ('HIGH', 'CRITICAL')
        AND created_at >= NOW() - INTERVAL '15 minutes'
      `);

      return (recentHighSeverity?.count || 0) > 3;
    }

    return false;

  } catch (error) {
    console.error('Error evaluating escalation condition:', error);
    return false;
  }
}

/**
 * Check action status
 */
export async function checkActionStatus(params: ActionStatusParams): Promise<string> {
  try {
    // Check if action is completed based on type and automation
    const action = await queryOne(`
      SELECT * FROM crisis_actions WHERE id = $1
    `, [params.actionId]);

    if (!action) {
      return 'PENDING';
    }

    // Auto-complete certain action types based on data
    switch (params.actionType) {
      case 'SOCIAL_MONITOR':
        // Check if enhanced monitoring is active
        const monitoringActive = await queryOne(`
          SELECT COUNT(*) as count FROM workflow_executions
          WHERE workflow_type = 'enhanced_monitoring'
          AND status = 'RUNNING'
          AND started_at >= NOW() - INTERVAL '1 hour'
        `);
        return (monitoringActive?.count || 0) > 0 ? 'COMPLETED' : 'IN_PROGRESS';

      case 'RESPONSE_DRAFT':
        // Check if response has been drafted
        const responseDrafted = await queryOne(`
          SELECT COUNT(*) as count FROM crisis_actions
          WHERE id = $1 AND notes IS NOT NULL AND LENGTH(notes) > 50
        `, [params.actionId]);
        return (responseDrafted?.count || 0) > 0 ? 'COMPLETED' : 'PENDING';

      default:
        return action.status || 'PENDING';
    }

  } catch (error) {
    console.error('Error checking action status:', error);
    return 'PENDING';
  }
}

/**
 * Evaluate resolution readiness
 */
export async function evaluateResolutionReadiness(params: ResolutionEvaluationParams): Promise<any> {
  try {
    // Check recent sentiment trend
    const sentimentTrend = await queryOne(`
      SELECT AVG(sentiment_score) as avg_sentiment
      FROM mentions
      WHERE user_id = $1 AND profile_id = $2
      AND published_at >= NOW() - INTERVAL '2 hours'
    `, [params.userId, params.profileId]);

    // Check mention volume
    const recentVolume = await queryOne(`
      SELECT COUNT(*) as count
      FROM mentions
      WHERE user_id = $1 AND profile_id = $2
      AND published_at >= NOW() - INTERVAL '1 hour'
    `, [params.userId, params.profileId]);

    const avgSentiment = sentimentTrend?.avg_sentiment || 0;
    const hourlyVolume = recentVolume?.count || 0;

    // Calculate resolution score
    const sentimentScore = Math.max(0, (avgSentiment + 1) * 50); // Convert -1,1 to 0,100
    const volumeScore = hourlyVolume < 10 ? 100 : Math.max(0, 100 - hourlyVolume * 2);
    const timeScore = Math.min(100, params.actionsCompleted * 20);

    const overallScore = (sentimentScore + volumeScore + timeScore) / 3;

    return {
      canResolve: overallScore > 70,
      resolutionScore: overallScore,
      factors: {
        sentiment: sentimentScore,
        volume: volumeScore,
        actions: timeScore,
      },
      recommendation: overallScore > 80 ? 'IMMEDIATE_RESOLUTION' :
                     overallScore > 70 ? 'READY_FOR_RESOLUTION' :
                     overallScore > 50 ? 'MONITOR_CLOSELY' : 'CONTINUE_RESPONSE',
    };

  } catch (error) {
    console.error('Error evaluating resolution readiness:', error);
    return {
      canResolve: false,
      resolutionScore: 0,
      recommendation: 'CONTINUE_RESPONSE',
    };
  }
}

/**
 * Send status update
 */
export async function sendStatusUpdate(params: StatusUpdateParams): Promise<void> {
  try {
    const updateMessage = `
      Crisis Status Update - ${params.profileName}

      Time Elapsed: ${params.statusUpdate.timeElapsed} minutes
      Current Level: ${params.statusUpdate.currentLevel}
      Actions Completed: ${params.statusUpdate.actionsCompleted}/${params.statusUpdate.totalActions}
      Team Members Active: ${params.statusUpdate.teamStatus}

      Dashboard: https://dash.repazoo.com/dashboard
    `;

    for (const recipient of params.recipients) {
      await sendNotification({
        to: recipient,
        subject: `Crisis Status Update: ${params.profileName}`,
        text: updateMessage,
      });
    }

    console.log(`Status update sent to ${params.recipients.length} recipients`);

  } catch (error) {
    console.error('Error sending status update:', error);
    throw error;
  }
}

/**
 * Execute automated action
 */
export async function executeAutomatedAction(params: AutomatedActionParams): Promise<any> {
  try {
    const { action, crisisContext } = params;

    switch (action.type) {
      case 'SOCIAL_MONITOR':
        // Increase monitoring frequency
        await query(`
          UPDATE monitoring_sources
          SET scan_frequency = 300, updated_at = NOW()
          WHERE user_id = $1
        `, [crisisContext.userId]);

        return { success: true, message: 'Monitoring frequency increased' };

      case 'RESPONSE_DRAFT':
        // Generate automated response template
        const responseTemplate = generateResponseTemplate(
          crisisContext.severity,
          crisisContext.triggerEvent
        );

        await query(`
          UPDATE crisis_actions
          SET notes = $1, status = 'IN_PROGRESS', updated_at = NOW()
          WHERE id = $2
        `, [responseTemplate, action.id]);

        return { success: true, message: 'Response template generated' };

      default:
        return { success: false, error: 'Unsupported automated action type' };
    }

  } catch (error) {
    console.error('Error executing automated action:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send emergency broadcast
 */
export async function sendEmergencyBroadcast(params: EmergencyBroadcastParams): Promise<void> {
  try {
    const emergencyMessage = `
      🚨 EMERGENCY ALERT 🚨

      ${params.message}

      Profile: ${params.profileName}
      Time: ${new Date().toISOString()}

      IMMEDIATE ACTION REQUIRED
      Dashboard: https://dash.repazoo.com/dashboard
    `;

    for (const recipient of params.recipients) {
      await sendNotification({
        to: recipient,
        subject: `🚨 EMERGENCY: ${params.profileName}`,
        text: emergencyMessage,
        html: `
          <div style="background-color: #dc2626; color: white; padding: 20px; border-radius: 8px;">
            <h1>🚨 EMERGENCY ALERT 🚨</h1>
            <p><strong>${params.message}</strong></p>
            <p><strong>Profile:</strong> ${params.profileName}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <div style="margin-top: 20px; padding: 10px; background-color: #991b1b; border-radius: 4px;">
              <strong>IMMEDIATE ACTION REQUIRED</strong>
            </div>
            <a href="https://dash.repazoo.com/dashboard"
               style="display: inline-block; margin-top: 15px; padding: 10px 20px;
                      background-color: white; color: #dc2626; text-decoration: none;
                      font-weight: bold; border-radius: 4px;">
              → ACCESS CRISIS DASHBOARD
            </a>
          </div>
        `,
      });
    }

    console.log(`Emergency broadcast sent to ${params.recipients.length} recipients`);

  } catch (error) {
    console.error('Error sending emergency broadcast:', error);
    throw error;
  }
}

/**
 * Conclude crisis
 */
export async function concludeCrisis(params: ConcludeCrisisParams): Promise<void> {
  try {
    await query(`
      UPDATE crisis_events
      SET
        status = $1,
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE user_id = $2 AND profile_id = $3 AND status = 'ACTIVE'
    `, [params.resolution, params.userId, params.profileId]);

    console.log(`Crisis concluded for profile ${params.profileId}: ${params.resolution}`);

  } catch (error) {
    console.error('Error concluding crisis:', error);
    throw error;
  }
}

/**
 * Generate crisis report
 */
export async function generateCrisisReport(params: CrisisReportParams): Promise<void> {
  try {
    const report = {
      profileName: params.profileName,
      duration: `${params.duration} minutes`,
      timeline: params.crisisTimeline,
      metrics: params.metrics,
      summary: `Crisis management completed for ${params.profileName} after ${params.duration} minutes.
                ${params.metrics.actionsCompleted} actions completed. Final escalation level: ${params.metrics.finalLevel}.`,
      generatedAt: new Date().toISOString(),
    };

    // Save report to database
    await query(`
      INSERT INTO crisis_reports (
        user_id, profile_name, duration_minutes, report_data, created_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `, [
      params.userId,
      params.profileName,
      params.duration,
      JSON.stringify(report),
    ]);

    console.log(`Crisis report generated for ${params.profileName}`);

  } catch (error) {
    console.error('Error generating crisis report:', error);
    throw error;
  }
}

// Helper functions
function calculateImpactScore(triggerEvent: any, sentimentStats: any): number {
  let score = 50; // Base score

  // Adjust based on sentiment
  if (sentimentStats?.avg_sentiment < -0.5) score += 30;
  else if (sentimentStats?.avg_sentiment < -0.2) score += 15;

  // Adjust based on volume
  if (sentimentStats?.total_mentions > 50) score += 20;
  else if (sentimentStats?.total_mentions > 20) score += 10;

  // Adjust based on negative ratio
  const negativeRatio = (sentimentStats?.negative_count || 0) / (sentimentStats?.total_mentions || 1);
  if (negativeRatio > 0.7) score += 25;
  else if (negativeRatio > 0.5) score += 15;

  return Math.min(100, Math.max(0, score));
}

function generateAssessmentSummary(triggerEvent: any, sentimentStats: any): string {
  const negativeMentions = sentimentStats?.negative_count || 0;
  const totalMentions = sentimentStats?.total_mentions || 0;
  const avgSentiment = sentimentStats?.avg_sentiment || 0;

  return `Crisis triggered by ${triggerEvent.type}.
          ${totalMentions} recent mentions with ${negativeMentions} negative.
          Average sentiment: ${avgSentiment.toFixed(2)}.
          Estimated reach: ${triggerEvent.estimatedReach || 'Unknown'}.`;
}

function extractAffectedChannels(mentions: any[]): string[] {
  const channels = new Set<string>();
  mentions.forEach(mention => {
    if (mention.source_type) channels.add(mention.source_type);
  });
  return Array.from(channels);
}

function generateRecommendedActions(severity: string, impactScore: number): string[] {
  const baseActions = ['Monitor social media', 'Assess impact', 'Notify stakeholders'];

  switch (severity) {
    case 'CRITICAL':
      return [...baseActions, 'Executive briefing', 'Legal review', 'Media response', 'Crisis communications'];
    case 'HIGH':
      return [...baseActions, 'Team assembly', 'Response strategy', 'Stakeholder outreach'];
    case 'MEDIUM':
      return [...baseActions, 'Response planning', 'Content review'];
    default:
      return baseActions;
  }
}

function estimateCrisisDuration(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return '12-48 hours';
    case 'HIGH': return '4-12 hours';
    case 'MEDIUM': return '2-6 hours';
    default: return '1-2 hours';
  }
}

function identifyStakeholders(severity: string): string[] {
  const baseStakeholders = ['PR Team', 'Social Media Manager'];

  switch (severity) {
    case 'CRITICAL':
      return [...baseStakeholders, 'CEO', 'Legal Counsel', 'Board Members', 'Investors'];
    case 'HIGH':
      return [...baseStakeholders, 'CMO', 'Executive Team', 'Key Customers'];
    case 'MEDIUM':
      return [...baseStakeholders, 'Marketing Team', 'Customer Support'];
    default:
      return baseStakeholders;
  }
}

function generateResponseTemplate(severity: string, triggerEvent: any): string {
  return `
    Response Template - ${severity} Crisis

    Situation: ${triggerEvent.description}

    Key Points:
    - Acknowledge the situation
    - Express commitment to resolution
    - Provide factual information
    - Outline next steps

    Tone: ${severity === 'CRITICAL' ? 'Urgent and authoritative' : 'Professional and reassuring'}

    Approval Required: ${severity === 'CRITICAL' ? 'Executive' : 'Team Lead'}
  `;
}