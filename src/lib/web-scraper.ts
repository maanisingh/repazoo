import * as cheerio from 'cheerio';
import { analyzeReputationMention } from './ai-sentiment';
import { queryOne, queryMany } from './postgres';

export interface ScrapingSource {
  id: string;
  name: string;
  type: 'NEWS_WEBSITE' | 'SOCIAL_MEDIA' | 'FORUM' | 'REVIEW_SITE' | 'BLOG' | 'VIDEO_PLATFORM';
  baseUrl: string;
  searchUrlTemplate: string;
  selectors: {
    container: string;
    title: string;
    content?: string;
    author?: string;
    date?: string;
    url?: string;
    engagement?: string;
  };
  headers?: Record<string, string>;
  enabled: boolean;
}

export interface ScrapedMention {
  title: string;
  content: string;
  url: string;
  author?: string;
  date?: string;
  source: string;
  sourceType: string;
  engagement?: number;
  sentiment?: {
    score: number;
    label: string;
    confidence: number;
    reputationImpact?: number;
  };
}

export interface ScrapeResult {
  source: string;
  mentions: ScrapedMention[];
  totalFound: number;
  errors: string[];
  scrapedAt: string;
}

// Default scraping sources for comprehensive public domain coverage
export const DEFAULT_SCRAPING_SOURCES: ScrapingSource[] = [
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    type: 'NEWS_WEBSITE',
    baseUrl: 'https://techcrunch.com',
    searchUrlTemplate: 'https://search.techcrunch.com/search;_ylt=A0geK.IiJGRgWM4AQDhXNyoA;_ylc=X1MDMjc2NjY3OQRfcgMyBGZyA3NmcARncHJpZANaSlU4cTJ2TlIyeXBJWjdKT1UzN01BBG5fcnNsdAMwBG5fc3VnZwM1BG9yaWdpbgNzZWFyY2gueWFob28uY29tBHBvcwMwBHBxc3RyAwRwcXN0cmwDBHFzdHJsAzMxBHF1ZXJ5AyUyMiU3QyU3QyU3QyUyMg%3D%3D?p={QUERY}',
    selectors: {
      container: '.post-block, .river-block',
      title: 'h2 a, h3 a, .post-title a',
      content: '.excerpt, .post-excerpt, .river-summary',
      author: '.byline a, .author a',
      date: '.timestamp, .post-date, time',
      url: 'h2 a, h3 a, .post-title a'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    enabled: true
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    type: 'SOCIAL_MEDIA',
    baseUrl: 'https://www.linkedin.com',
    searchUrlTemplate: 'https://www.linkedin.com/search/results/content/?keywords={QUERY}',
    selectors: {
      container: '.feed-shared-update-v2, .update-components-actor',
      title: '.feed-shared-text .break-words, .update-components-text .break-words',
      content: '.feed-shared-text .break-words',
      author: '.update-components-actor__name, .feed-shared-actor__name',
      date: '.update-components-actor__sub-description time, .feed-shared-actor__sub-description time',
      url: '.update-components-actor__container a, .feed-shared-actor a',
      engagement: '.social-counts-reactions__count, .feed-shared-social-action-bar__comment-count'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    enabled: true
  },
  {
    id: 'reddit',
    name: 'Reddit',
    type: 'FORUM',
    baseUrl: 'https://www.reddit.com',
    searchUrlTemplate: 'https://www.reddit.com/search/?q={QUERY}&type=link&sort=new',
    selectors: {
      container: '[data-testid="post-container"], .Post',
      title: '[data-testid="post-content"] h3, .Post__title',
      content: '[data-testid="post-content"] .md, .Post__content .md',
      author: '[data-testid="post_author_link"], .Post__author-link',
      date: '[data-testid="post_timestamp"], .Post__timestamp',
      url: '[data-testid="post-content"] a[data-testid="outbound-link"], .Post__title a',
      engagement: '[data-testid="post-vote-count"], .Post__vote-count'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    enabled: true
  },
  {
    id: 'hackernews',
    name: 'Hacker News',
    type: 'FORUM',
    baseUrl: 'https://hn.algolia.com',
    searchUrlTemplate: 'https://hn.algolia.com/api/v1/search?query={QUERY}&tags=story&hitsPerPage=50',
    selectors: {
      container: '.story, .athing',
      title: '.storylink, .title a',
      content: '.comment, .c00',
      author: '.hnuser, .author',
      date: '.age, .subtext',
      url: '.storylink, .title a',
      engagement: '.score, .points'
    },
    headers: {
      'User-Agent': 'RepAZoo/1.0 Reputation Monitoring Bot'
    },
    enabled: true
  },
  {
    id: 'twitter',
    name: 'Twitter',
    type: 'SOCIAL_MEDIA',
    baseUrl: 'https://twitter.com',
    searchUrlTemplate: 'https://twitter.com/search?q={QUERY}&src=typed_query&f=live',
    selectors: {
      container: '[data-testid="tweet"], .tweet',
      title: '[data-testid="tweetText"], .tweet-text',
      content: '[data-testid="tweetText"], .tweet-text',
      author: '[data-testid="User-Names"] a, .username',
      date: '[data-testid="Time"] time, .tweet-timestamp time',
      url: '[data-testid="tweet"] a[href*="/status/"], .tweet-timestamp a',
      engagement: '[data-testid="like"] span, .tweet-stats-likes'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    enabled: true
  },
  {
    id: 'google-news',
    name: 'Google News',
    type: 'NEWS_WEBSITE',
    baseUrl: 'https://news.google.com',
    searchUrlTemplate: 'https://news.google.com/rss/search?q={QUERY}&hl=en-US&gl=US&ceid=US:en',
    selectors: {
      container: 'item, .article',
      title: 'title, .article-title',
      content: 'description, .article-summary',
      author: 'source, .article-source',
      date: 'pubDate, .article-date',
      url: 'link, .article-link',
      engagement: 'comments, .article-comments'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RepAZoo/1.0; +https://repazoo.com/bot)'
    },
    enabled: true
  }
];

export class WebScraper {
  private sources: ScrapingSource[];
  private userAgent: string;

  constructor(sources?: ScrapingSource[]) {
    this.sources = sources || DEFAULT_SCRAPING_SOURCES;
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  // Enhanced fetch with better error handling and retries
  private async fetchWithRetry(url: string, headers: Record<string, string> = {}, maxRetries = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            ...headers
          },
          redirect: 'follow'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
      } catch (error) {
        console.warn(`Fetch attempt ${attempt} failed for ${url}:`, error.message);

        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new Error('Max retries exceeded');
  }

  // Special handling for HackerNews API
  private async scrapeHackerNews(query: string): Promise<ScrapedMention[]> {
    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=20`;
      const response = await this.fetchWithRetry(url);
      const data = JSON.parse(response);

      const mentions: ScrapedMention[] = [];

      for (const hit of data.hits || []) {
        if (hit.title && hit.title.toLowerCase().includes(query.toLowerCase())) {
          mentions.push({
            title: hit.title,
            content: hit.story_text || hit.title,
            url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
            author: hit.author,
            date: hit.created_at,
            source: 'Hacker News',
            sourceType: 'FORUM',
            engagement: hit.points || 0
          });
        }
      }

      return mentions;
    } catch (error) {
      console.error('HackerNews API scraping failed:', error);
      return [];
    }
  }

  // Special handling for Google News RSS
  private async scrapeGoogleNews(query: string): Promise<ScrapedMention[]> {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      const response = await this.fetchWithRetry(url);
      const $ = cheerio.load(response, { xmlMode: true });

      const mentions: ScrapedMention[] = [];

      $('item').each((i, element) => {
        const $item = $(element);
        const title = $item.find('title').text().trim();
        const content = $item.find('description').text().trim();
        const url = $item.find('link').text().trim();
        const author = $item.find('source').text().trim();
        const date = $item.find('pubDate').text().trim();

        if (title && title.toLowerCase().includes(query.toLowerCase())) {
          mentions.push({
            title,
            content: content || title,
            url,
            author: author || 'Google News',
            date,
            source: 'Google News',
            sourceType: 'NEWS_WEBSITE',
            engagement: 0
          });
        }
      });

      return mentions;
    } catch (error) {
      console.error('Google News RSS scraping failed:', error);
      return [];
    }
  }

  // Generic HTML scraper
  private async scrapeGenericSource(source: ScrapingSource, query: string): Promise<ScrapedMention[]> {
    try {
      // Handle different URL templates
      let searchUrl = source.searchUrlTemplate.replace('{QUERY}', encodeURIComponent(query));

      // Special case for search engines that need different encoding
      if (source.id === 'techcrunch') {
        searchUrl = `https://techcrunch.com/page/1/?s=${encodeURIComponent(query)}`;
      }

      const html = await this.fetchWithRetry(searchUrl, source.headers || {});
      const $ = cheerio.load(html);

      const mentions: ScrapedMention[] = [];

      $(source.selectors.container).each((i, element) => {
        try {
          const $container = $(element);

          // Extract data using selectors
          const title = $container.find(source.selectors.title).first().text().trim() ||
                       $container.find(source.selectors.title).first().attr('title') || '';

          const content = $container.find(source.selectors.content || source.selectors.title).first().text().trim();

          let url = $container.find(source.selectors.url || source.selectors.title).first().attr('href') || '';

          // Handle relative URLs
          if (url && !url.startsWith('http')) {
            url = new URL(url, source.baseUrl).toString();
          }

          const author = source.selectors.author ?
            $container.find(source.selectors.author).first().text().trim() : '';

          const date = source.selectors.date ?
            $container.find(source.selectors.date).first().text().trim() ||
            $container.find(source.selectors.date).first().attr('datetime') || '' : '';

          const engagementText = source.selectors.engagement ?
            $container.find(source.selectors.engagement).first().text().trim() : '';

          const engagement = engagementText ? parseInt(engagementText.replace(/\D/g, '')) || 0 : 0;

          // Only include if title contains query and has meaningful content
          if (title && title.toLowerCase().includes(query.toLowerCase()) && url) {
            mentions.push({
              title,
              content: content || title,
              url,
              author: author || source.name,
              date,
              source: source.name,
              sourceType: source.type,
              engagement
            });
          }
        } catch (itemError) {
          console.warn(`Error processing item in ${source.name}:`, itemError);
        }
      });

      return mentions;
    } catch (error) {
      console.error(`Error scraping ${source.name}:`, error);
      return [];
    }
  }

  // Main scraping method
  public async scrapeQuery(query: string, sourceIds?: string[]): Promise<ScrapeResult[]> {
    const sourcesToScrape = sourceIds ?
      this.sources.filter(s => sourceIds.includes(s.id) && s.enabled) :
      this.sources.filter(s => s.enabled);

    const results: ScrapeResult[] = [];

    console.log(`Starting scrape for query: "${query}" across ${sourcesToScrape.length} sources`);

    // Scrape all sources in parallel with limited concurrency
    const scrapePromises = sourcesToScrape.map(async (source) => {
      const startTime = Date.now();
      const errors: string[] = [];
      let mentions: ScrapedMention[] = [];

      try {
        console.log(`Scraping ${source.name} for "${query}"`);

        // Special handling for API-based sources
        if (source.id === 'hackernews') {
          mentions = await this.scrapeHackerNews(query);
        } else if (source.id === 'google-news') {
          mentions = await this.scrapeGoogleNews(query);
        } else {
          mentions = await this.scrapeGenericSource(source, query);
        }

        // Add sentiment analysis to mentions
        for (const mention of mentions) {
          try {
            const sentiment = await analyzeReputationMention(
              `${mention.title} ${mention.content}`,
              query
            );

            mention.sentiment = {
              score: sentiment.score,
              label: sentiment.sentiment,
              confidence: sentiment.confidence,
              reputationImpact: sentiment.reputationImpact
            };
          } catch (sentimentError) {
            console.warn(`Sentiment analysis failed for mention from ${source.name}:`, sentimentError);
            mention.sentiment = {
              score: 0,
              label: 'NEUTRAL',
              confidence: 0.5
            };
          }
        }

        const duration = Date.now() - startTime;
        console.log(`✓ ${source.name}: Found ${mentions.length} mentions in ${duration}ms`);

      } catch (error) {
        const errorMsg = `Failed to scrape ${source.name}: ${error.message}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }

      return {
        source: source.name,
        mentions,
        totalFound: mentions.length,
        errors,
        scrapedAt: new Date().toISOString()
      };
    });

    // Execute scrapes with timeout
    const timeoutPromise = new Promise<ScrapeResult[]>((_, reject) => {
      setTimeout(() => reject(new Error('Scraping timeout')), 60000); // 60 second timeout
    });

    try {
      const scrapeResults = await Promise.race([
        Promise.all(scrapePromises),
        timeoutPromise
      ]);

      results.push(...scrapeResults);
    } catch (error) {
      console.error('Scraping failed or timed out:', error);
    }

    const totalMentions = results.reduce((sum, result) => sum + result.totalFound, 0);
    console.log(`Scraping completed: ${totalMentions} total mentions found across ${results.length} sources`);

    return results;
  }

  // Get available sources
  public getSources(): ScrapingSource[] {
    return this.sources;
  }

  // Update source configuration
  public updateSource(sourceId: string, updates: Partial<ScrapingSource>): boolean {
    const sourceIndex = this.sources.findIndex(s => s.id === sourceId);
    if (sourceIndex === -1) return false;

    this.sources[sourceIndex] = { ...this.sources[sourceIndex], ...updates };
    return true;
  }

  // Add custom source
  public addSource(source: ScrapingSource): void {
    this.sources.push(source);
  }
}

// Factory function for creating scraper instance
export function createWebScraper(sources?: ScrapingSource[]): WebScraper {
  return new WebScraper(sources);
}

// Utility function for validating URLs
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Utility function for cleaning text content
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\r\n\t]/g, ' ')
    .trim()
    .substring(0, 1000); // Limit content length
}