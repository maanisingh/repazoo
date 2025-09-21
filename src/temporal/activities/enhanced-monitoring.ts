import { query, queryOne, queryMany } from '../../lib/postgres';
import { analyzeSentiment } from '../../lib/ai-sentiment';
import { scrapeWebsite } from '../../lib/web-scraper';
import { sendNotification } from '../../lib/email';

// Enhanced activity interfaces for multi-tenant monitoring
export interface EnhancedScrapeParams {
  userId: string;
  tenantId: string;
  profileId: string;
  source: MonitoringSource;
  keywords: string[];
  excludedKeywords: string[];
  maxResults: number;
}

export interface MonitoringSource {
  id: string;
  type: 'TWITTER' | 'LINKEDIN' | 'REDDIT' | 'NEWS' | 'FORUM' | 'BLOG' | 'REVIEW';
  name: string;
  url?: string;
  searchQuery: string;
  config: Record<string, any>;
  scanFrequency: number;
  isActive: boolean;
  lastScanAt?: string;
}

export interface MentionResult {
  id: string;
  title: string;
  content: string;
  url: string;
  author?: string;
  authorUrl?: string;
  publishedAt: string;
  sourceType: string;
  rawData: Record<string, any>;
}

export interface SentimentAnalysisParams {
  mentionId: string;
  text: string;
  priorityKeywords: string[];
}

export interface SentimentResult {
  sentimentScore: number; // -1.0 to 1.0
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  emotion: string;
  confidence: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reputationImpact: number;
}

export interface SourceScanUpdate {
  sourceId: string;
  lastScanAt: string;
  mentionsFound: number;
  status: 'SUCCESS' | 'ERROR';
  errorMessage?: string;
}

export interface ReputationScoreParams {
  userId: string;
  profileId: string;
  timeframeHours: number;
}

export interface AlertTriggerParams {
  userId: string;
  profileId: string;
  profileName: string;
  alerts: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
  scanResults: any[];
  reputationScore: number;
}

export interface ProgressNotificationParams {
  userId: string;
  profileName: string;
  mentionsFound: number;
  reputationScore: number;
  scanResults: any[];
}

/**
 * Enhanced scraping activity that works with multiple sources
 * and supports multi-tenant data isolation
 */
export async function scrapeSource(params: EnhancedScrapeParams): Promise<MentionResult[]> {
  try {
    console.log(`Scraping source: ${params.source.name} for user: ${params.userId}`);

    const mentions: MentionResult[] = [];

    // Build search query with keywords
    const searchQuery = buildSearchQuery(params.keywords, params.excludedKeywords);

    // Get scraping configuration for this source type
    const scraperConfig = getScrapeConfig(params.source);

    let scrapedData: any[] = [];

    // Scrape based on source type
    switch (params.source.type) {
      case 'NEWS':
        scrapedData = await scrapeNewsSource(params.source, searchQuery, scraperConfig);
        break;
      case 'SOCIAL_MEDIA':
        scrapedData = await scrapeSocialMedia(params.source, searchQuery, scraperConfig);
        break;
      case 'FORUM':
        scrapedData = await scrapeForumSource(params.source, searchQuery, scraperConfig);
        break;
      case 'REDDIT':
        scrapedData = await scrapeRedditSource(params.source, searchQuery, scraperConfig);
        break;
      case 'TWITTER':
        scrapedData = await scrapeTwitterSource(params.source, searchQuery, scraperConfig);
        break;
      case 'LINKEDIN':
        scrapedData = await scrapeLinkedInSource(params.source, searchQuery, scraperConfig);
        break;
      default:
        scrapedData = await scrapeGenericSource(params.source, searchQuery, scraperConfig);
    }

    // Process and store mentions
    for (const item of scrapedData.slice(0, params.maxResults)) {
      try {
        const mention = await processMention(item, params);
        if (mention) {
          mentions.push(mention);
        }
      } catch (error) {
        console.error('Error processing mention:', error);
      }
    }

    console.log(`Found ${mentions.length} mentions from ${params.source.name}`);
    return mentions;

  } catch (error) {
    console.error(`Error scraping source ${params.source.name}:`, error);
    throw error;
  }
}

/**
 * Analyze sentiment of a mention using AI
 */
