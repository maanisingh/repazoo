import axios from 'axios';
import { config } from '../config/env.js';

interface ImageAnalysisResult {
  scene_description: string;
  ocr_text: string | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  inappropriate_content: {
    detected: boolean;
    categories: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  confidence_score: number;
}

interface MediaItem {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
  alt_text?: string;
}

class ImageAnalysisService {
  private ollamaBaseUrl: string;
  private ollamaModel: string;

  constructor() {
    this.ollamaBaseUrl = config.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.ollamaModel = 'llava:7b';
  }

  /**
   * Analyze a single image using LLaVA vision model
   */
  async analyzeImage(imageUrl: string, altText?: string): Promise<ImageAnalysisResult> {
    try {
      console.log(`Analyzing image: ${imageUrl.substring(0, 100)}...`);

      // Download the image and convert to base64
      const imageBase64 = await this.downloadAndEncodeImage(imageUrl);

      // Create analysis prompt
      const prompt = `Analyze this image comprehensively and provide:

1. Scene Description: Describe what you see in the image (people, objects, setting, activities)
2. Text Content: Extract any visible text (OCR) - if no text, say "None"
3. Sentiment: Classify the overall sentiment as positive, neutral, or negative
4. Inappropriate Content: Identify any concerning content including:
   - Violence or weapons
   - Explicit or sexual content
   - Hate symbols or offensive gestures
   - Drug-related imagery
   - Self-harm indicators

Provide your analysis in this JSON format:
{
  "scene_description": "detailed description here",
  "ocr_text": "extracted text or null",
  "sentiment": "positive/neutral/negative",
  "inappropriate_content": {
    "detected": true/false,
    "categories": ["category1", "category2"],
    "severity": "low/medium/high/critical"
  },
  "confidence_score": 0.0-1.0
}

${altText ? `\nImage alt text (for context): ${altText}` : ''}

Return ONLY valid JSON, no other text.`;

      // Call LLaVA model
      const response = await axios.post(
        `${this.ollamaBaseUrl}/api/generate`,
        {
          model: this.ollamaModel,
          prompt: prompt,
          images: [imageBase64],
          stream: false,
          options: {
            temperature: 0.2, // Lower temperature for more factual analysis
            num_predict: 512, // Enough for detailed JSON response
          },
        },
        {
          timeout: 60000, // 60 second timeout for vision model
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Parse the response
      const responseText = response.data.response;
      console.log('LLaVA raw response:', responseText.substring(0, 200));

      // Extract JSON from response (handle potential markdown formatting)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in LLaVA response, using default analysis');
        return this.getDefaultAnalysis('Failed to parse image analysis');
      }

      const analysis: ImageAnalysisResult = JSON.parse(jsonMatch[0]);

      // Validate and normalize the analysis
      return {
        scene_description: analysis.scene_description || 'No description available',
        ocr_text: analysis.ocr_text === 'None' ? null : analysis.ocr_text,
        sentiment: this.validateSentiment(analysis.sentiment),
        inappropriate_content: {
          detected: analysis.inappropriate_content?.detected || false,
          categories: Array.isArray(analysis.inappropriate_content?.categories)
            ? analysis.inappropriate_content.categories
            : [],
          severity: this.validateSeverity(analysis.inappropriate_content?.severity),
        },
        confidence_score: this.clampConfidence(analysis.confidence_score),
      };
    } catch (error) {
      console.error(`Image analysis failed for ${imageUrl}:`, error);

      // Return safe default for errors
      return this.getDefaultAnalysis('Image analysis failed due to error');
    }
  }

  /**
   * Analyze multiple images from tweet media
   */
  async analyzeMediaItems(mediaItems: MediaItem[]): Promise<ImageAnalysisResult[]> {
    if (!mediaItems || mediaItems.length === 0) {
      return [];
    }

    // Filter for images only (exclude videos, gifs)
    const imageItems = mediaItems.filter(
      (item) => item.type === 'photo' && (item.url || item.preview_image_url)
    );

    if (imageItems.length === 0) {
      return [];
    }

    console.log(`Analyzing ${imageItems.length} images from tweet media`);

    // Analyze images in parallel (limit concurrency to avoid overwhelming Ollama)
    const batchSize = 3; // Process 3 images at a time
    const results: ImageAnalysisResult[] = [];

    for (let i = 0; i < imageItems.length; i += batchSize) {
      const batch = imageItems.slice(i, i + batchSize);
      const batchPromises = batch.map((item) => {
        const imageUrl = item.url || item.preview_image_url || '';
        return this.analyzeImage(imageUrl, item.alt_text);
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Download image from URL and encode as base64
   */
  private async downloadAndEncodeImage(imageUrl: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 15000, // 15 second timeout for image download
      });

      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      return base64;
    } catch (error) {
      console.error(`Failed to download image from ${imageUrl}:`, error);
      throw new Error('Image download failed');
    }
  }

  /**
   * Validate sentiment value
   */
  private validateSentiment(
    sentiment: string | undefined
  ): 'positive' | 'neutral' | 'negative' {
    if (sentiment === 'positive' || sentiment === 'neutral' || sentiment === 'negative') {
      return sentiment;
    }
    return 'neutral'; // Default to neutral if invalid
  }

  /**
   * Validate severity value
   */
  private validateSeverity(
    severity: string | undefined
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (
      severity === 'low' ||
      severity === 'medium' ||
      severity === 'high' ||
      severity === 'critical'
    ) {
      return severity;
    }
    return 'low'; // Default to low if invalid
  }

  /**
   * Clamp confidence score between 0 and 1
   */
  private clampConfidence(score: number | undefined): number {
    if (typeof score !== 'number' || isNaN(score)) {
      return 0.5; // Default confidence
    }
    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Get default analysis for errors
   */
  private getDefaultAnalysis(description: string): ImageAnalysisResult {
    return {
      scene_description: description,
      ocr_text: null,
      sentiment: 'neutral',
      inappropriate_content: {
        detected: false,
        categories: [],
        severity: 'low',
      },
      confidence_score: 0.0,
    };
  }

  /**
   * Aggregate multiple image analyses into summary
   */
  aggregateAnalyses(analyses: ImageAnalysisResult[]): {
    total_images: number;
    has_inappropriate_content: boolean;
    max_severity: string;
    combined_description: string;
    all_ocr_text: string[];
    overall_sentiment: string;
  } {
    if (analyses.length === 0) {
      return {
        total_images: 0,
        has_inappropriate_content: false,
        max_severity: 'low',
        combined_description: '',
        all_ocr_text: [],
        overall_sentiment: 'neutral',
      };
    }

    // Find maximum severity
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let hasInappropriate = false;

    for (const analysis of analyses) {
      if (analysis.inappropriate_content.detected) {
        hasInappropriate = true;
        const currentSeverity = analysis.inappropriate_content.severity;
        if (severityLevels[currentSeverity] > severityLevels[maxSeverity]) {
          maxSeverity = currentSeverity;
        }
      }
    }

    // Combine descriptions
    const descriptions = analyses
      .map((a, i) => `Image ${i + 1}: ${a.scene_description}`)
      .join(' | ');

    // Collect all OCR text
    const ocrTexts = analyses
      .map((a) => a.ocr_text)
      .filter((text): text is string => text !== null && text.trim().length > 0);

    // Determine overall sentiment (prioritize negative, then positive, then neutral)
    let overallSentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    const sentiments = analyses.map((a) => a.sentiment);
    if (sentiments.includes('negative')) {
      overallSentiment = 'negative';
    } else if (sentiments.includes('positive')) {
      overallSentiment = 'positive';
    }

    return {
      total_images: analyses.length,
      has_inappropriate_content: hasInappropriate,
      max_severity: maxSeverity,
      combined_description: descriptions,
      all_ocr_text: ocrTexts,
      overall_sentiment: overallSentiment,
    };
  }
}

// Export singleton instance
export const imageAnalysisService = new ImageAnalysisService();
