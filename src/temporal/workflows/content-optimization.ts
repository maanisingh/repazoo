import { proxyActivities, defineSignal, defineQuery, setHandler, condition, sleep, continueAsNew } from '@temporalio/workflow';
import type * as activities from '../activities';

const {
  analyzeContentPerformance,
  generateContentSuggestions,
  optimizeContentSEO,
  scheduleContentPublication,
  trackContentEngagement,
  analyzeAudiencePreferences,
  generateContentCalendar,
  performContentAudit,
  identifyViralOpportunities,
  optimizeContentTiming
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '8 minutes',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '2 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export const addContentSignal = defineSignal<[{ title: string, type: string, platform: string, scheduledDate?: string }]>('addContent');
export const updateContentStrategySignal = defineSignal<[{ strategy: any }]>('updateContentStrategy');
export const pauseOptimizationSignal = defineSignal<[]>('pauseOptimization');
export const resumeOptimizationSignal = defineSignal<[]>('resumeOptimization');
export const requestContentAuditSignal = defineSignal<[]>('requestContentAudit');

export const optimizationStatusQuery = defineQuery<any>('optimizationStatus');
export const contentMetricsQuery = defineQuery<any>('contentMetrics');
export const contentCalendarQuery = defineQuery<any>('contentCalendar');

export interface ContentOptimizationParams {
  userId: string;
  platforms: string[];
  contentTypes: string[];
  industry: string;
  targetAudience: {
    demographics: string[];
    interests: string[];
    preferredTimes: string[];
  };
  goals: {
    engagement: number;
    reach: number;
    conversions: number;
  };
  optimizationFrequency: string; // 'daily', 'weekly', 'monthly'
}

export async function contentOptimizationWorkflow(params: ContentOptimizationParams): Promise<void> {
  let isPaused = false;
  let contentCalendar: any[] = [];
  let contentStrategy = {
    topicClusters: [],
    postingSchedule: {},
    contentMix: {},
    performanceTargets: params.goals
  };
  let optimizationCycles = 0;
  let lastOptimization: any = null;

  // Set up signal handlers
  setHandler(addContentSignal, ({ title, type, platform, scheduledDate }) => {
    contentCalendar.push({
      id: `content_${Date.now()}`,
      title,
      type,
      platform,
      scheduledDate: scheduledDate || new Date().toISOString(),
      status: 'SCHEDULED',
      createdAt: new Date().toISOString()
    });
  });

  setHandler(updateContentStrategySignal, ({ strategy }) => {
    contentStrategy = { ...contentStrategy, ...strategy };
  });

  setHandler(pauseOptimizationSignal, () => {
    isPaused = true;
  });

  setHandler(resumeOptimizationSignal, () => {
    isPaused = false;
  });

  setHandler(requestContentAuditSignal, async () => {
    // Trigger immediate content audit
    const auditResults = await performContentAudit({
      userId: params.userId,
      platforms: params.platforms,
      timeframe: '90d',
      includeCompetitorAnalysis: true
    });

    lastOptimization = {
      ...lastOptimization,
      auditResults,
      auditTimestamp: new Date().toISOString()
    };
  });

  // Set up query handlers
  setHandler(optimizationStatusQuery, () => ({
    isActive: !isPaused,
    cycles: optimizationCycles,
    lastOptimization: lastOptimization?.timestamp,
    contentCount: contentCalendar.length,
    strategy: contentStrategy
  }));

  setHandler(contentMetricsQuery, () => lastOptimization?.metrics || {});

  setHandler(contentCalendarQuery, () => contentCalendar.slice(-30)); // Last 30 content items

  console.log(`[Content] Starting content optimization workflow for ${params.platforms.length} platforms`);

  const getOptimizationInterval = (frequency: string): string => {
    switch (frequency) {
      case 'daily': return '24 hours';
      case 'weekly': return '7 days';
      case 'monthly': return '30 days';
      default: return '7 days';
    }
  };

  // Initial setup - analyze existing content and audience
  console.log(`[Content] Performing initial content analysis`);

  const initialAnalysis = await analyzeContentPerformance({
    userId: params.userId,
    platforms: params.platforms,
    timeframe: '30d',
    includeEngagement: true
  });

  const audienceAnalysis = await analyzeAudiencePreferences({
    userId: params.userId,
    platforms: params.platforms,
    targetAudience: params.targetAudience
  });

  // Generate initial content strategy
  contentStrategy = {
    topicClusters: audienceAnalysis.preferredTopics,
    postingSchedule: audienceAnalysis.optimalTimes,
    contentMix: audienceAnalysis.preferredFormats,
    performanceTargets: params.goals
  };

  // Main optimization loop
  while (true) {
    // Wait if paused
    await condition(() => !isPaused);

    const optimizationStartTime = new Date().toISOString();
    console.log(`[Content] Starting optimization cycle ${optimizationCycles + 1}`);

    // Analyze current content performance
    const performanceAnalysis = await analyzeContentPerformance({
      userId: params.userId,
      platforms: params.platforms,
      timeframe: params.optimizationFrequency === 'daily' ? '7d' : '30d',
      includeEngagement: true
    });

    // Generate content suggestions based on performance
    const contentSuggestions = await generateContentSuggestions({
      userId: params.userId,
      industry: params.industry,
      targetAudience: params.targetAudience,
      performanceData: performanceAnalysis,
      currentStrategy: contentStrategy
    });

    // Optimize content for SEO
    const seoOptimizations = await optimizeContentSEO({
      userId: params.userId,
      contentSuggestions,
      targetKeywords: audienceAnalysis.targetKeywords,
      industry: params.industry
    });

    // Identify viral content opportunities
    const viralOpportunities = await identifyViralOpportunities({
      userId: params.userId,
      industry: params.industry,
      currentTrends: performanceAnalysis.trendingTopics,
      audienceData: audienceAnalysis
    });

    // Optimize content timing
    const timingOptimization = await optimizeContentTiming({
      userId: params.userId,
      platforms: params.platforms,
      audienceActivity: audienceAnalysis.activityPatterns,
      currentSchedule: contentStrategy.postingSchedule
    });

    // Update content strategy based on insights
    contentStrategy = {
      topicClusters: [...(contentSuggestions.topicClusters || []), ...(viralOpportunities.topics || [])],
      postingSchedule: timingOptimization.optimalSchedule,
      contentMix: {
        ...contentStrategy.contentMix,
        ...contentSuggestions.recommendedMix
      },
      performanceTargets: params.goals
    };

    // Generate updated content calendar
    const newContentCalendar = await generateContentCalendar({
      userId: params.userId,
      strategy: contentStrategy,
      timeframe: '30d',
      platforms: params.platforms
    });

    // Add new content to calendar
    contentCalendar.push(...newContentCalendar.items);

    // Schedule content publication for approved items
    const approvedContent = contentCalendar.filter((item: any) =>
      item.status === 'APPROVED' &&
      new Date(item.scheduledDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
    );

    for (const content of approvedContent) {
      await scheduleContentPublication({
        userId: params.userId,
        contentId: content.id,
        platform: content.platform,
        scheduledDate: content.scheduledDate,
        optimizedContent: {
          title: content.title,
          body: content.optimizedBody,
          hashtags: content.hashtags,
          seoMetadata: content.seoMetadata
        }
      });

      // Update content status
      content.status = 'SCHEDULED_FOR_PUBLICATION';
    }

    // Track engagement for recently published content
    const recentContent = contentCalendar.filter((item: any) =>
      item.status === 'PUBLISHED' &&
      new Date(item.publishedDate) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    );

    const engagementData = [];
    for (const content of recentContent) {
      const engagement = await trackContentEngagement({
        userId: params.userId,
        contentId: content.id,
        platform: content.platform,
        publishedDate: content.publishedDate
      });

      engagementData.push({
        contentId: content.id,
        ...engagement
      });

      // Update content with engagement data
      content.engagement = engagement;
    }

    // Store optimization results
    lastOptimization = {
      timestamp: optimizationStartTime,
      metrics: {
        totalContent: contentCalendar.length,
        publishedThisCycle: approvedContent.length,
        averageEngagement: engagementData.reduce((sum, e) => sum + (e.engagementRate || 0), 0) / Math.max(engagementData.length, 1),
        goalProgress: {
          engagement: (performanceAnalysis.averageEngagement / params.goals.engagement) * 100,
          reach: (performanceAnalysis.totalReach / params.goals.reach) * 100,
          conversions: (performanceAnalysis.totalConversions / params.goals.conversions) * 100
        }
      },
      suggestions: contentSuggestions,
      viralOpportunities,
      timingOptimizations: timingOptimization,
      strategy: contentStrategy
    };

    optimizationCycles++;

    // Continue as new workflow every 100 cycles to prevent history from growing too large
    if (optimizationCycles >= 100) {
      await continueAsNew<typeof contentOptimizationWorkflow>({
        ...params,
        // Pass updated strategy as part of parameters
      });
    }

    // Wait for next optimization cycle
    const nextInterval = getOptimizationInterval(params.optimizationFrequency);
    console.log(`[Content] Optimization cycle ${optimizationCycles} completed. Next optimization in ${nextInterval}`);
    await sleep(nextInterval === '24 hours' ? 24 * 60 * 60 * 1000 :
                nextInterval === '7 days' ? 7 * 24 * 60 * 60 * 1000 :
                nextInterval === '30 days' ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000);
  }
}