export async function analyzeMentionSentiment(params: SentimentAnalysisParams): Promise<SentimentResult> {
  try {
    // Use AI sentiment analysis
    const sentimentData = await analyzeSentiment(params.text);

    // Determine priority based on keywords and sentiment
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';

    // Check for priority keywords
    const text = params.text.toLowerCase();
    const hasCriticalKeywords = params.priorityKeywords.some(keyword =>
      text.includes(keyword.toLowerCase())
    );

    if (hasCriticalKeywords && sentimentData.score < -0.5) {
      priority = 'CRITICAL';
    } else if (sentimentData.score < -0.7) {
      priority = 'HIGH';
    } else if (sentimentData.score > 0.7) {
      priority = 'LOW';
    }

    // Calculate reputation impact
    const reputationImpact = calculateReputationImpact(sentimentData.score, priority);

    // Update mention in database with sentiment analysis
    await query(`
      UPDATE mentions
      SET
        sentiment = $1,
        sentiment_score = $2,
        emotion = $3,
        confidence_score = $4,
        priority = $5,
        reputation_impact = $6,
        processed_at = NOW()
      WHERE id = $7
    `, [
      sentimentData.label,
      sentimentData.score,
      sentimentData.emotion || 'neutral',
      sentimentData.confidence || 0.5,
      priority,
      reputationImpact,
      params.mentionId
    ]);

    return {
      sentimentScore: sentimentData.score,
      sentiment: sentimentData.label.toUpperCase() as 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
      emotion: sentimentData.emotion || 'neutral',
      confidence: sentimentData.confidence || 0.5,
      priority,
      reputationImpact,
    };

  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    throw error;
  }
}

/**
 * Update source scan status in database
 */
export async function updateSourceScanStatus(params: SourceScanUpdate): Promise<void> {
  try {
    await query(`
      UPDATE monitoring_sources
      SET
        last_scan_at = $1,
        next_scan_at = NOW() + INTERVAL '1 hour' * scan_frequency,
        updated_at = NOW()
      WHERE id = $2
    `, [params.lastScanAt, params.sourceId]);

    // Log scan result
    await query(`
      INSERT INTO workflow_executions (
        workflow_type, status, input_data, completed_at, created_at
      ) VALUES ($1, $2, $3, NOW(), NOW())
    `, [
      'source_scan',
      params.status,
      JSON.stringify({
        sourceId: params.sourceId,
        mentionsFound: params.mentionsFound,
        errorMessage: params.errorMessage,
      })
    ]);

  } catch (error) {
    console.error('Error updating source scan status:', error);
    throw error;
  }
}

/**
 * Calculate reputation score for a user profile
 */
export async function calculateReputationScore(params: ReputationScoreParams): Promise<number> {
  try {
    const result = await queryOne(`
      SELECT calculate_reputation_score($1, $2, NOW() - INTERVAL '${params.timeframeHours} hours', NOW()) as score
    `, [params.userId, params.profileId]);

    const score = result?.score || 50; // Default neutral score

    // Store the calculated score
    await query(`
      INSERT INTO reputation_scores (
        user_id, profile_id, overall_score, sentiment_score,
        volume_score, reach_score, trend_score,
        period_start, period_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7,
        NOW() - INTERVAL '${params.timeframeHours} hours', NOW())
    `, [
      params.userId,
      params.profileId,
      score,
      0, // Will be calculated by the function later
      0, // Will be calculated by the function later
      0, // Will be calculated by the function later
      0  // Will be calculated by the function later
    ]);

    return score;

  } catch (error) {
    console.error('Error calculating reputation score:', error);
    return 50; // Return neutral score on error
  }
}

/**
 * Trigger alerts when thresholds are met
 */
