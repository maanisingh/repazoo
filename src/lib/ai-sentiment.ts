import * as tf from '@tensorflow/tfjs-node';
import * as sentiment from 'sentiment';

export interface SentimentResult {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number;
  confidence: number;
  emotions?: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
  };
}

class LocalSentimentAnalyzer {
  private sentimentAnalyzer: any;
  private initialized = false;

  constructor() {
    this.sentimentAnalyzer = new sentiment();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[AI] Initializing local sentiment analyzer...');
    this.initialized = true;
    console.log('[AI] Local sentiment analyzer ready');
  }

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    await this.initialize();

    try {
      // Use the sentiment library for basic analysis
      const result = this.sentimentAnalyzer.analyze(text);

      // Normalize score to -1 to 1 range
      const normalizedScore = Math.max(-1, Math.min(1, result.score / 10));

      // Determine sentiment category
      let sentimentCategory: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL';
      if (normalizedScore > 0.2) {
        sentimentCategory = 'POSITIVE';
      } else if (normalizedScore < -0.2) {
        sentimentCategory = 'NEGATIVE';
      }

      // Calculate confidence based on the absolute score and word count
      const wordCount = text.split(' ').length;
      const confidence = Math.min(0.95, Math.max(0.5,
        (Math.abs(normalizedScore) * 0.8) + (Math.min(wordCount, 20) / 20 * 0.2)
      ));

      // Enhanced emotion detection
      const emotions = this.analyzeEmotions(text, result);

      return {
        sentiment: sentimentCategory,
        score: normalizedScore,
        confidence,
        emotions
      };

    } catch (error) {
      console.error('[AI] Sentiment analysis failed:', error);

      // Fallback to basic keyword analysis
      return this.basicSentimentAnalysis(text);
    }
  }

  private analyzeEmotions(text: string, sentimentResult: any) {
    const lowerText = text.toLowerCase();

    // Keywords for different emotions
    const joyWords = ['happy', 'joy', 'great', 'excellent', 'wonderful', 'amazing', 'fantastic', 'love', 'pleased', 'delighted'];
    const angerWords = ['angry', 'furious', 'hate', 'terrible', 'awful', 'disgusting', 'outrageous', 'frustrated'];
    const fearWords = ['scared', 'afraid', 'worried', 'nervous', 'anxious', 'concerned', 'frightened'];
    const sadnessWords = ['sad', 'disappointed', 'depressed', 'unhappy', 'miserable', 'devastated', 'heartbroken'];

    const emotions = {
      joy: this.calculateEmotionScore(lowerText, joyWords),
      anger: this.calculateEmotionScore(lowerText, angerWords),
      fear: this.calculateEmotionScore(lowerText, fearWords),
      sadness: this.calculateEmotionScore(lowerText, sadnessWords)
    };

    return emotions;
  }

  private calculateEmotionScore(text: string, keywords: string[]): number {
    let score = 0;
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        score += 0.1;
      }
    });
    return Math.min(1.0, score);
  }

  private basicSentimentAnalysis(text: string): SentimentResult {
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'awesome', 'brilliant', 'perfect', 'outstanding', 'superb', 'exceptional',
      'love', 'like', 'enjoy', 'pleased', 'satisfied', 'happy', 'delighted'
    ];

    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'disappointing', 'poor',
      'worst', 'hate', 'dislike', 'frustrated', 'angry', 'upset',
      'disgusting', 'pathetic', 'useless', 'broken', 'failed'
    ];

    const reputationPositive = [
      'reliable', 'trustworthy', 'professional', 'quality', 'recommended',
      'impressed', 'efficient', 'helpful', 'responsive', 'competent'
    ];

    const reputationNegative = [
      'unreliable', 'untrustworthy', 'unprofessional', 'scam', 'fraud',
      'incompetent', 'slow', 'unhelpful', 'rude', 'dishonest'
    ];

    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    let reputationImpact = 0;

    // Count positive words
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveCount++;
    });
    reputationPositive.forEach(word => {
      if (lowerText.includes(word)) {
        positiveCount++;
        reputationImpact += 0.2;
      }
    });

    // Count negative words
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeCount++;
    });
    reputationNegative.forEach(word => {
      if (lowerText.includes(word)) {
        negativeCount++;
        reputationImpact -= 0.2;
      }
    });

    // Calculate sentiment
    let sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL';
    let score = 0;

    const netSentiment = positiveCount - negativeCount;

    if (netSentiment > 0) {
      sentiment = 'POSITIVE';
      score = Math.min(0.9, 0.3 + (netSentiment * 0.2) + reputationImpact);
    } else if (netSentiment < 0) {
      sentiment = 'NEGATIVE';
      score = Math.max(-0.9, -0.3 + (netSentiment * 0.2) + reputationImpact);
    } else if (Math.abs(reputationImpact) > 0.1) {
      sentiment = reputationImpact > 0 ? 'POSITIVE' : 'NEGATIVE';
      score = reputationImpact;
    }

    const confidence = Math.max(0.6, Math.min(0.85,
      0.6 + (Math.abs(netSentiment) * 0.1) + (Math.abs(reputationImpact) * 0.2)
    ));

    return {
      sentiment,
      score,
      confidence,
      emotions: {
        joy: positiveCount > 0 ? Math.min(1.0, positiveCount * 0.2) : 0,
        anger: negativeCount > 0 ? Math.min(1.0, negativeCount * 0.2) : 0,
        fear: 0,
        sadness: 0
      }
    };
  }

  async analyzeMultiple(texts: string[]): Promise<SentimentResult[]> {
    const results = await Promise.all(
      texts.map(text => this.analyzeSentiment(text))
    );
    return results;
  }

  async getAggregateScore(texts: string[]): Promise<{
    averageScore: number;
    overallSentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    confidence: number;
    distribution: { positive: number; negative: number; neutral: number };
  }> {
    const results = await this.analyzeMultiple(texts);

    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    const averageScore = totalScore / results.length;

    const distribution = results.reduce((dist, result) => {
      dist[result.sentiment.toLowerCase()]++;
      return dist;
    }, { positive: 0, negative: 0, neutral: 0 });

    const overallSentiment = averageScore > 0.1 ? 'POSITIVE' :
                            averageScore < -0.1 ? 'NEGATIVE' : 'NEUTRAL';

    const confidence = results.reduce((sum, result) => sum + result.confidence, 0) / results.length;

    return {
      averageScore,
      overallSentiment,
      confidence,
      distribution
    };
  }
}

// Export singleton instance
export const aiSentiment = new LocalSentimentAnalyzer();

// Convenience function for simple sentiment analysis
export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  return aiSentiment.analyzeSentiment(text);
}

// Analyze reputation mentions with enhanced business context
export async function analyzeReputationMention(
  text: string,
  brandName?: string
): Promise<SentimentResult & { reputationImpact: number; businessRelevance: number }> {
  const result = await aiSentiment.analyzeSentiment(text);

  // Calculate reputation impact (how much this affects brand reputation)
  let reputationImpact = Math.abs(result.score);

  // Boost impact if brand name is mentioned
  if (brandName && text.toLowerCase().includes(brandName.toLowerCase())) {
    reputationImpact *= 1.5;
  }

  // Business context keywords that increase relevance
  const businessKeywords = [
    'customer', 'service', 'support', 'product', 'purchase', 'buy',
    'recommend', 'review', 'experience', 'quality', 'price', 'value'
  ];

  const businessRelevance = businessKeywords.filter(keyword =>
    text.toLowerCase().includes(keyword)
  ).length / businessKeywords.length;

  return {
    ...result,
    reputationImpact: Math.min(1.0, reputationImpact),
    businessRelevance: Math.min(1.0, businessRelevance)
  };
}