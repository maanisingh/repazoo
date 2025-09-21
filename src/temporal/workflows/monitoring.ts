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
} from '@temporalio/workflow';
import type * as activities from '../activities/monitoring';

// Configure activity options
const {
  getUserMonitoringSources,
  scrapeSource,
  getMonitoringStats,
  updateSourceScanStatus,
  analyzeMentionSentiment,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  retry: {
    initialInterval: '5 seconds',
    maximumInterval: '1 minute',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export interface MonitoringWorkflowParams {
  userId: string;
  scanIntervalMinutes?: number;
  maxIterations?: number;
}

export interface MonitoringStatus {
  isRunning: boolean;
  lastScanTime?: string;
  nextScanTime?: string;
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  totalMentionsFound: number;
  sourcesMonitored: number;
}

// Signals for controlling the workflow
export const pauseMonitoringSignal = defineSignal<[]>('pauseMonitoring');
export const resumeMonitoringSignal = defineSignal<[]>('resumeMonitoring');
export const forceScenSignal = defineSignal<[]>('forceScan');
export const updateIntervalSignal = defineSignal<[number]>('updateInterval');

// Queries for checking status
export const getMonitoringStatusQuery = defineQuery<MonitoringStatus>('getMonitoringStatus');

export async function monitoringWorkflow(
  params: MonitoringWorkflowParams
): Promise<void> {
  let status: MonitoringStatus = {
    isRunning: true,
    totalScans: 0,
    successfulScans: 0,
    failedScans: 0,
    totalMentionsFound: 0,
    sourcesMonitored: 0,
  };

  let scanInterval = params.scanIntervalMinutes || 60; // Default 1 hour
  let isPaused = false;
  let forceScan = false;

  const maxIterations = params.maxIterations || 1000; // Prevent infinite workflows

  // Set up signal handlers
  setHandler(pauseMonitoringSignal, () => {
    isPaused = true;
    status.isRunning = false;
    console.log(`[Workflow] Monitoring paused for user ${params.userId}`);
  });

  setHandler(resumeMonitoringSignal, () => {
    isPaused = false;
    status.isRunning = true;
    console.log(`[Workflow] Monitoring resumed for user ${params.userId}`);
  });

  setHandler(forceScenSignal, () => {
    forceScan = true;
    console.log(`[Workflow] Force scan triggered for user ${params.userId}`);
  });

  setHandler(updateIntervalSignal, (newInterval: number) => {
    scanInterval = Math.max(5, newInterval); // Minimum 5 minutes
    console.log(`[Workflow] Scan interval updated to ${scanInterval} minutes for user ${params.userId}`);
  });

  setHandler(getMonitoringStatusQuery, () => status);

  console.log(`[Workflow] Starting monitoring workflow for user ${params.userId} with ${scanInterval}min interval`);

  try {
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Calculate next scan time
      status.nextScanTime = new Date(Date.now() + scanInterval * 60 * 1000).toISOString();

      // Wait for the scan interval or force scan signal
      if (!forceScan && !isPaused) {
        await condition(() => forceScan || isPaused, `${scanInterval} minutes`);
      }

      // Skip scan if paused (unless force scan)
      if (isPaused && !forceScan) {
        await condition(() => !isPaused || forceScan, '1 hour'); // Check every hour if still paused
        continue;
      }

      // Reset force scan flag
      if (forceScan) {
        forceScan = false;
      }

      // Skip if still paused after force scan check
      if (isPaused) {
        continue;
      }

      // Perform the monitoring scan
      console.log(`[Workflow] Starting scan iteration ${iteration + 1} for user ${params.userId}`);

      try {
        // Get user's monitoring sources
        const sources = await getUserMonitoringSources(params.userId);
        status.sourcesMonitored = sources.length;

        if (sources.length === 0) {
          console.log(`[Workflow] No monitoring sources found for user ${params.userId}`);
          status.lastScanTime = new Date().toISOString();
          status.successfulScans++;
          status.totalScans++;
          continue;
        }

        // Scrape all sources concurrently
        const scrapePromises = sources.map(async source => {
          try {
            const result = await scrapeSource({
              sourceId: source.id,
              userId: params.userId,
              searchQuery: `user-${params.userId}`, // This would be the actual search term
              sourceUrl: source.url,
              sourceType: source.sourceType,
            });

            // Update source status
            await updateSourceScanStatus(
              source.id,
              result.success ? 'success' : 'error',
              result.error
            );

            return result;
          } catch (error) {
            console.error(`[Workflow] Error scraping source ${source.id}:`, error);
            await updateSourceScanStatus(source.id, 'error', error.message);
            return {
              sourceId: source.id,
              newMentions: 0,
              totalProcessed: 0,
              success: false,
              error: error.message,
              scannedAt: new Date().toISOString(),
            };
          }
        });

        const results = await Promise.all(scrapePromises);

        // Process results
        let scanSuccess = true;
        let totalNewMentions = 0;

        for (const result of results) {
          if (result.success) {
            totalNewMentions += result.newMentions;
          } else {
            scanSuccess = false;
          }
        }

        // Update status
        status.lastScanTime = new Date().toISOString();
        status.totalScans++;
        status.totalMentionsFound += totalNewMentions;

        if (scanSuccess) {
          status.successfulScans++;
        } else {
          status.failedScans++;
        }

        console.log(`[Workflow] Scan completed for user ${params.userId}: ${totalNewMentions} new mentions found`);

      } catch (error) {
        console.error(`[Workflow] Scan iteration ${iteration + 1} failed for user ${params.userId}:`, error);
        status.totalScans++;
        status.failedScans++;
        status.lastScanTime = new Date().toISOString();
      }

      // Prevent workflow from running too long - continue as new after many iterations
      if (iteration >= maxIterations - 1) {
        console.log(`[Workflow] Reaching max iterations, continuing as new workflow for user ${params.userId}`);
        await continueAsNew<typeof monitoringWorkflow>(params);
        // Continue with same parameters
        // userId: params.userId,
        // scanIntervalMinutes: scanInterval,
        // maxIterations: params.maxIterations
      }
    }

  } catch (error) {
    if (error instanceof ContinueAsNew) {
      throw error; // Re-throw ContinueAsNew
    }
    console.error(`[Workflow] Monitoring workflow failed for user ${params.userId}:`, error);
    throw error;
  }

  console.log(`[Workflow] Monitoring workflow completed for user ${params.userId}`);
}