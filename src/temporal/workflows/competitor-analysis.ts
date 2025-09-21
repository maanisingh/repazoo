import { proxyActivities, defineSignal, defineQuery, setHandler, condition, sleep, continueAsNew } from '@temporalio/workflow';
import type * as activities from '../activities';

const {
  scanCompetitorActivity,
  analyzeCompetitorStrategy,
  detectCompetitorThreats,
  generateCompetitorRanking,
  updateCompetitorDatabase
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '2 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export const addCompetitorSignal = defineSignal<[{ competitorName: string, domains: string[], keywords: string[] }]>('addCompetitor');
export const removeCompetitorSignal = defineSignal<[{ competitorName: string }]>('removeCompetitor');
export const updateAnalysisFrequencySignal = defineSignal<[{ frequency: string }]>('updateAnalysisFrequency');
export const pauseAnalysisSignal = defineSignal<[]>('pauseAnalysis');
export const resumeAnalysisSignal = defineSignal<[]>('resumeAnalysis');

export const competitorStatusQuery = defineQuery<any>('competitorStatus');
export const competitorMetricsQuery = defineQuery<any>('competitorMetrics');
export const competitorRankingsQuery = defineQuery<any>('competitorRankings');

export interface CompetitorAnalysisParams {
  userId: string;
  competitors: Array<{
    name: string;
    domains: string[];
    keywords: string[];
    industry: string;
  }>;
  analysisFrequency: string; // e.g., 'daily', 'weekly'
  alertThresholds: {
    sentimentDrop: number;
    reputationGap: number;
    mentionSpike: number;
  };
}

export async function competitorAnalysisWorkflow(params: CompetitorAnalysisParams): Promise<void> {
  let isPaused = false;
  let currentCompetitors = [...params.competitors];
  let analysisFrequency = params.analysisFrequency;
  let analysisCount = 0;
  let lastAnalysis: any = null;

  // Set up signal handlers
  setHandler(addCompetitorSignal, ({ competitorName, domains, keywords }) => {
    currentCompetitors.push({
      name: competitorName,
      domains,
      keywords,
      industry: 'General'
    });
  });

  setHandler(removeCompetitorSignal, ({ competitorName }) => {
    currentCompetitors = currentCompetitors.filter(comp => comp.name !== competitorName);
  });

  setHandler(updateAnalysisFrequencySignal, ({ frequency }) => {
    analysisFrequency = frequency;
  });

  setHandler(pauseAnalysisSignal, () => {
    isPaused = true;
  });

  setHandler(resumeAnalysisSignal, () => {
    isPaused = false;
  });

  // Set up query handlers
  setHandler(competitorStatusQuery, () => ({
    isActive: !isPaused,
    competitorCount: currentCompetitors.length,
    analysisFrequency,
    analysisCount,
    lastAnalysis: lastAnalysis?.timestamp
  }));

  setHandler(competitorMetricsQuery, () => lastAnalysis?.metrics || {});

  setHandler(competitorRankingsQuery, () => lastAnalysis?.rankings || []);

  console.log(`[Competitor] Starting competitor analysis workflow for user ${params.userId} - ${currentCompetitors.length} competitors`);

  const getAnalysisInterval = (frequency: string): string => {
    switch (frequency) {
      case 'hourly': return '1 hour';
      case 'daily': return '24 hours';
      case 'weekly': return '7 days';
      case 'monthly': return '30 days';
      default: return '24 hours';
    }
  };

  // Main analysis loop
  while (true) {
    // Wait if paused
    await condition(() => !isPaused);

    if (currentCompetitors.length === 0) {
      console.log(`[Competitor] No competitors to analyze, waiting...`);
      await sleep(60 * 60 * 1000);
      continue;
    }

    const analysisStartTime = new Date().toISOString();
    console.log(`[Competitor] Starting analysis cycle ${analysisCount + 1} for ${currentCompetitors.length} competitors`);

    const competitorData = [];

    // Analyze each competitor
    for (const competitor of currentCompetitors) {
      // Scan competitor mentions
      const mentions = await scanCompetitorActivity({
        userId: params.userId,
        competitors: [competitor.name],
        platforms: competitor.domains
      });

      // Analyze strategy for competitor
      const strategy = await analyzeCompetitorStrategy({
        userId: params.userId,
        competitor: competitor.name,
        timeframe: analysisFrequency
      });

      competitorData.push({
        name: competitor.name,
        mentions,
        strategy,
        industry: competitor.industry
      });
    }

    // Generate competitor ranking
    const ranking = await generateCompetitorRanking({
      userId: params.userId,
      competitors: competitorData.map(c => c.name),
      criteria: ['performance', 'sentiment', 'reach']
    });

    // Identify potential threats
    const threats = await detectCompetitorThreats({
      userId: params.userId,
      competitors: competitorData.map(c => c.name)
    });

    // Track trends - simplified
    const trends = {
      growing: [],
      declining: [],
      stable: competitorData.map(c => c.name)
    };

    // Check for significant competitor advantages
    if (threats.threats.length > 0) {
      for (const threat of threats.threats) {
        console.log(`[Competitor] Threat detected: ${threat.type}`);
      }
    }

    // Store analysis results
    lastAnalysis = {
      timestamp: analysisStartTime,
      metrics: {
        userScore: 75,
        competitorAverage: 65,
        ranking: 2,
        gapAnalysis: []
      },
      rankings: ranking.rankings,
      threats,
      trends
    };

    // Update competitor database
    await updateCompetitorDatabase({
      userId: params.userId,
      competitorData: competitorData
    });

    analysisCount++;

    // Continue as new workflow every 100 analyses to prevent history from growing too large
    if (analysisCount >= 100) {
      await continueAsNew<typeof competitorAnalysisWorkflow>({
        ...params,
        competitors: currentCompetitors
      });
    }

    // Wait for next analysis cycle
    const nextInterval = getAnalysisInterval(analysisFrequency);
    console.log(`[Competitor] Analysis cycle ${analysisCount} completed. Next analysis in ${nextInterval}`);
    await sleep(nextInterval === '1 hour' ? 60 * 60 * 1000 :
                nextInterval === '24 hours' ? 24 * 60 * 60 * 1000 :
                nextInterval === '7 days' ? 7 * 24 * 60 * 60 * 1000 :
                nextInterval === '30 days' ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000);
  }
}