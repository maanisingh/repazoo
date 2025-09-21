-- Initialize RepAZoo database schema for self-hosted Supabase

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE sentiment_type AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE source_type AS ENUM ('NEWS_WEBSITE', 'SOCIAL_MEDIA', 'FORUM', 'BLOG', 'REVIEW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create mentions table for storing scraped data
CREATE TABLE IF NOT EXISTS mentions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Core mention data
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    source_type source_type NOT NULL,

    -- Person/Company info
    person_name TEXT NOT NULL,
    company TEXT,
    job_title TEXT,

    -- Sentiment analysis
    sentiment sentiment_type,
    sentiment_score DECIMAL(3, 2),
    keywords TEXT[],

    -- Optional metadata
    author TEXT,
    published_at TIMESTAMP WITH TIME ZONE,

    -- Tracking
    scraped_by TEXT NOT NULL DEFAULT 'n8n',
    raw_data JSONB,
    status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW', 'REVIEWED', 'ACTIONED'))
);

-- Create scraping jobs table
CREATE TABLE IF NOT EXISTS scraping_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    person_name TEXT NOT NULL,
    company TEXT,
    job_title TEXT,
    search_queries TEXT[] NOT NULL,

    status job_status DEFAULT 'PENDING',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    mentions_found INTEGER DEFAULT 0,
    error_message TEXT,

    n8n_workflow_id TEXT
);

-- Create monitoring sources table
CREATE TABLE IF NOT EXISTS monitoring_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type source_type NOT NULL,

    is_active BOOLEAN DEFAULT true,
    scrape_frequency TEXT DEFAULT 'DAILY' CHECK (scrape_frequency IN ('HOURLY', 'DAILY', 'WEEKLY')),
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    config JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mentions_person_name ON mentions(person_name);
CREATE INDEX IF NOT EXISTS idx_mentions_company ON mentions(company);
CREATE INDEX IF NOT EXISTS idx_mentions_sentiment ON mentions(sentiment);
CREATE INDEX IF NOT EXISTS idx_mentions_created_at ON mentions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentions_status ON mentions(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_sources_active ON monitoring_sources(is_active);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for mentions table
DROP TRIGGER IF EXISTS update_mentions_updated_at ON mentions;
CREATE TRIGGER update_mentions_updated_at BEFORE UPDATE ON mentions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_sources ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your auth requirements)
CREATE POLICY "Allow public read access" ON mentions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON mentions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON mentions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON mentions FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON scraping_jobs FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON scraping_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON scraping_jobs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON scraping_jobs FOR DELETE USING (true);

CREATE POLICY "Allow public access" ON monitoring_sources FOR ALL USING (true);

-- Insert default monitoring sources
INSERT INTO monitoring_sources (name, url, type, is_active, config) VALUES
    ('Google News', 'https://news.google.com/search', 'NEWS_WEBSITE', true, '{"search_terms": ["person_name", "company"]}'),
    ('Hacker News', 'https://hn.algolia.com/api/v1/search', 'FORUM', true, '{"min_score": 10}'),
    ('Reddit', 'https://www.reddit.com/search.json', 'FORUM', true, '{"subreddits": ["technology", "startups", "entrepreneur"]}'),
    ('LinkedIn', 'https://www.linkedin.com/search/results/content/', 'SOCIAL_MEDIA', true, '{"profile_search": true}'),
    ('Twitter/X', 'https://twitter.com/search', 'SOCIAL_MEDIA', true, '{"handles": ["@company"]}')
ON CONFLICT DO NOTHING;