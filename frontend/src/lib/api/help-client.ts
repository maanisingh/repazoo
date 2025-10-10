import axios from 'axios';
import type { HelpArticle, HelpCategory } from '@/stores/help-center-store';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://cfy.repazoo.com/api';

const helpClient = axios.create({
  baseURL: `${API_BASE_URL}/help`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add session ID to all requests
helpClient.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('help-session-id');
  if (sessionId) {
    config.headers['x-session-id'] = sessionId;
  }
  return config;
});

export interface GetCategoriesResponse {
  success: boolean;
  categories: HelpCategory[];
}

export interface GetArticlesResponse {
  success: boolean;
  articles: HelpArticle[];
  count: number;
}

export interface GetArticleResponse {
  success: boolean;
  article: HelpArticle;
  related_articles: HelpArticle[];
}

export interface SearchArticlesResponse {
  success: boolean;
  query: string;
  articles: HelpArticle[];
  count: number;
}

export interface PopularArticlesResponse {
  success: boolean;
  articles: HelpArticle[];
}

export interface FeaturedArticlesResponse {
  success: boolean;
  articles: HelpArticle[];
}

export interface PopularSearchesResponse {
  success: boolean;
  searches: Array<{
    query: string;
    search_count: string;
    no_results_count: string;
    last_searched_at: string;
  }>;
}

export class HelpCenterAPI {
  // ===== CATEGORIES =====

  async getAllCategories(): Promise<HelpCategory[]> {
    const response = await helpClient.get<GetCategoriesResponse>('/categories');
    return response.data.categories;
  }

  async getCategoryBySlug(slug: string): Promise<HelpCategory> {
    const response = await helpClient.get<{ success: boolean; category: HelpCategory }>(
      `/categories/${slug}`
    );
    return response.data.category;
  }

  // ===== ARTICLES =====

  async getAllArticles(categoryId?: number, featured?: boolean): Promise<HelpArticle[]> {
    const params: Record<string, string> = {};
    if (categoryId !== undefined) params.category_id = String(categoryId);
    if (featured !== undefined) params.featured = String(featured);

    const response = await helpClient.get<GetArticlesResponse>('/articles', { params });
    return response.data.articles;
  }

  async getArticleBySlug(slug: string): Promise<{
    article: HelpArticle;
    relatedArticles: HelpArticle[];
  }> {
    const response = await helpClient.get<GetArticleResponse>(`/articles/${slug}`);
    return {
      article: response.data.article,
      relatedArticles: response.data.related_articles,
    };
  }

  async getPopularArticles(limit: number = 10): Promise<HelpArticle[]> {
    const response = await helpClient.get<PopularArticlesResponse>('/articles/popular', {
      params: { limit },
    });
    return response.data.articles;
  }

  async getFeaturedArticles(limit: number = 5): Promise<HelpArticle[]> {
    const response = await helpClient.get<FeaturedArticlesResponse>('/articles/featured', {
      params: { limit },
    });
    return response.data.articles;
  }

  // ===== SEARCH =====

  async searchArticles(query: string, limit: number = 20): Promise<HelpArticle[]> {
    const response = await helpClient.get<SearchArticlesResponse>('/search', {
      params: { q: query, limit },
    });
    return response.data.articles;
  }

  async getPopularSearches(limit: number = 10): Promise<
    Array<{
      query: string;
      search_count: string;
      no_results_count: string;
      last_searched_at: string;
    }>
  > {
    const response = await helpClient.get<PopularSearchesResponse>('/search/popular', {
      params: { limit },
    });
    return response.data.searches;
  }

  // ===== ANALYTICS =====

  async trackArticleView(articleId: number, timeSpentSeconds?: number): Promise<void> {
    await helpClient.post(`/articles/${articleId}/view`, {
      time_spent_seconds: timeSpentSeconds || 0,
    });
  }

  async submitArticleFeedback(
    articleId: number,
    isHelpful: boolean,
    feedbackText?: string
  ): Promise<void> {
    await helpClient.post(`/articles/${articleId}/feedback`, {
      is_helpful: isHelpful,
      feedback_text: feedbackText,
    });
  }

  // ===== ADMIN (for creating/updating articles) =====

  async createArticle(article: Partial<HelpArticle>): Promise<HelpArticle> {
    const response = await helpClient.post<{ success: boolean; article: HelpArticle }>(
      '/articles',
      article
    );
    return response.data.article;
  }

  async updateArticle(id: number, article: Partial<HelpArticle>): Promise<HelpArticle> {
    const response = await helpClient.put<{ success: boolean; article: HelpArticle }>(
      `/articles/${id}`,
      article
    );
    return response.data.article;
  }
}

export const helpCenterAPI = new HelpCenterAPI();
