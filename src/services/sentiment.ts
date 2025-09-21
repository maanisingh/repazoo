import Sentiment from 'sentiment';

export interface SentimentResult {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number;
  confidence: number;
  keywords: string[];
}

export class SentimentAnalysisService {
  private static sentiment = new Sentiment();

  // Reputation-specific word additions
  private static customWords = {
    // Negative reputation words
    'fraud': -5,
    'scam': -5,
    'cheat': -4,
    'steal': -4,
    'lie': -3,
    'liar': -4,
    'dishonest': -4,
    'untrustworthy': -4,
    'corrupt': -4,
    'scandal': -4,
    'controversy': -3,
    'allegations': -3,
    'accused': -3,
    'lawsuit': -3,
    'sued': -3,
    'guilty': -4,
    'convicted': -5,
    'arrest': -4,
    'charged': -3,
    'investigate': -2,
    'fired': -3,
    'terminated': -3,
    'suspended': -2,
    'unprofessional': -3,
    'incompetent': -3,
    'negligent': -3,
    'rude': -2,
    'aggressive': -2,
    'harassment': -4,
    'discrimination': -4,
    'violation': -3,
    'breach': -3,
    'failure': -2,
    'mistake': -2,
    'error': -2,
    'problem': -2,
    'issue': -2,
    'concern': -2,
    'complaint': -2,
    'disappointed': -2,
    'unsatisfied': -2,
    'poor': -2,
    'bad': -2,
    'terrible': -3,
    'awful': -3,
    'horrible': -3,
    'worst': -3,

    // Positive reputation words
    'excellent': 4,
    'outstanding': 4,
    'exceptional': 4,
    'brilliant': 4,
    'amazing': 3,
    'fantastic': 3,
    'wonderful': 3,
    'great': 3,
    'good': 2,
    'professional': 3,
    'reliable': 3,
    'trustworthy': 4,
    'honest': 3,
    'ethical': 3,
    'integrity': 4,
    'respected': 3,
    'admired': 3,
    'praised': 3,
    'commended': 3,
    'recognized': 2,
    'awarded': 3,
    'honored': 3,
    'celebrated': 3,
    'successful': 2,
    'accomplished': 3,
    'skilled': 2,
    'talented': 3,
    'expert': 3,
    'experienced': 2,
    'knowledgeable': 2,
    'competent': 2,
    'capable': 2,
    'efficient': 2,
    'effective': 2,
    'helpful': 2,
    'supportive': 2,
    'friendly': 2,
    'kind': 2,
    'generous': 2,
    'dedicated': 2,
    'committed': 2,
    'loyal': 2,
    'innovative': 2,
    'creative': 2,
    'leader': 2,
    'leadership': 2,
    'mentor': 2,
    'role model': 3,
  };

  static initialize() {
    // Add custom words to sentiment analyzer
    // Note: The sentiment library doesn't support registerWords,
    // so we'll handle custom words in our analysis logic
  }

  static analyze(text: string, context?: string): SentimentResult {
    // Clean and prepare text
    const cleanText = this.preprocessText(text);
    const fullText = context ? `${context} ${cleanText}` : cleanText;

    // Run basic sentiment analysis
    const result = this.sentiment.analyze(fullText);

    // Apply our custom word scoring
    let customScore = 0;
    const words = cleanText.split(' ');
    for (const word of words) {
      if (this.customWords[word]) {
        customScore += this.customWords[word];
      }
    }

    // Combine base score with custom score
    const combinedScore = result.comparative + (customScore * 0.1);

    // Extract keywords
    const keywords = this.extractKeywords(cleanText);

    // Calculate confidence based on comparative score magnitude
    const confidence = Math.min(Math.abs(combinedScore) * 10, 1.0);

    // Determine sentiment category
    let sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    if (combinedScore > 0.1) {
      sentiment = 'POSITIVE';
    } else if (combinedScore < -0.1) {
      sentiment = 'NEGATIVE';
    } else {
      sentiment = 'NEUTRAL';
    }

    // Adjust for reputation-specific context
    const adjustedResult = this.adjustForReputationContext(
      sentiment,
      combinedScore,
      confidence,
      keywords
    );

    return {
      sentiment: adjustedResult.sentiment,
      score: adjustedResult.score,
      confidence: adjustedResult.confidence,
      keywords,
    };
  }

  private static preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation except apostrophes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private static extractKeywords(text: string): string[] {
    const words = text.split(' ');
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);

    const keywords = words
      .filter(word => word.length > 2 && !stopWords.has(word))
      .filter(word => Object.keys(this.customWords).includes(word) || word.length > 4)
      .slice(0, 10); // Limit to top 10 keywords

    return [...new Set(keywords)]; // Remove duplicates
  }

  private static adjustForReputationContext(
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
    score: number,
    confidence: number,
    keywords: string[]
  ): { sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'; score: number; confidence: number } {
    // Check for high-impact reputation keywords
    const highImpactNegative = [
      'fraud', 'scam', 'lawsuit', 'convicted', 'arrest', 'fired', 'scandal'
    ];
    const highImpactPositive = [
      'awarded', 'honored', 'exceptional', 'outstanding', 'trustworthy'
    ];

    let adjustedSentiment = sentiment;
    let adjustedScore = score;
    let adjustedConfidence = confidence;

    // Boost confidence and adjust sentiment for high-impact words
    for (const keyword of keywords) {
      if (highImpactNegative.includes(keyword)) {
        adjustedSentiment = 'NEGATIVE';
        adjustedScore = Math.min(adjustedScore - 0.5, -0.5);
        adjustedConfidence = Math.max(adjustedConfidence, 0.8);
      } else if (highImpactPositive.includes(keyword)) {
        adjustedSentiment = 'POSITIVE';
        adjustedScore = Math.max(adjustedScore + 0.5, 0.5);
        adjustedConfidence = Math.max(adjustedConfidence, 0.8);
      }
    }

    return {
      sentiment: adjustedSentiment,
      score: adjustedScore,
      confidence: Math.min(adjustedConfidence, 1.0),
    };
  }

  static async batchAnalyze(texts: string[]): Promise<SentimentResult[]> {
    return texts.map(text => this.analyze(text));
  }

  static getRiskLevel(sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL', score: number, confidence: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (sentiment === 'POSITIVE') return 'LOW';
    if (sentiment === 'NEUTRAL') return 'LOW';

    // For negative sentiment, determine risk based on score and confidence
    if (confidence < 0.3) return 'LOW';
    if (score > -0.3) return 'MEDIUM';
    if (score > -0.7) return 'HIGH';
    return 'CRITICAL';
  }

  static shouldTriggerAlert(sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL', score: number, confidence: number, keywords: string[]): boolean {
    // Alert on negative sentiment with high confidence
    if (sentiment === 'NEGATIVE' && confidence > 0.5) return true;

    // Alert on specific high-impact keywords regardless of sentiment
    const criticalKeywords = ['fraud', 'scam', 'lawsuit', 'arrest', 'convicted', 'fired'];
    return keywords.some(keyword => criticalKeywords.includes(keyword));
  }
}

// Initialize the service with custom words
SentimentAnalysisService.initialize();