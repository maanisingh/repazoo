import { pool } from '../config/database.js';

export interface HelpCategory {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  article_count?: number;
  total_views?: number;
}

export interface HelpArticle {
  id: number;
  category_id: number;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  author_id: string | null;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  display_order: number;
  is_published: boolean;
  featured: boolean;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  category_name?: string;
  category_slug?: string;
}

export interface HelpArticleView {
  article_id: number;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  referer?: string;
  session_id?: string;
  time_spent_seconds?: number;
}

export interface HelpSearchQuery {
  query: string;
  user_id?: string;
  results_count?: number;
  clicked_article_id?: number;
  clicked_position?: number;
  no_results?: boolean;
  session_id?: string;
}

export interface HelpArticleFeedback {
  article_id: number;
  user_id?: string;
  is_helpful: boolean;
  feedback_text?: string;
  session_id?: string;
}

export class HelpService {
  // ===== CATEGORIES =====

  async getAllCategories(): Promise<HelpCategory[]> {
    const result = await pool.query(
      `SELECT * FROM help_categories_with_counts WHERE is_active = true ORDER BY display_order`
    );
    return result.rows;
  }

  async getCategoryBySlug(slug: string): Promise<HelpCategory | null> {
    const result = await pool.query(
      `SELECT * FROM help_categories WHERE slug = $1 AND is_active = true`,
      [slug]
    );
    return result.rows[0] || null;
  }

  // ===== ARTICLES =====

