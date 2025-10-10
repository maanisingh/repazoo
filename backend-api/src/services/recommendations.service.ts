import { query } from '../config/database.js';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3:8b';

export interface Recommendation {
  id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedPost: string;
  reasoning: string;
}

export interface RecommendationsResult {
  success: boolean;
  recommendations?: Recommendation[];
  error?: string;
}

class RecommendationsService {
  /**
   * Generate AI-powered personalized recommendations for a user
   */
  async generateRecommendations(user_id: string): Promise<RecommendationsResult> {
    try {
      console.log(`Generating AI recommendations for user ${user_id}`);

      // 1. Get user's scan purpose from most recent scan
      const scanResult = await query(
        `SELECT purpose, custom_context
         FROM analysis_results
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [user_id]
      );

      const purpose = scanResult.rows[0]?.purpose || 'general';
      const custom_context = scanResult.rows[0]?.custom_context || '';

      // 2. Get user's mentions with high-risk content
      const mentionsResult = await query(
        `SELECT tweet_text, risk_level, risk_score, sentiment, sentiment_score, topics
         FROM twitter_mentions
         WHERE user_id = $1
         ORDER BY tweet_created_at DESC
         LIMIT 50`,
        [user_id]
      );

      const mentions = mentionsResult.rows;

      // 3. Calculate statistics
      const highRiskCount = mentions.filter(m => m.risk_level === 'high').length;
      const avgSentimentScore = mentions.length > 0
        ? mentions.reduce((sum, m) => sum + (m.sentiment_score || 0), 0) / mentions.length
        : 0;
      const avgRiskScore = mentions.length > 0
        ? mentions.reduce((sum, m) => sum + (m.risk_score || 0), 0) / mentions.length
        : 0;

      // 4. Extract common topics
      const allTopics = mentions
        .filter(m => m.topics && Array.isArray(m.topics))
        .flatMap(m => m.topics);
      const topicCounts = allTopics.reduce((acc: any, topic: string) => {
        acc[topic] = (acc[topic] || 0) + 1;
        return acc;
      }, {});
      const topTopics = Object.entries(topicCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic]) => topic);

      // 5. Get user's Twitter handle
      const userResult = await query(
        `SELECT twitter_handle FROM twitter_accounts WHERE user_id = $1 LIMIT 1`,
        [user_id]
      );
      const twitter_handle = userResult.rows[0]?.twitter_handle || 'user';

      // 6. Build AI prompt for personalized recommendations
      const prompt = this.buildRecommendationPrompt(
        twitter_handle,
        purpose,
        custom_context,
        highRiskCount,
        avgRiskScore,
        avgSentimentScore,
        topTopics,
        mentions.slice(0, 10) // Sample of recent tweets
      );

      // 7. Call Ollama to generate recommendations
      const recommendations = await this.callOllamaForRecommendations(prompt);

      return {
        success: true,
        recommendations,
      };
    } catch (error) {
      console.error('Generate recommendations error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate recommendations',
      };
    }
  }

  /**
   * Build the AI prompt for generating recommendations
   */
  private buildRecommendationPrompt(
    twitter_handle: string,
    purpose: string,
    custom_context: string,
    highRiskCount: number,
    avgRiskScore: number,
    avgSentimentScore: number,
    topTopics: string[],
    recentTweets: any[]
  ): string {
    const purposeContext = this.getPurposeContext(purpose);
    const tweetsText = recentTweets
      .map((t, idx) => `[${idx + 1}] ${t.tweet_text} (Risk: ${t.risk_level}, Sentiment: ${t.sentiment})`)
      .join('\n');

    return `You are a professional reputation advisor specializing in social media optimization. Generate 4 personalized, actionable recommendations to improve @${twitter_handle}'s Twitter reputation.

CONTEXT:
- Purpose: ${purposeContext}
${custom_context ? `- Custom Context: ${custom_context}` : ''}
- Current Profile Statistics:
  * High-risk tweets: ${highRiskCount}
  * Average risk score: ${avgRiskScore.toFixed(1)}/100
  * Average sentiment: ${avgSentimentScore.toFixed(2)} (-1 to +1 scale)
  * Common topics: ${topTopics.length > 0 ? topTopics.join(', ') : 'Not enough data'}

RECENT TWEETS SAMPLE:
${tweetsText || 'No recent tweets available'}

INSTRUCTIONS:
Generate EXACTLY 4 positive action recommendations. Each recommendation should:
1. Suggest WHAT TO POST (not what to delete or avoid)
2. Include a ready-to-use tweet template with [placeholders] for personalization
3. Be tailored to the user's current situation and purpose
4. Have clear reasoning explaining why this helps their reputation
5. Be realistic and achievable

CRITICAL: All 4 recommendations MUST be about creating NEW positive content. No deletion recommendations.

Priority levels:
- "high" = Will significantly impact reputation score (2 recommendations)
- "medium" = Will moderately improve profile (2 recommendations)

Output ONLY valid JSON (no markdown, no explanations) in this exact format:
{
  "recommendations": [
    {
      "id": "1",
      "type": "positive",
      "priority": "high",
      "title": "Brief Action Title (5-7 words)",
      "description": "One sentence explaining what to do (15-20 words)",
      "suggestedPost": "Ready-to-post tweet with [placeholder] for customization. Keep under 280 chars!",
      "reasoning": "Clear explanation of why this improves reputation for this specific purpose (20-30 words)"
    }
  ]
}`;
  }

  /**
   * Get purpose-specific context
   */
  private getPurposeContext(purpose: string): string {
    const contexts: { [key: string]: string } = {
      visa: 'USA Visa Application - Focus on demonstrating good character, professional conduct, and alignment with US values',
      student: 'Academic/Student Application - Emphasize maturity, academic integrity, and intellectual engagement',
      employment: 'Employment Background Check - Highlight professionalism, industry knowledge, and positive workplace attitudes',
      general: 'General Reputation Enhancement - Build a positive, authentic online presence',
    };
    return contexts[purpose] || contexts.general;
  }

  /**
   * Call Ollama API to generate recommendations
   */
  private async callOllamaForRecommendations(prompt: string): Promise<Recommendation[]> {
    console.log('Calling Ollama for AI recommendations...');

    const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.7, // More creative for recommendations
          num_predict: 2048,
        },
      }),
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama API error: ${ollamaResponse.statusText}`);
    }

    const data = await ollamaResponse.json();
    let responseText = data.response.trim();

    // Clean up response
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Ollama response:', responseText);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate and return recommendations
    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
      throw new Error('Invalid recommendations format from AI');
    }

