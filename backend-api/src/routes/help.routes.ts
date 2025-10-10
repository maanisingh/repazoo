import { Router, Request, Response } from 'express';
import { helpService } from '../services/help.service.js';

const router = Router();

// ===== CATEGORIES =====

/**
 * GET /api/help/categories
 * Get all help center categories with article counts
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await helpService.getAllCategories();
    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error('Error fetching help categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch help categories',
    });
  }
});

/**
 * GET /api/help/categories/:slug
 * Get a specific category by slug
 */
router.get('/categories/:slug', async (req: Request, res: Response) => {
  try {
    const category = await helpService.getCategoryBySlug(req.params.slug);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }
    res.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error('Error fetching help category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch help category',
    });
  }
});

// ===== ARTICLES =====

/**
 * GET /api/help/articles
 * Get all articles, optionally filtered by category or featured status
 * Query params: category_id, featured, limit
 */
router.get('/articles', async (req: Request, res: Response) => {
  try {
    const categoryId = req.query.category_id ? parseInt(req.query.category_id as string) : undefined;
    const featured = req.query.featured === 'true' ? true : undefined;

    const articles = await helpService.getAllArticles(categoryId, featured);
    res.json({
      success: true,
      articles,
      count: articles.length,
    });
  } catch (error) {
    console.error('Error fetching help articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch help articles',
    });
  }
});

/**
 * GET /api/help/articles/popular
 * Get most popular articles
 * Query params: limit (default 10)
 */
router.get('/articles/popular', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const articles = await helpService.getPopularArticles(limit);
    res.json({
      success: true,
      articles,
    });
  } catch (error) {
    console.error('Error fetching popular articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch popular articles',
    });
  }
});

/**
 * GET /api/help/articles/featured
 * Get featured articles
 * Query params: limit (default 5)
 */
router.get('/articles/featured', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
    const articles = await helpService.getFeaturedArticles(limit);
    res.json({
      success: true,
      articles,
    });
  } catch (error) {
    console.error('Error fetching featured articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured articles',
    });
  }
});

/**
 * GET /api/help/articles/:slug
 * Get a specific article by slug
 */
router.get('/articles/:slug', async (req: Request, res: Response) => {
  try {
    const article = await helpService.getArticleBySlug(req.params.slug);
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found',
      });
    }

    // Get related articles
    const relatedArticles = await helpService.getRelatedArticles(
      article.id,
      article.category_id,
      5
    );

    res.json({
      success: true,
      article,
      related_articles: relatedArticles,
    });
  } catch (error) {
    console.error('Error fetching help article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch help article',
    });
  }
});

/**
 * POST /api/help/articles
 * Create a new help article (admin only - add auth middleware if needed)
 */
router.post('/articles', async (req: Request, res: Response) => {
  try {
    const article = await helpService.createArticle(req.body);
    res.status(201).json({
      success: true,
      article,
    });
  } catch (error) {
    console.error('Error creating help article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create help article',
    });
  }
});

/**
 * PUT /api/help/articles/:id
 * Update an existing help article (admin only - add auth middleware if needed)
 */
router.put('/articles/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const article = await helpService.updateArticle(id, req.body);
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found',
      });
    }
    res.json({
      success: true,
      article,
    });
  } catch (error) {
    console.error('Error updating help article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update help article',
    });
  }
});

// ===== SEARCH =====

/**
 * GET /api/help/search
 * Search help articles by query
 * Query params: q (query string), limit (default 20)
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const articles = await helpService.searchArticles(query, limit);

    // Track search query
    const sessionId = req.headers['x-session-id'] as string || undefined;
    const userId = (req as any).user?.id || undefined;

    await helpService.trackSearchQuery({
      query,
      user_id: userId,
      results_count: articles.length,
      no_results: articles.length === 0,
      session_id: sessionId,
    });

    res.json({
      success: true,
      query,
      articles,
      count: articles.length,
    });
  } catch (error) {
    console.error('Error searching help articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search help articles',
    });
  }
});

/**
 * GET /api/help/search/popular
 * Get popular search queries
 * Query params: limit (default 10)
 */
router.get('/search/popular', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const searches = await helpService.getPopularSearches(limit);
    res.json({
      success: true,
      searches,
    });
  } catch (error) {
    console.error('Error fetching popular searches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch popular searches',
    });
  }
});

// ===== ANALYTICS =====

/**
 * POST /api/help/articles/:id/view
 * Track article view
 * Body: { user_id?, time_spent_seconds? }
 */
router.post('/articles/:id/view', async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { user_id, time_spent_seconds } = req.body;

    // Extract request metadata
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const referer = req.headers['referer'];
    const sessionId = req.headers['x-session-id'] as string || undefined;

    await helpService.trackArticleView({
      article_id: articleId,
      user_id: user_id || (req as any).user?.id,
      ip_address: ipAddress,
      user_agent: userAgent,
      referer,
      session_id: sessionId,
      time_spent_seconds: time_spent_seconds || 0,
    });

    res.json({
      success: true,
      message: 'Article view tracked',
    });
  } catch (error) {
    console.error('Error tracking article view:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track article view',
    });
  }
});

/**
 * POST /api/help/articles/:id/feedback
 * Submit feedback on article helpfulness
 * Body: { is_helpful: boolean, feedback_text?: string }
 */
router.post('/articles/:id/feedback', async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { is_helpful, feedback_text } = req.body;

    if (typeof is_helpful !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'is_helpful must be a boolean',
      });
    }

    const sessionId = req.headers['x-session-id'] as string || undefined;
    const userId = (req as any).user?.id || undefined;

    await helpService.submitArticleFeedback({
      article_id: articleId,
      user_id: userId,
      is_helpful,
      feedback_text,
      session_id: sessionId,
    });

    res.json({
      success: true,
      message: 'Feedback submitted',
    });
  } catch (error) {
    console.error('Error submitting article feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback',
    });
  }
});

export default router;
