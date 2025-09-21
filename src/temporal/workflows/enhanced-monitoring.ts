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
import type * as activities from '../activities/monitoring';

// Configure activity options for different types of activities
const standardActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  retry: {
    initialInterval: '5 seconds',
    maximumInterval: '1 minute',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

const longRunningActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    initialInterval: '10 seconds',
    maximumInterval: '5 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 2,
  },
});

const criticalActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '30 seconds',
    backoffCoefficient: 1.5,
    maximumAttempts: 5,
  },
});

// Enhanced workflow parameters for multi-tenant support
export interface EnhancedMonitoringParams {
  userId: string;
  tenantId: string;
  profileId: string;
  profileName: string;
  keywords: string[];
  excludedKeywords?: string[];
  sources: MonitoringSource[];
  scanIntervalMinutes?: number;
  alertThresholds?: AlertThresholds;
  priorityKeywords?: string[];
  maxMentionsPerScan?: number;
}

export interface MonitoringSource {
  id: string;
  type: 'TWITTER' | 'LINKEDIN' | 'REDDIT' | 'NEWS' | 'FORUM' | 'BLOG' | 'REVIEW';
  name: string;
  url?: string;
  searchQuery: string;
  config: Record<string, any>;
  scanFrequency: number; // minutes
  isActive: boolean;
  lastScanAt?: string;
}

export interface AlertThresholds {
  negativeSentimentThreshold: number; // 0-1
  volumeIncreaseThreshold: number; // percentage
  reachThreshold: number; // absolute number
  criticalKeywords: string[];
}

export interface MonitoringStatus {
  isRunning: boolean;
  isPaused: boolean;
  lastScanTime?: string;
  nextScanTime?: string;
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  totalMentionsFound: number;
  sourcesMonitored: number;
  currentReputationScore: number;
  alertsTriggered: number;
  averageSentiment: number;
  lastError?: string;
}

export interface ScanResult {
  sourceId: string;
  sourceName: string;
  mentionsFound: number;
  newMentions: number;
  averageSentiment: number;
  highPriorityMentions: number;
  errors?: string[];
  processingTime: number;
}

// Signals for workflow control
export const pauseMonitoringSignal = defineSignal<[]>('pauseMonitoring');
export const resumeMonitoringSignal = defineSignal<[]>('resumeMonitoring');
export const forceScenSignal = defineSignal<[]>('forceScan');
export const updateSourcesSignal = defineSignal<[MonitoringSource[]]>('updateSources');
export const updateThresholdsSignal = defineSignal<[AlertThresholds]>('updateThresholds');
export const emergencyStopSignal = defineSignal<[]>('emergencyStop');

// Queries for real-time status
export const getMonitoringStatusQuery = defineQuery<MonitoringStatus>('getMonitoringStatus');
export const getRecentScansQuery = defineQuery<ScanResult[]>('getRecentScans');
export const getSourceStatusQuery = defineQuery<Record<string, any>>('getSourceStatus');

/**
 * Enhanced Monitoring Workflow with multi-tenant support, advanced features,
 * crisis detection, and comprehensive reputation management
 */