    // Ensure we have exactly 4 recommendations
    const recommendations = parsed.recommendations.slice(0, 4);

    // Fill with defaults if less than 4
    while (recommendations.length < 4) {
      recommendations.push(this.getDefaultRecommendation(recommendations.length + 1));
    }

    return recommendations;
  }

  /**
   * Get a default recommendation as fallback
   */
  private getDefaultRecommendation(index: number): Recommendation {
    const defaults: Recommendation[] = [
      {
        id: '1',
        type: 'positive',
        priority: 'high',
        title: 'Share Professional Achievement',
        description: 'Post about recent professional accomplishments to improve your reputation score',
        suggestedPost: 'Excited to share that I successfully completed [your achievement]. Grateful for the learning experience and looking forward to applying these skills! #ProfessionalGrowth',
        reasoning: 'Professional achievements demonstrate competence and growth, which are valued across all screening contexts.',
      },
      {
        id: '2',
        type: 'positive',
        priority: 'high',
        title: 'Share Industry Insights',
        description: 'Post thoughtful commentary on trends in your field',
        suggestedPost: 'Interesting development in [your industry]: [observation]. This could impact [aspect] in meaningful ways. What are your thoughts?',
        reasoning: 'Demonstrating industry knowledge positions you as engaged and knowledgeable in your field.',
      },
      {
        id: '3',
        type: 'positive',
        priority: 'medium',
        title: 'Share Educational Content',
        description: 'Post about something you learned or insights from your field',
        suggestedPost: 'Just learned about [interesting topic]. Key takeaway: [your insight]. This could be valuable for [audience]. #Learning',
        reasoning: 'Educational content shows intellectual curiosity and willingness to share knowledge.',
      },
      {
        id: '4',
        type: 'positive',
        priority: 'medium',
        title: 'Share Community Involvement',
        description: 'Post about volunteer work or community engagement',
        suggestedPost: 'Volunteered with [organization] this weekend. Incredibly rewarding to give back to the community and make a positive impact! #Community',
        reasoning: 'Community involvement demonstrates character and social responsibility.',
      },
    ];

    return defaults[index - 1] || defaults[0];
  }
}

export const recommendationsService = new RecommendationsService();
