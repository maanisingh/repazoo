-- Help Center Database Schema Migration
-- Created: 2025-10-10
-- Purpose: Create tables for comprehensive in-dashboard help center

-- =====================================================
-- HELP CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS help_categories (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- Lucide icon name
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_help_categories_slug ON help_categories(slug);
CREATE INDEX idx_help_categories_active ON help_categories(is_active);
CREATE INDEX idx_help_categories_order ON help_categories(display_order);

-- =====================================================
-- HELP ARTICLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS help_articles (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES help_categories(id) ON DELETE CASCADE,
  slug VARCHAR(200) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  content TEXT NOT NULL, -- Markdown content
  author_id VARCHAR(255), -- User ID who created/last edited
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false, -- Show in featured/popular section
  tags TEXT[], -- Array of tags for search
  search_vector tsvector, -- Full-text search index
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_help_articles_category ON help_articles(category_id);
CREATE INDEX idx_help_articles_slug ON help_articles(slug);
CREATE INDEX idx_help_articles_published ON help_articles(is_published);
CREATE INDEX idx_help_articles_featured ON help_articles(featured);
CREATE INDEX idx_help_articles_views ON help_articles(view_count DESC);
CREATE INDEX idx_help_articles_search ON help_articles USING gin(search_vector);
CREATE INDEX idx_help_articles_tags ON help_articles USING gin(tags);

-- =====================================================
-- HELP ARTICLE VIEWS TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS help_article_views (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES help_articles(id) ON DELETE CASCADE,
  user_id VARCHAR(255), -- Optional: track which user viewed
  ip_address INET, -- Track unique IP views
  user_agent TEXT,
  referer TEXT, -- Where they came from
  session_id VARCHAR(255),
  time_spent_seconds INTEGER, -- How long they read
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_help_views_article ON help_article_views(article_id);
CREATE INDEX idx_help_views_user ON help_article_views(user_id);
CREATE INDEX idx_help_views_date ON help_article_views(viewed_at);
CREATE INDEX idx_help_views_session ON help_article_views(session_id);

-- =====================================================
-- HELP SEARCH QUERIES TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS help_search_queries (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  user_id VARCHAR(255), -- Optional: track user
  results_count INTEGER, -- How many results returned
  clicked_article_id INTEGER REFERENCES help_articles(id) ON DELETE SET NULL,
  clicked_position INTEGER, -- Which result position was clicked
  no_results BOOLEAN DEFAULT false,
  session_id VARCHAR(255),
  searched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_help_searches_query ON help_search_queries(query);
CREATE INDEX idx_help_searches_user ON help_search_queries(user_id);
CREATE INDEX idx_help_searches_date ON help_search_queries(searched_at);
CREATE INDEX idx_help_searches_no_results ON help_search_queries(no_results);
CREATE INDEX idx_help_searches_article ON help_search_queries(clicked_article_id);

-- =====================================================
-- HELP ARTICLE FEEDBACK
-- =====================================================
CREATE TABLE IF NOT EXISTS help_article_feedback (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES help_articles(id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  is_helpful BOOLEAN NOT NULL, -- true = helpful, false = not helpful
  feedback_text TEXT, -- Optional: why it wasn't helpful
  session_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_help_feedback_article ON help_article_feedback(article_id);
CREATE INDEX idx_help_feedback_user ON help_article_feedback(user_id);
CREATE INDEX idx_help_feedback_helpful ON help_article_feedback(is_helpful);

-- =====================================================
-- TRIGGERS FOR UPDATING search_vector
-- =====================================================

-- Function to update search vector
CREATE OR REPLACE FUNCTION help_articles_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT and UPDATE
DROP TRIGGER IF EXISTS help_articles_search_vector_trigger ON help_articles;
CREATE TRIGGER help_articles_search_vector_trigger
  BEFORE INSERT OR UPDATE ON help_articles
  FOR EACH ROW EXECUTE FUNCTION help_articles_search_vector_update();

-- =====================================================
-- TRIGGERS FOR UPDATING updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_help_categories_updated_at ON help_categories;
CREATE TRIGGER update_help_categories_updated_at
  BEFORE UPDATE ON help_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_help_articles_updated_at ON help_articles;
CREATE TRIGGER update_help_articles_updated_at
  BEFORE UPDATE ON help_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL SEED DATA - Categories
-- =====================================================

INSERT INTO help_categories (slug, name, description, icon, display_order) VALUES
('getting-started', 'Getting Started', 'Learn the basics and get up and running quickly', 'Rocket', 1),
('twitter-integration', 'Twitter Integration', 'Connect and manage your Twitter account', 'Twitter', 2),
('reputation-scans', 'Reputation Scans', 'Understanding scans, results, and risk analysis', 'ScanSearch', 3),
('dashboard-features', 'Dashboard & Features', 'Navigate and use the dashboard effectively', 'LayoutDashboard', 4),
('admin-features', 'Admin Features', 'Administrative tools and user management', 'ShieldCheck', 5),
('api-integrations', 'API & Integrations', 'API documentation and integration guides', 'Code2', 6),
('troubleshooting', 'Troubleshooting', 'Common issues and how to resolve them', 'AlertCircle', 7)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- ANALYTICS VIEWS
-- =====================================================

-- Most popular articles view
CREATE OR REPLACE VIEW help_articles_popular AS
SELECT
  a.id,
  a.title,
  a.slug,
  c.name as category_name,
  a.view_count,
  a.helpful_count,
  a.not_helpful_count,
  CASE
    WHEN (a.helpful_count + a.not_helpful_count) > 0
    THEN ROUND((a.helpful_count::float / (a.helpful_count + a.not_helpful_count)::float) * 100, 2)
    ELSE 0
  END as helpfulness_percentage
FROM help_articles a
JOIN help_categories c ON a.category_id = c.id
WHERE a.is_published = true
ORDER BY a.view_count DESC, a.helpful_count DESC;

-- Recent searches view
CREATE OR REPLACE VIEW help_searches_recent AS
SELECT
  query,
  COUNT(*) as search_count,
  COUNT(CASE WHEN no_results = true THEN 1 END) as no_results_count,
  MAX(searched_at) as last_searched_at
FROM help_search_queries
WHERE searched_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY query
ORDER BY search_count DESC, last_searched_at DESC;

-- Category article counts
CREATE OR REPLACE VIEW help_categories_with_counts AS
SELECT
  c.*,
  COUNT(a.id) as article_count,
  COALESCE(SUM(a.view_count), 0) as total_views
FROM help_categories c
LEFT JOIN help_articles a ON c.id = a.category_id AND a.is_published = true
WHERE c.is_active = true
GROUP BY c.id
ORDER BY c.display_order;

-- =====================================================
-- GRANTS (if needed for specific users)
-- =====================================================

-- Grant permissions to postgres user (already owner)
-- If you have a specific app user, grant permissions here
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Output confirmation
DO $$
BEGIN
  RAISE NOTICE 'Help Center schema migration completed successfully!';
  RAISE NOTICE 'Tables created: help_categories, help_articles, help_article_views, help_search_queries, help_article_feedback';
  RAISE NOTICE 'Views created: help_articles_popular, help_searches_recent, help_categories_with_counts';
END $$;
