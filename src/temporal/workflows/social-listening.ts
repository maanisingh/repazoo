import { proxyActivities, defineSignal, defineQuery, setHandler, condition, sleep, continueAsNew } from '@temporalio/workflow';
import type * as activities from '../activities';

const {
  scanSocialPlatforms,
  analyzeTrendingTopics,
  trackHashtagPerformance,
  monitorBrandMentions,
  detectInfluencerMentions,
  analyzeCompetitorActivity,
  trackViralContent,
  generateSocialInsights,
  alertSocialOpportunity,
  updateSocialDatabase
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '2 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export const addKeywordSignal = defineSignal<[{ keyword: string, priority: 'LOW' | 'MEDIUM' | 'HIGH', category: string }]>('addKeyword');
export const removeKeywordSignal = defineSignal<[{ keyword: string }]>('removeKeyword');
export const updatePlatformsSignal = defineSignal<[{ platforms: string[] }]>('updatePlatforms');
export const pauseListeningSignal = defineSignal<[]>('pauseListening');
export const resumeListeningSignal = defineSignal<[]>('resumeListening');
export const setAlertThresholdSignal = defineSignal<[{ type: string, threshold: number }]>('setAlertThreshold');

export const listeningStatusQuery = defineQuery<any>('listeningStatus');
export const trendingTopicsQuery = defineQuery<any>('trendingTopics');
export const socialMetricsQuery = defineQuery<any>('socialMetrics');
export const opportunityAlertsQuery = defineQuery<any>('opportunityAlerts');

export interface SocialListeningParams {
  userId: string;
  trackedKeywords: Array<{
    keyword: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    category: string;
    variations: string[];
  }>;
  platforms: string[];
  competitors: string[];
  industry: string;
  alertThresholds: {
    viralThreshold: number;
    mentionSpike: number;
    sentimentDrop: number;
    competitorActivity: number;
  };
  listeningFrequency: string; // e.g., 'real-time', 'hourly', 'daily'
}

export async function socialListeningWorkflow(params: SocialListeningParams): Promise<void> {
  let isPaused = false;
  let trackedKeywords = [...params.trackedKeywords];
  let monitoredPlatforms = [...params.platforms];
  let alertThresholds = { ...params.alertThresholds };
  let listeningCycles = 0;
  let socialDatabase: any[] = [];
  let trendingData: any[] = [];
  let alerts: any[] = [];
  let lastScan: any = null;

  // Set up signal handlers
  setHandler(addKeywordSignal, ({ keyword, priority, category }) => {
    trackedKeywords.push({
      keyword,
      priority,
      category,
      variations: [keyword.toLowerCase(), keyword.toUpperCase(), `#${keyword}`]
    });
  });

  setHandler(removeKeywordSignal, ({ keyword }) => {
    trackedKeywords = trackedKeywords.filter(k => k.keyword !== keyword);
  });

  setHandler(updatePlatformsSignal, ({ platforms }) => {
    monitoredPlatforms = platforms;
  });

  setHandler(pauseListeningSignal, () => {
    isPaused = true;
  });

  setHandler(resumeListeningSignal, () => {
    isPaused = false;
  });

  setHandler(setAlertThresholdSignal, ({ type, threshold }) => {
    (alertThresholds as any)[type] = threshold;
  });

  // Set up query handlers
  setHandler(listeningStatusQuery, () => ({
    isActive: !isPaused,
    platforms: monitoredPlatforms.length,
    keywords: trackedKeywords.length,
    cycles: listeningCycles,
    lastScan: lastScan?.timestamp,
    alertThresholds
  }));

  setHandler(trendingTopicsQuery, () => trendingData.slice(-20)); // Last 20 trending topics

  setHandler(socialMetricsQuery, () => lastScan?.metrics || {});

  setHandler(opportunityAlertsQuery, () => alerts.slice(-50)); // Last 50 alerts

  console.log(`[Social] Starting social listening workflow for ${trackedKeywords.length} keywords across ${monitoredPlatforms.length} platforms`);

  const getListeningInterval = (frequency: string): string => {
    switch (frequency) {
      case 'real-time': return '5 minutes';
      case 'hourly': return '1 hour';
      case 'daily': return '24 hours';
      default: return '1 hour';
    }
  };

  // Main listening loop
  while (true) {
    // Wait if paused
    await condition(() => !isPaused);

    const scanStartTime = new Date().toISOString();
    console.log(`[Social] Starting listening cycle ${listeningCycles + 1}`);

    const cycleData: any = {
      timestamp: scanStartTime,
      platformData: {},
      mentions: [],
      trends: [],
      opportunities: [],
      metrics: {}
    };

    // Scan each platform
    for (const platform of monitoredPlatforms) {
      console.log(`[Social] Scanning ${platform} for ${trackedKeywords.length} keywords`);

      // Scan platform for tracked keywords
      const platformScan = await scanSocialPlatforms({
        userId: params.userId,
        platform,
        keywords: trackedKeywords,
        competitors: params.competitors,
        timeframe: params.listeningFrequency === 'real-time' ? '1h' : '24h'
      });

      // Analyze trending topics on this platform
      const platformTrends = await analyzeTrendingTopics({
        userId: params.userId,
        platform,
        industry: params.industry,
        location: 'global'
      });

      // Track hashtag performance
      const hashtagData = await trackHashtagPerformance({
        userId: params.userId,
        platform,
        hashtags: trackedKeywords.map(k => `#${k.keyword}`),
        timeframe: '24h'
      });

      // Monitor brand mentions
      const brandMentions = await monitorBrandMentions({
        userId: params.userId,
        platform,
        brandKeywords: trackedKeywords.filter(k => k.category === 'brand'),
        includeIndirectMentions: true
      });

      // Detect influencer mentions
      const influencerMentions = await detectInfluencerMentions({
        userId: params.userId,
        platform,
        keywords: trackedKeywords,
        minFollowers: 10000
      });

      // Analyze competitor activity
      const competitorActivity = await analyzeCompetitorActivity({
        userId: params.userId,
        platform,
        competitors: params.competitors,
        timeframe: '24h'
      });

      // Track viral content related to keywords
      const viralContent = await trackViralContent({
        userId: params.userId,
        platform,
        keywords: trackedKeywords,
        viralThreshold: alertThresholds.viralThreshold
      });

      // Store platform data
      cycleData.platformData[platform] = {
        scan: platformScan,
        trends: platformTrends,
        hashtags: hashtagData,
        brandMentions,
        influencerMentions,
        competitorActivity,
        viralContent
      };

      // Aggregate mentions
      cycleData.mentions.push(...brandMentions, ...influencerMentions);

      // Aggregate trends
      cycleData.trends.push(...platformTrends.trending);

      // Check for opportunities and alerts

      // Viral content opportunity
      if (viralContent.length > 0) {
        for (const viral of viralContent) {
          const opportunity = {
            type: 'VIRAL_OPPORTUNITY',
            platform,
            content: viral,
            score: viral.engagementScore,
            timestamp: scanStartTime
          };

          cycleData.opportunities.push(opportunity);
          alerts.push(opportunity);

          await alertSocialOpportunity({
            userId: params.userId,
            opportunity,
            urgency: viral.engagementScore > alertThresholds.viralThreshold * 2 ? 'HIGH' : 'MEDIUM'
          });
        }
      }

      // Mention spike detection
      const currentMentions = brandMentions.length;
      const previousMentions = socialDatabase
        .filter(d => d.platform === platform && d.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .reduce((sum, d) => sum + (d.mentions?.length || 0), 0);

      if (currentMentions > previousMentions * (1 + alertThresholds.mentionSpike / 100)) {
        const spikeAlert = {
          type: 'MENTION_SPIKE',
          platform,
          currentCount: currentMentions,
          previousCount: previousMentions,
          increase: ((currentMentions - previousMentions) / previousMentions * 100).toFixed(1),
          timestamp: scanStartTime
        };

        alerts.push(spikeAlert);
        await alertSocialOpportunity({
          userId: params.userId,
          opportunity: spikeAlert,
          urgency: 'HIGH'
        });
      }

      // Competitor activity spike
      if (competitorActivity.totalActivity > alertThresholds.competitorActivity) {
        const competitorAlert = {
          type: 'COMPETITOR_ACTIVITY',
          platform,
          competitors: competitorActivity.activeCompetitors,
          activityLevel: competitorActivity.totalActivity,
          topContent: competitorActivity.topPerformingContent,
          timestamp: scanStartTime
        };

        alerts.push(competitorAlert);
        await alertSocialOpportunity({
          userId: params.userId,
          opportunity: competitorAlert,
          urgency: 'MEDIUM'
        });
      }

      // Small delay between platforms
      await sleep(10 * 1000);
    }

    // Generate cross-platform insights
    const socialInsights = await generateSocialInsights({
      userId: params.userId,
      crossPlatformData: cycleData.platformData,
      previousData: socialDatabase.slice(-10), // Last 10 cycles
      industry: params.industry
    });

    // Calculate metrics for this cycle
    cycleData.metrics = {
      totalMentions: cycleData.mentions.length,
      platformCoverage: monitoredPlatforms.length,
      trendingTopics: cycleData.trends.length,
      opportunities: cycleData.opportunities.length,
      averageSentiment: cycleData.mentions.reduce((sum, m) => sum + (m.sentiment?.score || 0), 0) / Math.max(cycleData.mentions.length, 1),
      reachEstimate: cycleData.mentions.reduce((sum, m) => sum + (m.estimatedReach || 0), 0),
      crossPlatformInsights: socialInsights
    };

    // Update trending data
    trendingData.push(...cycleData.trends);
    if (trendingData.length > 1000) {
      trendingData = trendingData.slice(-500); // Keep last 500 trends
    }

    // Update social database
    socialDatabase.push({
      timestamp: scanStartTime,
      platform: 'ALL',
      mentions: cycleData.mentions,
      trends: cycleData.trends,
      metrics: cycleData.metrics
    });

    // Update external social database
    await updateSocialDatabase({
      userId: params.userId,
      cycleData,
      insights: socialInsights
    });

    lastScan = cycleData;
    listeningCycles++;

    // Continue as new workflow every 200 cycles to prevent history from growing too large
    if (listeningCycles >= 200) {
      await continueAsNew<typeof socialListeningWorkflow>({
        ...params,
        trackedKeywords,
        platforms: monitoredPlatforms,
        alertThresholds
      });
    }

    // Clean up old data to prevent memory issues
    if (socialDatabase.length > 100) {
      socialDatabase = socialDatabase.slice(-50);
    }
    if (alerts.length > 200) {
      alerts = alerts.slice(-100);
    }

    // Wait for next listening cycle
    const nextInterval = getListeningInterval(params.listeningFrequency);
    console.log(`[Social] Listening cycle ${listeningCycles} completed. ${cycleData.mentions.length} mentions, ${cycleData.opportunities.length} opportunities. Next scan in ${nextInterval}`);
    await sleep(nextInterval === '5 minutes' ? 5 * 60 * 1000 :
                nextInterval === '1 hour' ? 60 * 60 * 1000 :
                nextInterval === '24 hours' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000);
  }
}