export async function enhancedMonitoringWorkflow(
  params: EnhancedMonitoringParams
): Promise<void> {
  log.info('Starting enhanced monitoring workflow', {
    userId: params.userId,
    tenantId: params.tenantId,
    profileId: params.profileId,
    profileName: params.profileName,
  });

  // Workflow state
  let isPaused = false;
  let isEmergencyStopped = false;
  let scanCount = 0;
  let successfulScans = 0;
  let failedScans = 0;
  let totalMentionsFound = 0;
  let alertsTriggered = 0;
  let currentSources = params.sources;
  let alertThresholds = params.alertThresholds || getDefaultAlertThresholds();
  let recentScans: ScanResult[] = [];
  let lastError: string | undefined;
  let currentReputationScore = 50; // Start with neutral score
  let lastScanTime: string | undefined;

  // Set up signal handlers
  setHandler(pauseMonitoringSignal, () => {
    isPaused = true;
    log.info('Monitoring paused by signal');
  });

  setHandler(resumeMonitoringSignal, () => {
    isPaused = false;
    log.info('Monitoring resumed by signal');
  });

  setHandler(forceScenSignal, async () => {
    if (!isPaused && !isEmergencyStopped) {
      log.info('Force scan triggered by signal');
      await performScan();
    }
  });

  setHandler(updateSourcesSignal, (newSources: MonitoringSource[]) => {
    currentSources = newSources;
    log.info('Monitoring sources updated', { sourceCount: newSources.length });
  });

  setHandler(updateThresholdsSignal, (newThresholds: AlertThresholds) => {
    alertThresholds = newThresholds;
    log.info('Alert thresholds updated');
  });

  setHandler(emergencyStopSignal, () => {
    isEmergencyStopped = true;
    log.warn('Emergency stop triggered!');
  });

  // Set up query handlers
  setHandler(getMonitoringStatusQuery, (): MonitoringStatus => ({
    isRunning: !isPaused && !isEmergencyStopped,
    isPaused,
    lastScanTime,
    nextScanTime: getNextScanTime(),
    totalScans: scanCount,
    successfulScans,
    failedScans,
    totalMentionsFound,
    sourcesMonitored: currentSources.filter(s => s.isActive).length,
    currentReputationScore,
    alertsTriggered,
    averageSentiment: calculateAverageSentiment(),
    lastError,
  }));

  setHandler(getRecentScansQuery, (): ScanResult[] => recentScans.slice(-10));

  setHandler(getSourceStatusQuery, () => getSourceStatusSummary());

  // Main monitoring loop
  while (!isEmergencyStopped) {
    try {
      // Wait for scan interval or until resumed if paused
      if (isPaused) {
        await condition(() => !isPaused || isEmergencyStopped);
        if (isEmergencyStopped) break;
      }

      // Perform scan if not paused
      if (!isPaused) {
        await performScan();
      }

      // Sleep until next scan interval
      const sleepDuration = (params.scanIntervalMinutes || 60) * 60 * 1000; // Convert to milliseconds
      await sleep(sleepDuration);

      // Continue as new workflow every 100 scans to prevent history bloat
      if (scanCount >= 100) {
        await continueAsNew<typeof enhancedMonitoringWorkflow>({
          ...params,
          sources: currentSources,
          alertThresholds,
        });
      }

    } catch (error) {
      failedScans++;
      lastError = error instanceof Error ? error.message : 'Unknown error';
      log.error('Monitoring workflow error', { error: lastError });

      // Sleep before retrying
      await sleep(30000); // 30 seconds
    }
  }

  log.info('Enhanced monitoring workflow stopped', {
    totalScans: scanCount,
    successfulScans,
    failedScans,
  });

  // Perform scan function
  async function performScan(): Promise<void> {
    scanCount++;
    lastScanTime = new Date().toISOString();

    log.info('Starting scan', { scanNumber: scanCount });

    const scanResults: ScanResult[] = [];
    let scanSuccess = true;
    let totalNewMentions = 0;

    try {
      // Get active sources for this profile
      const activeSources = currentSources.filter(source => source.isActive);

      if (activeSources.length === 0) {
        log.warn('No active sources found for monitoring');
        return;
      }

      // Scan each source
      for (const source of activeSources) {
        try {
          const startTime = Date.now();

          // Scrape mentions from this source
          const mentions = await standardActivities.scrapeSource({
            userId: params.userId,
            tenantId: params.tenantId,
            profileId: params.profileId,
            source,
            keywords: params.keywords,
            excludedKeywords: params.excludedKeywords || [],
            maxResults: params.maxMentionsPerScan || 100,
          });

          const processingTime = Date.now() - startTime;

          // Analyze sentiment for new mentions
          let averageSentiment = 0;
          let highPriorityCount = 0;

          if (mentions.length > 0) {
            for (const mention of mentions) {
              const sentimentResult = await standardActivities.analyzeMentionSentiment({
                mentionId: mention.id,
                text: mention.content,
                priorityKeywords: params.priorityKeywords || [],
              });

              averageSentiment += sentimentResult.sentimentScore;
              if (sentimentResult.priority === 'HIGH' || sentimentResult.priority === 'CRITICAL') {
                highPriorityCount++;
              }
            }
            averageSentiment = averageSentiment / mentions.length;
          }

          // Update source scan status
          await standardActivities.updateSourceScanStatus({
            sourceId: source.id,
            lastScanAt: new Date().toISOString(),
            mentionsFound: mentions.length,
            status: 'SUCCESS',
          });

          const scanResult: ScanResult = {
            sourceId: source.id,
            sourceName: source.name,
            mentionsFound: mentions.length,
            newMentions: mentions.length, // All mentions are new in this context
            averageSentiment,
            highPriorityMentions: highPriorityCount,
            processingTime,
          };

          scanResults.push(scanResult);
          totalNewMentions += mentions.length;

          log.info('Source scan completed', {
            source: source.name,
            mentions: mentions.length,
            sentiment: averageSentiment,
            highPriority: highPriorityCount,
          });

        } catch (sourceError) {
          scanSuccess = false;
          const errorMessage = sourceError instanceof Error ? sourceError.message : 'Unknown source error';

          await standardActivities.updateSourceScanStatus({
            sourceId: source.id,
            lastScanAt: new Date().toISOString(),
            mentionsFound: 0,
            status: 'ERROR',
            errorMessage,
          });

          scanResults.push({
            sourceId: source.id,
            sourceName: source.name,
            mentionsFound: 0,
            newMentions: 0,
            averageSentiment: 0,
            highPriorityMentions: 0,
            errors: [errorMessage],
            processingTime: 0,
          });

          log.error('Source scan failed', { source: source.name, error: errorMessage });
        }
      }

      // Update workflow statistics
      totalMentionsFound += totalNewMentions;
      recentScans = [...recentScans, ...scanResults].slice(-20); // Keep last 20 scans

      if (scanSuccess) {
        successfulScans++;
        lastError = undefined;
      } else {
        failedScans++;
      }

      // Calculate reputation score
      const reputationScore = await standardActivities.calculateReputationScore({
        userId: params.userId,
        profileId: params.profileId,
        timeframeHours: 24,
      });
      currentReputationScore = reputationScore;

      // Check for alerts
      await checkAndTriggerAlerts(scanResults, reputationScore);

      // Send progress notification if configured
      if (totalNewMentions > 0) {
        await standardActivities.sendProgressNotification({
          userId: params.userId,
          profileName: params.profileName,
          mentionsFound: totalNewMentions,
          reputationScore,
          scanResults,
        });
      }

      log.info('Scan completed successfully', {
        sourcesScanned: activeSources.length,
        totalMentions: totalNewMentions,
        reputationScore,
      });

    } catch (error) {
      scanSuccess = false;
      failedScans++;
      lastError = error instanceof Error ? error.message : 'Unknown scan error';
      log.error('Scan failed completely', { error: lastError });
    }
  }

  // Check alerts and trigger if thresholds are met
  async function checkAndTriggerAlerts(scanResults: ScanResult[], reputationScore: number): Promise<void> {
    try {
      const alerts = [];

      // Check negative sentiment threshold
      const averageSentiment = scanResults.reduce((sum, r) => sum + r.averageSentiment, 0) / scanResults.length;
      if (averageSentiment < -alertThresholds.negativeSentimentThreshold) {
        alerts.push({
          type: 'NEGATIVE_SENTIMENT',
          severity: 'HIGH',
          message: `Average sentiment (${averageSentiment.toFixed(2)}) below threshold`,
        });
      }

      // Check volume increase
      const totalMentions = scanResults.reduce((sum, r) => sum + r.mentionsFound, 0);
      if (totalMentions > alertThresholds.volumeIncreaseThreshold) {
        alerts.push({
          type: 'VOLUME_SPIKE',
          severity: 'MEDIUM',
          message: `High mention volume detected: ${totalMentions} mentions`,
        });
      }

      // Check reputation score drop
      if (reputationScore < 30) {
        alerts.push({
          type: 'REPUTATION_DROP',
          severity: 'CRITICAL',
          message: `Reputation score dropped to ${reputationScore}`,
        });
      }

      // Check high priority mentions
      const highPriorityTotal = scanResults.reduce((sum, r) => sum + r.highPriorityMentions, 0);
      if (highPriorityTotal > 0) {
        alerts.push({
          type: 'HIGH_PRIORITY_MENTIONS',
          severity: 'HIGH',
          message: `${highPriorityTotal} high priority mentions detected`,
        });
      }

      // Trigger alerts if any were found
      if (alerts.length > 0) {
        alertsTriggered += alerts.length;

        await criticalActivities.triggerAlerts({
          userId: params.userId,
          profileId: params.profileId,
          profileName: params.profileName,
          alerts,
          scanResults,
          reputationScore,
        });

        log.warn('Alerts triggered', { alertCount: alerts.length, alerts });
      }

    } catch (error) {
      log.error('Failed to check alerts', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Helper functions
  function getDefaultAlertThresholds(): AlertThresholds {
    return {
      negativeSentimentThreshold: 0.3,
      volumeIncreaseThreshold: 50, // 50% increase
      reachThreshold: 10000,
      criticalKeywords: ['crisis', 'scandal', 'lawsuit', 'fraud', 'fired'],
    };
  }

  function getNextScanTime(): string {
    const nextScan = new Date(Date.now() + (params.scanIntervalMinutes || 60) * 60 * 1000);
    return nextScan.toISOString();
  }

  function calculateAverageSentiment(): number {
    if (recentScans.length === 0) return 0;
    const sum = recentScans.reduce((total, scan) => total + scan.averageSentiment, 0);
    return sum / recentScans.length;
  }

  function getSourceStatusSummary(): Record<string, any> {
    return currentSources.reduce((status, source) => {
      const recentScanForSource = recentScans.find(scan => scan.sourceId === source.id);
      status[source.id] = {
        name: source.name,
        type: source.type,
        isActive: source.isActive,
        lastScan: source.lastScanAt,
        recentMentions: recentScanForSource?.mentionsFound || 0,
        averageSentiment: recentScanForSource?.averageSentiment || 0,
        errors: recentScanForSource?.errors || [],
      };
      return status;
    }, {} as Record<string, any>);
  }
}

export {
  enhancedMonitoringWorkflow as monitoringWorkflow, // Export for backward compatibility
};