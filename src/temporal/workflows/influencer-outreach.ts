import { proxyActivities, defineSignal, defineQuery, setHandler, condition, sleep, continueAsNew } from '@temporalio/workflow';
import type * as activities from '../activities';

const {
  identifyInfluencers,
  analyzeInfluencerReach,
  scoreInfluencerAlignment,
  generateOutreachMessage,
  sendInfluencerOutreach,
  trackOutreachResponse,
  scheduleFollowUp,
  analyzeInfluencerROI,
  updateInfluencerDatabase,
  generateInfluencerReport
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '1 minute',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export const addInfluencerSignal = defineSignal<[{ name: string, platform: string, handle: string, priority: number }]>('addInfluencer');
export const updateCampaignSignal = defineSignal<[{ campaignId: string, status: string, budget?: number }]>('updateCampaign');
export const pauseCampaignSignal = defineSignal<[{ campaignId: string }]>('pauseCampaign');
export const resumeCampaignSignal = defineSignal<[{ campaignId: string }]>('resumeCampaign');
export const recordResponseSignal = defineSignal<[{ influencerId: string, responseType: string, message?: string }]>('recordResponse');

export const campaignStatusQuery = defineQuery<any>('campaignStatus');
export const influencerMetricsQuery = defineQuery<any>('influencerMetrics');
export const outreachStatsQuery = defineQuery<any>('outreachStats');

export interface InfluencerOutreachParams {
  userId: string;
  campaignName: string;
  industry: string;
  targetAudience: {
    demographics: string[];
    interests: string[];
    location?: string;
  };
  budget: number;
  timeline: {
    startDate: string;
    endDate: string;
  };
  objectives: string[];
  minFollowers: number;
  maxFollowers?: number;
  platforms: string[];
}

export async function influencerOutreachWorkflow(params: InfluencerOutreachParams): Promise<void> {
  let campaignActive = true;
  let isPaused = false;
  let discoveredInfluencers: any[] = [];
  let outreachAttempts: any[] = [];
  let responses: any[] = [];
  let campaignStats = {
    totalReach: 0,
    responseRate: 0,
    conversionRate: 0,
    averageEngagement: 0
  };

  // Set up signal handlers
  setHandler(addInfluencerSignal, ({ name, platform, handle, priority }) => {
    discoveredInfluencers.push({
      id: `manual_${Date.now()}`,
      name,
      platform,
      handle,
      priority,
      source: 'MANUAL',
      addedAt: new Date().toISOString()
    });
  });

  setHandler(updateCampaignSignal, ({ campaignId, status, budget }) => {
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      campaignActive = false;
    }
    if (budget) {
      params.budget = budget;
    }
  });

  setHandler(pauseCampaignSignal, ({ campaignId }) => {
    isPaused = true;
  });

  setHandler(resumeCampaignSignal, ({ campaignId }) => {
    isPaused = false;
  });

  setHandler(recordResponseSignal, ({ influencerId, responseType, message }) => {
    responses.push({
      influencerId,
      responseType,
      message,
      timestamp: new Date().toISOString()
    });
  });

  // Set up query handlers
  setHandler(campaignStatusQuery, () => ({
    isActive: campaignActive,
    isPaused,
    totalInfluencers: discoveredInfluencers.length,
    outreachSent: outreachAttempts.length,
    responses: responses.length,
    budget: params.budget,
    daysRemaining: Math.ceil((new Date(params.timeline.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }));

  setHandler(influencerMetricsQuery, () => campaignStats);

  setHandler(outreachStatsQuery, () => ({
    sent: outreachAttempts.length,
    responded: responses.length,
    positive: responses.filter(r => r.responseType === 'POSITIVE').length,
    negative: responses.filter(r => r.responseType === 'NEGATIVE').length,
    pending: outreachAttempts.filter(o => !responses.find(r => r.influencerId === o.influencerId)).length
  }));

  console.log(`[Influencer] Starting influencer outreach campaign: ${params.campaignName}`);

  // Phase 1: Influencer Discovery
  console.log(`[Influencer] Phase 1: Discovering influencers in ${params.industry}`);

  const potentialInfluencers = await identifyInfluencers({
    userId: params.userId,
    industry: params.industry,
    targetAudience: params.targetAudience,
    minFollowers: params.minFollowers,
    maxFollowers: params.maxFollowers,
    platforms: params.platforms,
    budget: params.budget
  });

  discoveredInfluencers.push(...potentialInfluencers);

  // Phase 2: Influencer Analysis & Scoring
  console.log(`[Influencer] Phase 2: Analyzing ${discoveredInfluencers.length} potential influencers`);

  for (const influencer of discoveredInfluencers) {
    // Analyze reach and engagement
    const reachAnalysis = await analyzeInfluencerReach({
      userId: params.userId,
      influencerId: influencer.id,
      platform: influencer.platform,
      handle: influencer.handle
    });

    // Score alignment with campaign objectives
    const alignmentScore = await scoreInfluencerAlignment({
      userId: params.userId,
      influencer,
      campaignObjectives: params.objectives,
      targetAudience: params.targetAudience
    });

    // Update influencer data
    influencer.reach = reachAnalysis;
    influencer.alignmentScore = alignmentScore;
    influencer.estimatedCost = reachAnalysis.estimatedCost;
  }

  // Sort by alignment score and filter by budget
  const qualifiedInfluencers = discoveredInfluencers
    .filter(inf => inf.alignmentScore.totalScore >= 70)
    .sort((a, b) => b.alignmentScore.totalScore - a.alignmentScore.totalScore)
    .filter(inf => inf.estimatedCost <= params.budget);

  console.log(`[Influencer] ${qualifiedInfluencers.length} qualified influencers identified`);

  // Phase 3: Outreach Campaign
  let remainingBudget = params.budget;
  let outreachBatch = 0;

  while (campaignActive && qualifiedInfluencers.length > 0 && remainingBudget > 0) {
    // Wait if paused
    await condition(() => !isPaused || !campaignActive);

    if (!campaignActive) break;

    // Check if campaign timeline expired
    if (new Date() > new Date(params.timeline.endDate)) {
      campaignActive = false;
      break;
    }

    outreachBatch++;
    console.log(`[Influencer] Starting outreach batch ${outreachBatch}`);

    // Select influencers for this batch (max 10 per batch)
    const batchInfluencers = qualifiedInfluencers
      .filter(inf => inf.estimatedCost <= remainingBudget)
      .slice(0, 10);

    for (const influencer of batchInfluencers) {
      // Generate personalized outreach message
      const outreachMessage = await generateOutreachMessage({
        userId: params.userId,
        influencer,
        campaignName: params.campaignName,
        objectives: params.objectives,
        personalizedData: influencer.alignmentScore.personalizedData
      });

      // Send outreach
      const outreachResult = await sendInfluencerOutreach({
        userId: params.userId,
        influencer,
        message: outreachMessage,
        campaignId: params.campaignName
      });

      if (outreachResult.success) {
        outreachAttempts.push({
          influencerId: influencer.id,
          platform: influencer.platform,
          message: outreachMessage,
          sentAt: new Date().toISOString(),
          estimatedCost: influencer.estimatedCost
        });

        remainingBudget -= influencer.estimatedCost;

        // Schedule follow-up
        await scheduleFollowUp({
          userId: params.userId,
          influencerId: influencer.id,
          initialOutreachDate: new Date().toISOString(),
          followUpDays: 7
        });
      }

      // Remove from qualified list
      const index = qualifiedInfluencers.indexOf(influencer);
      if (index > -1) {
        qualifiedInfluencers.splice(index, 1);
      }

      // Small delay between outreach attempts
      await sleep(30 * 1000);
    }

    // Wait for responses and track engagement
    console.log(`[Influencer] Waiting for responses from batch ${outreachBatch}`);
    await sleep(3 * 24 * 60 * 60 * 1000); // Wait 3 days for responses

    // Track responses for this batch
    const batchOutreach = outreachAttempts.slice(-batchInfluencers.length);
    for (const outreach of batchOutreach) {
      const responseData = await trackOutreachResponse({
        userId: params.userId,
        influencerId: outreach.influencerId,
        outreachDate: outreach.sentAt,
        platform: outreach.platform
      });

      if (responseData.hasResponse) {
        responses.push({
          influencerId: outreach.influencerId,
          responseType: responseData.responseType,
          message: responseData.message,
          timestamp: responseData.responseDate
        });
      }
    }

    // Update campaign stats
    const totalReach = outreachAttempts.reduce((sum, o) => sum + (discoveredInfluencers.find(i => i.id === o.influencerId)?.reach?.totalFollowers || 0), 0);
    campaignStats = {
      totalReach,
      responseRate: responses.length / outreachAttempts.length,
      conversionRate: responses.filter(r => r.responseType === 'POSITIVE').length / outreachAttempts.length,
      averageEngagement: discoveredInfluencers.reduce((sum, i) => sum + (i.reach?.engagementRate || 0), 0) / discoveredInfluencers.length
    };
  }

  // Phase 4: Campaign Analysis & Reporting
  console.log(`[Influencer] Campaign completed. Analyzing ROI and generating report`);

  const roiAnalysis = await analyzeInfluencerROI({
    userId: params.userId,
    campaignName: params.campaignName,
    outreachAttempts,
    responses,
    totalSpent: params.budget - remainingBudget,
    campaignStats
  });

  // Update influencer database with performance data
  await updateInfluencerDatabase({
    userId: params.userId,
    influencers: discoveredInfluencers,
    campaignResults: {
      outreachAttempts,
      responses,
      campaignStats
    }
  });

  // Generate final campaign report
  await generateInfluencerReport({
    userId: params.userId,
    campaignName: params.campaignName,
    summary: {
      influencersContacted: outreachAttempts.length,
      responseRate: campaignStats.responseRate,
      totalReach: campaignStats.totalReach,
      budgetUsed: params.budget - remainingBudget,
      roi: roiAnalysis.roi,
      topPerformers: roiAnalysis.topPerformers
    },
    recommendations: roiAnalysis.recommendations
  });

  console.log(`[Influencer] Influencer outreach campaign "${params.campaignName}" completed successfully`);
}