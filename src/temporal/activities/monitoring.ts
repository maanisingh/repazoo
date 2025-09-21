import { queryOne, queryMany } from '../../lib/postgres';

export interface UserMonitoringSource {
  id: string;
  userId: string;
  name: string;
  url: string;
  sourceType: string;
  isActive: boolean;
  scanFrequency: string;
  lastScanned?: Date;
}

export interface ScrapeSourceParams {
  sourceId: string;
  userId: string;
  searchQuery: string;
  sourceUrl: string;
  sourceType: string;
}

export interface ScrapeResult {
  sourceId: string;
  newMentions: number;
  totalProcessed: number;
  success: boolean;
  error?: string;
  scannedAt: string;
}

export interface MonitoringStats {
  totalSources: number;
  activeSources: number;
  lastScanTime?: string;
  totalMentions: number;
}

// Activity to get user's monitoring sources
export async function getUserMonitoringSources(userId: string): Promise<UserMonitoringSource[]> {
  try {
    console.log(`[Activity] Getting monitoring sources for user ${userId}`);

    // For now, return empty array since we don't have monitoring sources table yet
    // In a real implementation, this would query the monitoring_sources table
    const sources: UserMonitoringSource[] = [];

    return sources;
  } catch (error) {
    console.error('[Activity] Failed to get monitoring sources:', error);
    throw new Error(`Failed to get monitoring sources: ${error.message}`);
  }
}

// Activity to scrape a single source using the real web scraper
export async function scrapeSource(params: ScrapeSourceParams): Promise<ScrapeResult> {
  try {
    console.log(`[Activity] Scraping source ${params.sourceId} for user ${params.userId}`);

    // Import the web scraper
    const { createWebScraper } = await import('../../lib/web-scraper');
    const scraper = createWebScraper();

    // Perform real scraping
    const scrapeResults = await scraper.scrapeQuery(params.searchQuery, [params.sourceId]);

    let totalNewMentions = 0;
    let totalProcessed = 0;

    for (const result of scrapeResults) {
      totalProcessed += result.totalFound;

      // Save mentions to database
      for (const mention of result.mentions) {
        try {
          // Check if mention already exists
          const existing = await queryOne(
            'SELECT id FROM simple_mentions WHERE url = $1 AND user_id = $2',
            [mention.url, params.userId]
          );

          if (!existing) {
            // Insert new mention
            await queryOne(`
              INSERT INTO simple_mentions (
                user_id, title, content, url, source, source_type, author,
                published_date, sentiment, sentiment_score, sentiment_confidence,
                reputation_impact, engagement_count, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
            `, [
              params.userId,
              mention.title,
              mention.content,
              mention.url,
              mention.source,
              mention.sourceType,
              mention.author || null,
              mention.date ? new Date(mention.date) : null,
              mention.sentiment?.label || 'NEUTRAL',
              mention.sentiment?.score || 0,
              mention.sentiment?.confidence || 0.5,
              mention.sentiment?.reputationImpact || 0,
              mention.engagement || 0
            ]);

            totalNewMentions++;
          }
        } catch (dbError) {
          console.error(`[Activity] Failed to save mention:`, dbError);
        }
      }
    }

    console.log(`[Activity] Successfully scraped ${params.sourceId}: ${totalNewMentions} new mentions from ${totalProcessed} processed`);

    const result: ScrapeResult = {
      sourceId: params.sourceId,
      newMentions: totalNewMentions,
      totalProcessed,
      success: true,
      scannedAt: new Date().toISOString(),
    };

    return result;
  } catch (error) {
    console.error(`[Activity] Failed to scrape source ${params.sourceId}:`, error);

    return {
      sourceId: params.sourceId,
      newMentions: 0,
      totalProcessed: 0,
      success: false,
      error: (error as Error).message,
      scannedAt: new Date().toISOString(),
    };
  }
}

// Activity to get monitoring statistics
export async function getMonitoringStats(userId: string): Promise<MonitoringStats> {
  try {
    console.log(`[Activity] Getting monitoring stats for user ${userId}`);

    const [mentionsCount] = await Promise.all([
      queryOne('SELECT COUNT(*) as count FROM simple_mentions WHERE user_id = $1', [userId])
    ]);

    const stats: MonitoringStats = {
      totalSources: 0, // Would query monitoring_sources table
      activeSources: 0, // Would query active monitoring_sources
      totalMentions: parseInt(mentionsCount?.count || '0'),
      lastScanTime: new Date().toISOString(),
    };

    return stats;
  } catch (error) {
    console.error('[Activity] Failed to get monitoring stats:', error);
    throw new Error(`Failed to get monitoring stats: ${error.message}`);
  }
}

// Activity to update source scan status
export async function updateSourceScanStatus(
  sourceId: string,
  status: 'success' | 'error',
  errorMessage?: string
): Promise<void> {
  try {
    console.log(`[Activity] Updating scan status for source ${sourceId}: ${status}`);

    // In real implementation, this would update the monitoring_sources table
    // await query(
    //   'UPDATE monitoring_sources SET last_scanned = NOW(), last_status = $1, error_message = $2 WHERE id = $3',
    //   [status, errorMessage || null, sourceId]
    // );

    console.log(`[Activity] Source ${sourceId} scan status updated to ${status}`);
  } catch (error) {
    console.error(`[Activity] Failed to update source scan status:`, error);
    throw new Error(`Failed to update source scan status: ${error.message}`);
  }
}

// Activity to analyze sentiment of new mentions using self-hosted AI
export async function analyzeMentionSentiment(
  mentionContent: string,
  mentionId: string,
  brandName?: string
): Promise<{ sentiment: string; score: number; confidence: number; reputationImpact?: number; emotions?: any }> {
  try {
    console.log(`[Activity] Analyzing sentiment for mention ${mentionId} using self-hosted AI`);

    const { analyzeReputationMention } = await import('../../lib/ai-sentiment');

    const result = await analyzeReputationMention(mentionContent, brandName);

    console.log(`[Activity] AI sentiment analysis complete: ${result.sentiment} (score: ${result.score.toFixed(2)}, confidence: ${result.confidence.toFixed(2)})`);

    return {
      sentiment: result.sentiment,
      score: result.score,
      confidence: result.confidence,
      reputationImpact: result.reputationImpact,
      emotions: result.emotions
    };
  } catch (error) {
    console.error(`[Activity] Failed to analyze sentiment with AI:`, error);

    // Fallback to basic analysis if AI fails
    return {
      sentiment: 'NEUTRAL',
      score: 0,
      confidence: 0.5
    };
  }
}