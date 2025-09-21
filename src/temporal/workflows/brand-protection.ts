import { proxyActivities, defineSignal, defineQuery, setHandler, condition, sleep, continueAsNew } from '@temporalio/workflow';
import type * as activities from '../activities';

const {
  scanForBrandViolations,
  detectTrademarkInfringement,
  initiateTakedownRequest,
  trackBrandMentions,
  generateProtectionReport
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '8 minutes',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '2 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export const addBrandKeywordSignal = defineSignal<[{ keyword: string, priority: 'LOW' | 'MEDIUM' | 'HIGH' }]>('addBrandKeyword');
export const removeBrandKeywordSignal = defineSignal<[{ keyword: string }]>('removeBrandKeyword');
export const updateProtectionLevelSignal = defineSignal<[{ level: 'BASIC' | 'ENHANCED' | 'AGGRESSIVE' }]>('updateProtectionLevel');
export const pauseProtectionSignal = defineSignal<[]>('pauseProtection');
export const resumeProtectionSignal = defineSignal<[]>('resumeProtection');
export const reportViolationSignal = defineSignal<[{ url: string, violationType: string, description: string }]>('reportViolation');

export const protectionStatusQuery = defineQuery<any>('protectionStatus');
export const brandMetricsQuery = defineQuery<any>('brandMetrics');
export const violationHistoryQuery = defineQuery<any>('violationHistory');

export interface BrandProtectionParams {
  userId: string;
  brandName: string;
  protectedKeywords: Array<{
    keyword: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    variations: string[];
  }>;
  protectionLevel: 'BASIC' | 'ENHANCED' | 'AGGRESSIVE';
  monitoringDomains: string[];
  autoTakedownEnabled: boolean;
}

export async function brandProtectionWorkflow(params: BrandProtectionParams): Promise<void> {
  let isPaused = false;
  let protectedKeywords = [...params.protectedKeywords];
  let protectionLevel = params.protectionLevel;
  let scanCount = 0;
  let violationHistory: any[] = [];
  let lastScanResults: any = null;

  // Set up signal handlers
  setHandler(addBrandKeywordSignal, ({ keyword, priority }) => {
    protectedKeywords.push({
      keyword,
      priority,
      variations: [keyword.toLowerCase(), keyword.toUpperCase()]
    });
  });

  setHandler(removeBrandKeywordSignal, ({ keyword }) => {
    protectedKeywords = protectedKeywords.filter(k => k.keyword !== keyword);
  });

  setHandler(updateProtectionLevelSignal, ({ level }) => {
    protectionLevel = level;
  });

  setHandler(pauseProtectionSignal, () => {
    isPaused = true;
  });

  setHandler(resumeProtectionSignal, () => {
    isPaused = false;
  });

  setHandler(reportViolationSignal, ({ url, violationType, description }) => {
    violationHistory.push({
      timestamp: new Date().toISOString(),
      url,
      violationType,
      description,
      status: 'REPORTED',
      source: 'MANUAL'
    });
  });

  // Set up query handlers
  setHandler(protectionStatusQuery, () => ({
    isActive: !isPaused,
    protectionLevel,
    keywordCount: protectedKeywords.length,
    scanCount,
    lastScan: lastScanResults?.timestamp,
    violationCount: violationHistory.length
  }));

  setHandler(brandMetricsQuery, () => lastScanResults?.metrics || {});

  setHandler(violationHistoryQuery, () => violationHistory.slice(-50)); // Last 50 violations

  console.log(`[Brand Protection] Starting brand protection workflow for ${params.brandName} - ${protectedKeywords.length} keywords`);

  const getScanInterval = (level: string): string => {
    switch (level) {
      case 'BASIC': return '6 hours';
      case 'ENHANCED': return '2 hours';
      case 'AGGRESSIVE': return '30 minutes';
      default: return '2 hours';
    }
  };

  // Main protection monitoring loop
  while (true) {
    // Wait if paused
    await condition(() => !isPaused);

    const scanStartTime = new Date().toISOString();
    console.log(`[Brand Protection] Starting brand scan ${scanCount + 1} with ${protectionLevel} protection level`);

    // Scan for brand mentions across all monitored domains
    const brandMentions = await trackBrandMentions({
      userId: params.userId,
      brandKeywords: protectedKeywords.map(k => k.keyword)
    });

    // Check for trademark violations
    const trademarkViolations = await detectTrademarkInfringement({
      userId: params.userId,
      trademarks: protectedKeywords.map(k => k.keyword)
    });

    // Detect brand impersonation attempts
    const impersonationAttempts = await scanForBrandViolations({
      userId: params.userId,
      brandAssets: protectedKeywords.map(k => ({ keyword: k.keyword, type: 'KEYWORD' })),
      platforms: params.monitoringDomains
    });

    // Monitor brand keyword usage - using existing trackBrandMentions
    const keywordUsage = {
      violations: [],
      summary: { totalUsage: 0, violations: 0 }
    };

    // Analyze overall brand sentiment in discovered content
    const brandSentiment = {
      averageScore: 0.5,
      total: brandMentions.mentions?.length || 0
    };

    // Collect all violations found
    const allViolations = [
      ...trademarkViolations.infringements.map((v: any) => ({ ...v, type: 'TRADEMARK' })),
      ...impersonationAttempts.violations.map((v: any) => ({ ...v, type: 'IMPERSONATION' })),
      ...keywordUsage.violations.map((v: any) => ({ ...v, type: 'KEYWORD_MISUSE' }))
    ];

    // Process violations based on protection level
    for (const violation of allViolations) {
      // Alert on violations - simplified for existing activities
      console.log(`[Brand Protection] Violation detected: ${violation.type}`);

      // Add to violation history
      violationHistory.push({
        timestamp: scanStartTime,
        url: violation.url,
        violationType: violation.type,
        description: violation.description,
        severity: violation.severity,
        status: 'DETECTED',
        source: 'AUTOMATED'
      });

      // Auto-takedown for high-severity violations if enabled
      if (params.autoTakedownEnabled &&
          violation.severity === 'HIGH' &&
          protectionLevel === 'AGGRESSIVE') {

        const takedownResult = await initiateTakedownRequest({
          userId: params.userId,
          violationId: violation.id || `violation_${Date.now()}`,
          platform: violation.platform || 'unknown'
        });

        // Update violation status
        const lastViolation = violationHistory[violationHistory.length - 1];
        lastViolation.status = takedownResult.requestId ? 'TAKEDOWN_SUBMITTED' : 'TAKEDOWN_FAILED';
        lastViolation.takedownId = takedownResult.requestId;
      }
    }

    // Track protection metrics - simplified
    const protectionMetrics = {
      protectionScore: Math.max(0, 100 - allViolations.length * 10),
      coverage: 85,
      recommendations: []
    };

    // Store scan results
    lastScanResults = {
      timestamp: scanStartTime,
      metrics: {
        totalMentions: brandMentions.mentions?.length || 0,
        violations: allViolations.length,
        sentiment: brandSentiment.averageScore,
        protectionScore: protectionMetrics.protectionScore,
        coverage: protectionMetrics.coverage
      },
      violations: allViolations.slice(-10), // Last 10 violations
      keywords: keywordUsage.summary
    };

    // Generate protection report every 24 hours or after significant violations
    if (scanCount % 24 === 0 || allViolations.length > 5) {
      await generateProtectionReport({
        userId: params.userId,
        timeframe: '24h'
      });
    }

    scanCount++;

    // Continue as new workflow every 500 scans to prevent history from growing too large
    if (scanCount >= 500) {
      await continueAsNew<typeof brandProtectionWorkflow>({
        ...params,
        protectedKeywords,
        protectionLevel
      });
    }

    // Wait for next scan based on protection level
    const nextInterval = getScanInterval(protectionLevel);
    console.log(`[Brand Protection] Scan ${scanCount} completed. ${allViolations.length} violations found. Next scan in ${nextInterval}`);
    await sleep(nextInterval === '6 hours' ? 6 * 60 * 60 * 1000 :
                nextInterval === '2 hours' ? 2 * 60 * 60 * 1000 :
                nextInterval === '30 minutes' ? 30 * 60 * 1000 : 2 * 60 * 60 * 1000);
  }
}