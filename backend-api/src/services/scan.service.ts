import { query } from '../config/database.js';
import { config } from '../config/env.js';
import { twitterService } from './twitter.service.js';
import { tweetCacheService } from './tweet-cache.service.js';
import { analysisReuseService } from './analysis-reuse.service.js';
import { imageAnalysisService } from './image-analysis.service.js';

// Use local Ollama instead of Anthropic
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3:8b';

interface ScanResult {
  id: string;
  user_id: string;
  twitter_account_id: string;
  purpose: string;
  model_used: string;
  analysis_type: string;
  input_data: any;
  output_data: any;
  execution_time_ms: number;
  created_at: Date;
  twitter_username?: string;
}

export class ScanService {
  /**
   * Create a new scan record
   */
  async createScan(
    user_id: string,
    twitter_account_id: string,
    purpose: string,
    custom_context?: string,
    external_scan_id?: string
  ): Promise<string> {
    const result = await query<{ id: string }>(
      `INSERT INTO analysis_results (
        user_id, twitter_account_id, purpose, model_used, analysis_type,
        input_data, output_data, execution_time_ms, created_at
      )
       VALUES ($1, $2, $3, 'sonnet', 'reputation_scan', $4, '{}'::jsonb, 0, NOW())
       RETURNING id`,
      [
        user_id,
        twitter_account_id,
        purpose,
        JSON.stringify({
          custom_context: custom_context || null,
          status: 'pending',
          external_scan_id: external_scan_id || null
        }),
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Update scan with analysis results (supports both UUID and external_scan_id)
   */
  async updateScanResults(
    scan_id: string,
    output_data: any,
    execution_time_ms: number
  ): Promise<void> {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scan_id);

    await query(
      `UPDATE analysis_results
       SET output_data = $1, execution_time_ms = $2
       WHERE ${isUUID ? 'id = $3' : "input_data->>'external_scan_id' = $3"}`,
      [JSON.stringify(output_data), execution_time_ms, scan_id]
    );
  }

  /**
   * Perform Twitter reputation analysis using local Ollama (llama3:8b)
   * With smart caching: Only analyze new tweets, reuse previous analysis
   */
  async performReputationAnalysis(
    scan_id: string,
    user_id: string,
    twitter_account_id: string,
    twitter_handle: string,
    purpose: string,
    custom_context?: string
  ): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();

    try {
      // STEP 1: Get current cache status
      const cacheStats = await analysisReuseService.getCacheStats(twitter_account_id);
      let newTweetsFetched = 0;

      // STEP 2: Fetch tweets from Twitter if:
      // - Cache needs refresh (24+ hours old)
      // - OR we have a newest_tweet_id to fetch incremental updates
      // - OR this is first time (no cached tweets yet)
      const needsFetch = cacheStats.needs_refresh || cacheStats.newest_tweet_id || cacheStats.tweet_count === 0;

      if (needsFetch) {
        const actionMsg = cacheStats.tweet_count === 0 ? '📥 First-time fetch' : '🔄 Checking for new tweets';
        console.log(`${actionMsg} since last sync...`);

        try {
          const fetchResult = await twitterService.fetchUserTweetsIncremental(
            user_id,
            cacheStats.newest_tweet_id || undefined
          );

          if (fetchResult.tweets.length > 0) {
            console.log(`✨ Found ${fetchResult.tweets.length} new tweets`);
            newTweetsFetched = fetchResult.tweets.length;
            await tweetCacheService.cacheTweets(
              twitter_account_id,
              fetchResult.tweets,
              fetchResult.newest_id
            );
          } else {
            console.log(`✓ No new tweets since last sync`);
          }
        } catch (fetchError) {
          console.log(`⚠️ Twitter API error:`, fetchError);
          // On first fetch, this is fatal; on refresh, we can use cached tweets
          if (cacheStats.tweet_count === 0) {
            throw new Error(`Failed to fetch tweets: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
          }
          console.log(`⚠️ Using cached tweets only`);
        }
      }

      // STEP 3: Get all cached tweets
      const allTweets = await tweetCacheService.getCachedTweets(twitter_account_id);

      if (!allTweets || allTweets.length === 0) {
        const error_output = {
          status: 'failed',
          error: 'No tweets available. Twitter account may be private or have no tweets.',
          twitter_handle,
        };
        await this.updateScanResults(scan_id, error_output, Date.now() - startTime);
        return { success: false, error: 'No tweets available' };
      }

      // STEP 3: Check for unanalyzed tweets for this purpose
      const unanalyzedTweets = await analysisReuseService.getUnanalyzedTweets(
        twitter_account_id,
        purpose
      );

      // STEP 4: If no new tweets to analyze, reuse previous analysis
      if (unanalyzedTweets.length === 0) {
        console.log(`♻️ No new tweets to analyze. Reusing previous analysis for ${purpose}`);
        const previousAnalysis = await analysisReuseService.getPreviousAnalysis(
          twitter_account_id,
          purpose
        );

        if (previousAnalysis) {
          const output_data = {
            ...previousAnalysis.output_data,
            cache_info: {
              used_cached_tweets: true,
              used_cached_analysis: true,
              new_tweets_analyzed: 0,
              total_tweets_cached: allTweets.length,
              last_sync: cacheStats.last_sync,
            },
          };

          await this.updateScanResults(scan_id, output_data, Date.now() - startTime);
          return { success: true };
        }
      }

      // STEP 5: Analyze images in unanalyzed tweets (if they have media)
      const tweetsWithImages = unanalyzedTweets.filter(t => t.has_media && t.media_data);
      if (tweetsWithImages.length > 0) {
        console.log(`📸 Analyzing images in ${tweetsWithImages.length} tweets with media...`);
        await this.analyzeImagesInTweets(tweetsWithImages);
      }

      // STEP 6: Analyze only unanalyzed tweets (or all if first time)
      console.log(
        `🧠 Analyzing ${unanalyzedTweets.length} tweets for ${purpose} (${allTweets.length} total cached)`
      );

      const analysisResult = await this.analyzeWithAI(
        unanalyzedTweets,
        twitter_handle,
        purpose,
        custom_context
      );

      // STEP 7: Merge with previous analysis if exists
      const previousAnalysis = await analysisReuseService.getPreviousAnalysis(
        twitter_account_id,
        purpose
      );

      let finalAnalysis;
      if (previousAnalysis && unanalyzedTweets.length < allTweets.length) {
        finalAnalysis = this.mergeAnalyses(analysisResult, previousAnalysis.output_data);
      } else {
        finalAnalysis = analysisResult;
      }

      // Add cache metadata
      const output_data = {
        ...finalAnalysis,
        cache_info: {
          used_cached_tweets: true,
          used_cached_analysis: previousAnalysis !== null,
          new_tweets_analyzed: unanalyzedTweets.length,
          new_tweets_fetched: newTweetsFetched,
          total_tweets_cached: allTweets.length,
          last_sync: cacheStats.last_sync,
        },
      };

      await this.updateScanResults(scan_id, output_data, Date.now() - startTime);

      // STEP 8: Link analyzed tweets to this scan
      const analyzedTweetIds = unanalyzedTweets.map((t) => t.id);
      await analysisReuseService.linkAnalyzedTweets(scan_id, analyzedTweetIds, purpose);

      return { success: true };
    } catch (error) {
      console.error(`Scan analysis failed for ${scan_id}:`, error);
      const error_output = {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Analysis failed',
        twitter_handle,
      };
      await this.updateScanResults(scan_id, error_output, Date.now() - startTime);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      };
    }
  }

  /**
   * Analyze images in tweets using LLaVA vision model
   */
  private async analyzeImagesInTweets(tweets: any[]): Promise<void> {
    for (const tweet of tweets) {
      try {
        if (!tweet.media_data || typeof tweet.media_data !== 'object') {
          continue;
        }

        // Parse media_data if it's a string
        const mediaData = typeof tweet.media_data === 'string'
          ? JSON.parse(tweet.media_data)
          : tweet.media_data;

        if (!Array.isArray(mediaData) || mediaData.length === 0) {
          continue;
        }

        console.log(`  📷 Analyzing ${mediaData.length} images in tweet ${tweet.tweet_id}...`);

        // Analyze all images in this tweet
        const imageAnalyses = await imageAnalysisService.analyzeMediaItems(mediaData);

        if (imageAnalyses.length > 0) {
          // Aggregate the analyses
          const aggregated = imageAnalysisService.aggregateAnalyses(imageAnalyses);

          // Store in database
          await query(
            `UPDATE tweets
             SET image_analysis = $1
             WHERE id = $2`,
            [JSON.stringify({
              analyses: imageAnalyses,
              summary: aggregated,
              analyzed_at: new Date().toISOString(),
            }), tweet.id]
          );

          // Add to tweet object for immediate use in AI analysis
          tweet.image_analysis = {
            analyses: imageAnalyses,
            summary: aggregated,
          };

          console.log(`  ✅ Image analysis complete for tweet ${tweet.tweet_id}`);
        }
      } catch (error) {
        console.error(`Failed to analyze images in tweet ${tweet.id}:`, error);
        // Continue with other tweets even if one fails
      }
    }
  }

  /**
   * Analyze tweets with AI (extracted for reuse)
   */
  private async analyzeWithAI(
    tweets: any[],
    twitter_handle: string,
    purpose: string,
    custom_context?: string
  ): Promise<any> {
    const purposeContext = this.getPurposeContext(purpose, custom_context);

    // Format tweets with media and image analysis information
    const tweetsText = tweets
      .map((tweet, idx) => {
        const text = tweet.text || tweet.tweet_text;

        // Add image analysis if available
        let imageInfo = '';
        if (tweet.image_analysis?.summary) {
          const summary = tweet.image_analysis.summary;
          imageInfo = `\n   [IMAGE ANALYSIS: ${summary.combined_description}`;
          if (summary.all_ocr_text.length > 0) {
            imageInfo += `\n    TEXT IN IMAGES: "${summary.all_ocr_text.join(', ')}"`;
          }
          if (summary.has_inappropriate_content) {
            imageInfo += `\n    ⚠️ INAPPROPRIATE CONTENT DETECTED (${summary.max_severity} severity)`;
          }
          imageInfo += `\n    IMAGE SENTIMENT: ${summary.overall_sentiment}]`;
        } else if (tweet.has_media) {
          // Fallback to basic media info if no image analysis
          imageInfo = ` [Contains ${tweet.media_count} ${tweet.media_count === 1 ? 'image/video' : 'images/videos'}${
            tweet.media && tweet.media.length > 0
              ? `: ${tweet.media.map((m: any) => `${m.type}${m.alt_text ? ` - "${m.alt_text}"` : ''}`).join(', ')}`
              : ''
          }]`;
        }

        return `[${idx + 1}] ${text}${imageInfo} (${tweet.created_at})`;
      })
      .join('\n\n');

    // Count tweets with media and image analysis
    const tweetsWithMedia = tweets.filter(t => t.has_media).length;
    const tweetsWithImageAnalysis = tweets.filter(t => t.image_analysis?.summary).length;
    const mediaNote = tweetsWithMedia > 0
      ? `\n\nNote: ${tweetsWithMedia} of ${tweets.length} tweets contain images/videos${
          tweetsWithImageAnalysis > 0
            ? `. ${tweetsWithImageAnalysis} images have been analyzed using AI vision (descriptions, OCR, sentiment, inappropriate content detection included above).`
            : '. Consider visual content when assessing reputation.'
        }`
      : '';

    const prompt = `You are a professional reputation analyst. Analyze the following ${tweets.length} tweets from @${twitter_handle} for ${purposeContext}.

Tweets:
${tweetsText}${mediaNote}

Provide a comprehensive JSON analysis with:
1. overall_score (0-100, where 100 = excellent/safe, 0 = very problematic)
2. sentiment breakdown (positive, neutral, negative percentages summing to 100)
3. toxicity_score (0-100, where 0 is non-toxic, 100 is extremely toxic)
4. hate_speech_detected (boolean)
5. key_findings (array of 3-5 strings highlighting important observations)
6. recommendations (array of 3-5 actionable suggestions)

IMPORTANT ANALYSIS GUIDELINES:
- Higher overall_score means LOWER risk. Score 80-100 is excellent, 60-79 is acceptable, 40-59 is concerning, 0-39 is problematic.
- If IMAGE ANALYSIS is present, carefully consider the visual content, OCR text, and inappropriate content flags.
- Inappropriate content detected in images should SIGNIFICANTLY lower the overall_score.
- Consider both tweet text AND image content for a complete reputation assessment.

Return ONLY valid JSON, no other text.`;

    // Call Ollama API
    const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 4096, // Increased to ensure complete JSON
        },
      }),
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama API error: ${ollamaResponse.statusText}`);
    }

    const ollamaData = (await ollamaResponse.json()) as { response: string };
    const responseText = ollamaData.response;

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from model response');
    }

    // Clean up common JSON issues from AI models
    let jsonString = jsonMatch[0]
      .replace(/,\s*}/g, '}')          // Remove trailing commas before }
      .replace(/,\s*]/g, ']')          // Remove trailing commas before ]
      .replace(/\/\/.*/g, '')          // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments

    let analysis;
    try {
      analysis = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Problematic JSON:', jsonString.substring(0, 200));
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
    }

    // Calculate risk level based on score (higher score = lower risk)
    const score = analysis.overall_score || 85;
    const calculatedRiskLevel = this.calculateRiskLevel(score);

    // Provide fallback values for missing fields
    return {
      status: 'completed',
      twitter_handle,
      tweets_analyzed: tweets.length,
      overall_score: score,
      risk_level: calculatedRiskLevel, // Use calculated risk level based on score
      sentiment: analysis.sentiment || { positive: 0.85, neutral: 0.10, negative: 0.05 },
      toxicity_score: analysis.toxicity_score || 0,
      hate_speech_detected: analysis.hate_speech_detected || false,
      key_findings: analysis.key_findings || ['Limited tweet data available for comprehensive analysis'],
      recommendations: analysis.recommendations || ['Continue monitoring account activity'],
      tweets_list: tweets.slice(0, 10).map((t) => ({
        text: t.text || t.tweet_text,
        created_at: t.created_at,
        has_media: t.has_media || false,
        media_count: t.media_count || 0,
        media: t.media || [],
        image_analysis: t.image_analysis || null,
        has_image_analysis: !!(t.image_analysis?.summary),
        public_metrics:
          typeof t.public_metrics === 'string' ? JSON.parse(t.public_metrics) : t.public_metrics,
      })),
    };
  }

  /**
   * Merge new analysis with previous analysis
   */
  private mergeAnalyses(newAnalysis: any, previousAnalysis: any): any {
    // Simple merge: Average scores, combine findings
    const avgScore = Math.round(
      (newAnalysis.overall_score + previousAnalysis.overall_score) / 2
    );

    const combinedFindings = [
      ...(newAnalysis.key_findings || []),
      ...(previousAnalysis.key_findings || []),
    ].slice(0, 5);

    const combinedRecommendations = [
      ...(newAnalysis.recommendations || []),
      ...(previousAnalysis.recommendations || []),
    ].slice(0, 5);

    return {
      ...newAnalysis,
      overall_score: avgScore,
      key_findings: combinedFindings,
      recommendations: combinedRecommendations,
      merged_from_previous: true,
    };
  }

  /**
   * Calculate risk level based on score (higher score = lower risk)
   */
  private calculateRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 70) return 'low';        // 70-100 = Low Risk
    if (score >= 40) return 'medium';     // 40-69 = Medium Risk
    if (score >= 20) return 'high';       // 20-39 = High Risk
    return 'critical';                    // 0-19 = Critical Risk
  }

  /**
   * Get purpose-specific context
   */
  private getPurposeContext(purpose: string, custom_context?: string): string {
    const contexts: Record<string, string> = {
      visa: 'USA visa application - focus on political views, security concerns, extremism, immigration policy violations',
      student: 'student/academic application - focus on academic integrity, professionalism, plagiarism, maturity',
      employment: 'employment background check - focus on professional conduct, discriminatory content, employer comments',
      general: 'general reputation analysis - focus on overall sentiment, controversial posts, harassment, privacy',
    };

    if (purpose === 'custom' && custom_context) {
      return custom_context;
    }

    return contexts[purpose] || contexts.general;
  }

  /**
   * Get scan by ID (supports both UUID and external_scan_id)
   */
  async getScanById(scan_id: string): Promise<any | null> {
    // Check if it's a UUID format or external scan ID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scan_id);

    const result = await query<ScanResult>(
      `SELECT
        ar.id,
        ar.user_id,
        ar.twitter_account_id,
        ar.purpose,
        ar.model_used,
        ar.analysis_type,
        ar.input_data,
        ar.output_data,
        ar.execution_time_ms,
        ar.created_at,
        ta.twitter_username
       FROM analysis_results ar
       LEFT JOIN twitter_accounts ta ON ar.twitter_account_id = ta.id
       WHERE ${isUUID ? 'ar.id = $1' : "ar.input_data->>'external_scan_id' = $1"}`,
      [scan_id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const scan = result.rows[0];
    return {
      scan_id: scan.input_data?.external_scan_id || scan.id,
      user_id: scan.user_id,
      twitter_handle: scan.twitter_username || 'unknown',
      purpose: scan.purpose,
      status: scan.output_data?.status || scan.input_data?.status || 'pending',
      created_at: scan.created_at,
      analysis_result: scan.output_data, // Wrap in analysis_result for frontend compatibility
      cache_info: scan.output_data?.cache_info || null, // Expose cache metadata
    };
  }

  /**
   * Get all scans for a user
   */
  async getAllScans(user_id?: string): Promise<any[]> {
    const queryText = user_id
      ? `SELECT
          ar.id,
          ar.user_id,
          ar.twitter_account_id,
          ar.purpose,
          ar.model_used,
          ar.analysis_type,
          ar.input_data,
          ar.output_data,
          ar.execution_time_ms,
          ar.created_at,
          ta.twitter_username
         FROM analysis_results ar
         LEFT JOIN twitter_accounts ta ON ar.twitter_account_id = ta.id
         WHERE ar.user_id = $1
         ORDER BY ar.created_at DESC`
      : `SELECT
          ar.id,
          ar.user_id,
          ar.twitter_account_id,
          ar.purpose,
          ar.model_used,
          ar.analysis_type,
          ar.input_data,
          ar.output_data,
          ar.execution_time_ms,
          ar.created_at,
          ta.twitter_username
         FROM analysis_results ar
         LEFT JOIN twitter_accounts ta ON ar.twitter_account_id = ta.id
         ORDER BY ar.created_at DESC
         LIMIT 100`;

    const result = await query<ScanResult & { twitter_username: string }>(
      queryText,
      user_id ? [user_id] : []
    );

    return result.rows.map((scan) => ({
      scan_id: scan.id,
      user_id: scan.user_id,
      twitter_handle: scan.twitter_username || 'unknown',
      purpose: scan.purpose,
      status: scan.output_data?.status || 'pending',
      overall_score: scan.output_data?.overall_score || null,
      risk_level: scan.output_data?.risk_level || null,
      created_at: scan.created_at,
    }));
  }

  /**
   * Get dashboard stats for a specific user
   */
  async getDashboardStats(user_id: string) {
    const result = await query(`
      SELECT
        COUNT(*) as total_scans,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today_scans,
        AVG(CAST(output_data->>'overall_score' AS FLOAT)) as average_risk_score,
        COUNT(CASE WHEN output_data->>'risk_level' IN ('high', 'critical') THEN 1 END) as high_risk_accounts
      FROM analysis_results
      WHERE output_data->>'status' = 'completed'
        AND user_id = $1
    `, [user_id]);

    return result.rows[0] || {
      total_scans: 0,
      today_scans: 0,
      average_risk_score: 0,
      high_risk_accounts: 0,
    };
  }
}

export const scanService = new ScanService();