  async getAllArticles(categoryId?: number, featured?: boolean): Promise<HelpArticle[]> {
    let query = `
      SELECT
        a.*,
        c.name as category_name,
        c.slug as category_slug
      FROM help_articles a
      JOIN help_categories c ON a.category_id = c.id
      WHERE a.is_published = true
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (categoryId !== undefined) {
      query += ` AND a.category_id = $${paramIndex}`;
      params.push(categoryId);
      paramIndex++;
    }

    if (featured !== undefined) {
      query += ` AND a.featured = $${paramIndex}`;
      params.push(featured);
      paramIndex++;
    }

    query += ` ORDER BY a.display_order ASC, a.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getArticleBySlug(slug: string): Promise<HelpArticle | null> {
    const result = await pool.query(
      `SELECT
        a.*,
        c.name as category_name,
        c.slug as category_slug
      FROM help_articles a
      JOIN help_categories c ON a.category_id = c.id
      WHERE a.slug = $1 AND a.is_published = true`,
      [slug]
    );
    return result.rows[0] || null;
  }

  async getArticleById(id: number): Promise<HelpArticle | null> {
    const result = await pool.query(
      `SELECT
        a.*,
        c.name as category_name,
        c.slug as category_slug
      FROM help_articles a
      JOIN help_categories c ON a.category_id = c.id
      WHERE a.id = $1 AND a.is_published = true`,
      [id]
    );
    return result.rows[0] || null;
  }

  async getFeaturedArticles(limit: number = 5): Promise<HelpArticle[]> {
    const result = await pool.query(
      `SELECT
        a.*,
        c.name as category_name,
        c.slug as category_slug
      FROM help_articles a
      JOIN help_categories c ON a.category_id = c.id
      WHERE a.is_published = true AND a.featured = true
      ORDER BY a.view_count DESC, a.helpful_count DESC
      LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async getPopularArticles(limit: number = 10): Promise<HelpArticle[]> {
    const result = await pool.query(
      `SELECT * FROM help_articles_popular LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async getRelatedArticles(articleId: number, categoryId: number, limit: number = 5): Promise<HelpArticle[]> {
    const result = await pool.query(
      `SELECT
        a.*,
        c.name as category_name,
        c.slug as category_slug
      FROM help_articles a
      JOIN help_categories c ON a.category_id = c.id
      WHERE a.is_published = true
        AND a.category_id = $1
        AND a.id != $2
      ORDER BY a.view_count DESC
      LIMIT $3`,
      [categoryId, articleId, limit]
    );
    return result.rows;
  }

  async createArticle(article: Partial<HelpArticle>): Promise<HelpArticle> {
    const result = await pool.query(
      `INSERT INTO help_articles
        (category_id, slug, title, description, content, author_id, tags, display_order, is_published, featured)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        article.category_id,
        article.slug,
        article.title,
        article.description || null,
        article.content,
        article.author_id || null,
        article.tags || [],
        article.display_order || 0,
        article.is_published !== undefined ? article.is_published : true,
        article.featured || false,
      ]
    );
    return result.rows[0];
  }

  async updateArticle(id: number, article: Partial<HelpArticle>): Promise<HelpArticle | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (article.category_id !== undefined) {
      fields.push(`category_id = $${paramIndex}`);
      values.push(article.category_id);
      paramIndex++;
    }
    if (article.title !== undefined) {
      fields.push(`title = $${paramIndex}`);
      values.push(article.title);
      paramIndex++;
    }
    if (article.description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      values.push(article.description);
      paramIndex++;
    }
    if (article.content !== undefined) {
      fields.push(`content = $${paramIndex}`);
      values.push(article.content);
      paramIndex++;
    }
    if (article.tags !== undefined) {
      fields.push(`tags = $${paramIndex}`);
      values.push(article.tags);
      paramIndex++;
    }
    if (article.is_published !== undefined) {
      fields.push(`is_published = $${paramIndex}`);
      values.push(article.is_published);
      paramIndex++;
    }
    if (article.featured !== undefined) {
      fields.push(`featured = $${paramIndex}`);
      values.push(article.featured);
      paramIndex++;
    }

    if (fields.length === 0) {
      return null;
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE help_articles SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  // ===== SEARCH =====

  async searchArticles(query: string, limit: number = 20): Promise<HelpArticle[]> {
    const result = await pool.query(
      `SELECT
        a.*,
        c.name as category_name,
        c.slug as category_slug,
        ts_rank(a.search_vector, plainto_tsquery('english', $1)) as rank
      FROM help_articles a
      JOIN help_categories c ON a.category_id = c.id
      WHERE a.is_published = true
        AND a.search_vector @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC, a.view_count DESC
      LIMIT $2`,
      [query, limit]
    );
    return result.rows;
  }

  // ===== ANALYTICS =====

  async trackArticleView(view: HelpArticleView): Promise<void> {
    await pool.query(
      `INSERT INTO help_article_views
        (article_id, user_id, ip_address, user_agent, referer, session_id, time_spent_seconds)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        view.article_id,
        view.user_id || null,
        view.ip_address || null,
        view.user_agent || null,
        view.referer || null,
        view.session_id || null,
        view.time_spent_seconds || 0,
      ]
    );

    // Increment view count on article
    await pool.query(
      `UPDATE help_articles SET view_count = view_count + 1 WHERE id = $1`,
      [view.article_id]
    );
  }

  async trackSearchQuery(search: HelpSearchQuery): Promise<void> {
    await pool.query(
      `INSERT INTO help_search_queries
        (query, user_id, results_count, clicked_article_id, clicked_position, no_results, session_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        search.query,
        search.user_id || null,
        search.results_count || 0,
        search.clicked_article_id || null,
        search.clicked_position || null,
        search.no_results || false,
        search.session_id || null,
      ]
    );
  }

  async submitArticleFeedback(feedback: HelpArticleFeedback): Promise<void> {
    await pool.query(
      `INSERT INTO help_article_feedback
        (article_id, user_id, is_helpful, feedback_text, session_id)
      VALUES ($1, $2, $3, $4, $5)`,
      [
        feedback.article_id,
        feedback.user_id || null,
        feedback.is_helpful,
        feedback.feedback_text || null,
        feedback.session_id || null,
      ]
    );

    // Update article helpful/not_helpful counts
    if (feedback.is_helpful) {
      await pool.query(
        `UPDATE help_articles SET helpful_count = helpful_count + 1 WHERE id = $1`,
        [feedback.article_id]
      );
    } else {
      await pool.query(
        `UPDATE help_articles SET not_helpful_count = not_helpful_count + 1 WHERE id = $1`,
        [feedback.article_id]
      );
    }
  }

  async getPopularSearches(limit: number = 10): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM help_searches_recent LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
}

export const helpService = new HelpService();