export async function triggerAlerts(params: AlertTriggerParams): Promise<void> {
  try {
    // Get user notification preferences
    const user = await queryOne(`
      SELECT email, first_name, last_name, preferences
      FROM users
      WHERE id = $1
    `, [params.userId]);

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user wants immediate alerts
    const preferences = user.preferences || {};
    if (preferences.immediateAlerts === false) {
      console.log('User has disabled immediate alerts');
      return;
    }

    // Create crisis event if severity is high enough
    const criticalAlerts = params.alerts.filter(a => a.severity === 'CRITICAL');
    if (criticalAlerts.length > 0) {
      await createCrisisEvent(params);
    }

    // Send notification
    const alertMessage = params.alerts.map(alert =>
      `${alert.severity}: ${alert.message}`
    ).join('\n');

    await sendNotification({
      to: user.email,
      subject: `Reputation Alert for ${params.profileName}`,
      text: `
        Hello ${user.first_name || 'User'},

        We've detected some important changes to your reputation monitoring for ${params.profileName}:

        ${alertMessage}

        Current Reputation Score: ${params.reputationScore}/100

        Please review your dashboard for more details.

        Best regards,
        RepAZoo Team
      `,
      html: generateAlertEmailHTML(params, user),
    });

    // Log notification
    await query(`
      INSERT INTO notifications_log (
        user_id, type, title, message, channel, status, sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      params.userId,
      'REPUTATION_ALERT',
      `Reputation Alert for ${params.profileName}`,
      alertMessage,
      'email',
      'SENT'
    ]);

  } catch (error) {
    console.error('Error triggering alerts:', error);
    throw error;
  }
}

/**
 * Send progress notification to user
 */
export async function sendProgressNotification(params: ProgressNotificationParams): Promise<void> {
  try {
    // Only send if user has progress notifications enabled
    const preferences = await queryOne(`
      SELECT config FROM notification_preferences
      WHERE user_id = $1 AND notification_type = 'progress' AND is_enabled = true
    `, [params.userId]);

    if (!preferences) {
      return; // User doesn't want progress notifications
    }

    const user = await queryOne(`
      SELECT email, first_name FROM users WHERE id = $1
    `, [params.userId]);

    if (!user) return;

    // Send summary notification
    await sendNotification({
      to: user.email,
      subject: `Monitoring Update: ${params.mentionsFound} new mentions found`,
      text: `
        Hello ${user.first_name || 'User'},

        Your monitoring scan for ${params.profileName} found ${params.mentionsFound} new mentions.
        Current reputation score: ${params.reputationScore}/100

        View details in your dashboard.

        Best regards,
        RepAZoo Team
      `,
    });

  } catch (error) {
    console.error('Error sending progress notification:', error);
    // Don't throw - this is non-critical
  }
}

// Helper functions

async function processMention(item: any, params: EnhancedScrapeParams): Promise<MentionResult | null> {
  try {
    // Check if mention already exists
    const existingMention = await queryOne(`
      SELECT id FROM mentions WHERE url = $1 AND user_id = $2
    `, [item.url, params.userId]);

    if (existingMention) {
      return null; // Skip duplicate
    }

    // Create mention ID
    const mentionId = generateMentionId();

    // Insert mention into database
    await query(`
      INSERT INTO mentions (
        id, user_id, profile_id, source_id, title, content, url,
        author, author_url, published_at, scraped_at, category,
        status, reach_estimate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, 'NEW', $12)
    `, [
      mentionId,
      params.userId,
      params.profileId,
      params.source.id,
      item.title || '',
      item.content || '',
      item.url,
      item.author || null,
      item.authorUrl || null,
      item.publishedAt || new Date().toISOString(),
      params.source.type,
      item.reachEstimate || 0
    ]);

    return {
      id: mentionId,
      title: item.title || '',
      content: item.content || '',
      url: item.url,
      author: item.author,
      authorUrl: item.authorUrl,
      publishedAt: item.publishedAt || new Date().toISOString(),
      sourceType: params.source.type,
      rawData: item,
    };

  } catch (error) {
    console.error('Error processing mention:', error);
    return null;
  }
}

function buildSearchQuery(keywords: string[], excludedKeywords: string[]): string {
  const includeQuery = keywords.map(k => `"${k}"`).join(' OR ');
  const excludeQuery = excludedKeywords.map(k => `-"${k}"`).join(' ');
  return excludeQuery ? `(${includeQuery}) ${excludeQuery}` : includeQuery;
}

function getScrapeConfig(source: MonitoringSource): Record<string, any> {
  return {
    timeout: 30000,
    retryCount: 2,
    userAgent: 'RepAZoo-Monitor/1.0',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
    },
    ...source.config,
  };
}

async function scrapeNewsSource(source: MonitoringSource, query: string, config: any): Promise<any[]> {
  // Implementation depends on news source APIs or web scraping
  // This is a simplified version
  try {
    const searchUrl = source.url?.includes('google.com/search')
      ? `${source.url}&q=${encodeURIComponent(query)}`
      : `${source.url}/search?q=${encodeURIComponent(query)}`;

    const results = await scrapeWebsite(searchUrl, {
      selectors: {
        articles: 'article, .article, .news-item',
        title: 'h1, h2, h3, .title, .headline',
        content: '.content, .article-body, p',
        author: '.author, .byline',
        date: '.date, .publish-date, time',
        url: 'a[href]',
      },
      maxResults: 50,
    });

    return results;
  } catch (error) {
    console.error('Error scraping news source:', error);
    return [];
  }
}

async function scrapeSocialMedia(source: MonitoringSource, query: string, config: any): Promise<any[]> {
  // Social media scraping would typically use APIs
  // This is a placeholder implementation
  return [];
}

async function scrapeForumSource(source: MonitoringSource, query: string, config: any): Promise<any[]> {
  // Forum scraping implementation
  try {
    const searchUrl = `${source.url}/search?q=${encodeURIComponent(query)}`;
    const results = await scrapeWebsite(searchUrl, {
      selectors: {
        posts: '.post, .message, .topic',
        title: '.post-title, .message-title',
        content: '.post-content, .message-body',
        author: '.author, .username',
        date: '.post-date, .message-date',
      },
      maxResults: 30,
    });
    return results;
  } catch (error) {
    console.error('Error scraping forum:', error);
    return [];
  }
}

async function scrapeRedditSource(source: MonitoringSource, query: string, config: any): Promise<any[]> {
  // Reddit API implementation would go here
  return [];
}

async function scrapeTwitterSource(source: MonitoringSource, query: string, config: any): Promise<any[]> {
  // Twitter API implementation would go here
  return [];
}

async function scrapeLinkedInSource(source: MonitoringSource, query: string, config: any): Promise<any[]> {
  // LinkedIn API implementation would go here
  return [];
}

async function scrapeGenericSource(source: MonitoringSource, query: string, config: any): Promise<any[]> {
  try {
    const results = await scrapeWebsite(source.url || '', {
      search: query,
      maxResults: 20,
    });
    return results;
  } catch (error) {
    console.error('Error scraping generic source:', error);
    return [];
  }
}

function calculateReputationImpact(sentimentScore: number, priority: string): number {
  let baseImpact = sentimentScore; // -1.0 to 1.0

  // Amplify based on priority
  switch (priority) {
    case 'CRITICAL':
      baseImpact *= 2.0;
      break;
    case 'HIGH':
      baseImpact *= 1.5;
      break;
    case 'MEDIUM':
      baseImpact *= 1.0;
      break;
    case 'LOW':
      baseImpact *= 0.5;
      break;
  }

  return Math.max(-1.0, Math.min(1.0, baseImpact));
}

async function createCrisisEvent(params: AlertTriggerParams): Promise<void> {
  try {
    await query(`
      INSERT INTO crisis_events (
        user_id, profile_id, title, description, severity,
        trigger_conditions, started_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      params.userId,
      params.profileId,
      `Crisis Alert: ${params.profileName}`,
      `Critical alerts triggered: ${params.alerts.map(a => a.message).join(', ')}`,
      'HIGH',
      JSON.stringify(params.alerts),
    ]);
  } catch (error) {
    console.error('Error creating crisis event:', error);
  }
}

function generateAlertEmailHTML(params: AlertTriggerParams, user: any): string {
  return `
    <html>
      <body>
        <h2>Reputation Alert for ${params.profileName}</h2>
        <p>Hello ${user.first_name || 'User'},</p>
        <p>We've detected important changes to your reputation monitoring:</p>
        <ul>
          ${params.alerts.map(alert => `
            <li><strong>${alert.severity}:</strong> ${alert.message}</li>
          `).join('')}
        </ul>
        <p><strong>Current Reputation Score:</strong> ${params.reputationScore}/100</p>
        <p>Please review your dashboard for more details.</p>
        <p>Best regards,<br/>RepAZoo Team</p>
      </body>
    </html>
  `;
}

function generateMentionId(): string {
  return 'mention_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Export all activities
export {
  scrapeSource as scrapeSourceEnhanced,
  analyzeMentionSentiment as analyzeSentiment,
  updateSourceScanStatus,
  calculateReputationScore,
  triggerAlerts,
  sendProgressNotification,
};