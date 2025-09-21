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
    source_type TEXT CHECK (source_type IN ('NEWS_WEBSITE', 'SOCIAL_MEDIA', 'FORUM', 'BLOG', 'REVIEW')) NOT NULL,

    -- Optional metadata
    author TEXT,
    published_at TIMESTAMP WITH TIME ZONE,

    -- Sentiment analysis
    sentiment TEXT CHECK (sentiment IN ('POSITIVE', 'NEGATIVE', 'NEUTRAL')),
    sentiment_score DECIMAL(3, 2),
    keywords TEXT[],

    -- Person/Company info
    person_name TEXT NOT NULL,
    company TEXT,
    job_title TEXT,

    -- Tracking
    scraped_by TEXT NOT NULL DEFAULT 'n8n',
    raw_data JSONB,
    status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW', 'REVIEWED', 'ACTIONED'))
);

-- Create scraping jobs table
CREATE TABLE IF NOT EXISTS scraping_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Job details
    person_name TEXT NOT NULL,
    company TEXT,
    job_title TEXT,
    search_queries TEXT[] NOT NULL,

    -- Status tracking
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    mentions_found INTEGER DEFAULT 0,
    error_message TEXT,

    -- n8n integration
    n8n_workflow_id TEXT
);

-- Create monitoring sources table
CREATE TABLE IF NOT EXISTS monitoring_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Source details
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT CHECK (type IN ('NEWS_WEBSITE', 'SOCIAL_MEDIA', 'FORUM', 'BLOG', 'REVIEW')) NOT NULL,

    -- Configuration
    is_active BOOLEAN DEFAULT true,
    scrape_frequency TEXT DEFAULT 'DAILY' CHECK (scrape_frequency IN ('HOURLY', 'DAILY', 'WEEKLY')),
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    config JSONB
);

-- Create indexes for better performance
CREATE INDEX idx_mentions_person_name ON mentions(person_name);
CREATE INDEX idx_mentions_company ON mentions(company);
CREATE INDEX idx_mentions_sentiment ON mentions(sentiment);
CREATE INDEX idx_mentions_created_at ON mentions(created_at DESC);
CREATE INDEX idx_mentions_status ON mentions(status);
CREATE INDEX idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX idx_monitoring_sources_active ON monitoring_sources(is_active);

-- Insert default monitoring sources for Andrew Chatterley (CEO of Musso)
INSERT INTO monitoring_sources (name, url, type, is_active, config) VALUES
    ('Google News - Andrew Chatterley', 'https://news.google.com/search?q="Andrew+Chatterley"+Musso', 'NEWS_WEBSITE', true, '{"search_terms": ["Andrew Chatterley", "Musso CEO", "Chatterley Musso"]}'),
    ('LinkedIn - Andrew Chatterley', 'https://www.linkedin.com/search/results/content/?keywords=Andrew%20Chatterley%20Musso', 'SOCIAL_MEDIA', true, '{"profile_url": "https://linkedin.com/in/andrewchatterley"}'),
    ('Twitter/X - Andrew Chatterley', 'https://twitter.com/search?q=Andrew%20Chatterley%20OR%20Musso%20CEO', 'SOCIAL_MEDIA', true, '{"handles": ["@andrewchatterley", "@musso"]}'),
    ('TechCrunch - Musso', 'https://techcrunch.com/search/Musso', 'NEWS_WEBSITE', true, '{"company_focus": true}'),
    ('Hacker News - Musso', 'https://hn.algolia.com/?q=Musso', 'FORUM', true, '{"min_score": 10}'),
    ('Reddit - Tech Leaders', 'https://www.reddit.com/search/?q=Andrew%20Chatterley%20OR%20Musso', 'FORUM', true, '{"subreddits": ["r/technology", "r/startups", "r/entrepreneur"]}'),
    ('Forbes - CEO Profiles', 'https://www.forbes.com/search/?q=Andrew%20Chatterley', 'NEWS_WEBSITE', true, '{"section": "leadership"}'),
    ('Bloomberg - Musso', 'https://www.bloomberg.com/search?query=Musso', 'NEWS_WEBSITE', true, '{"type": "company_news"}'),
    ('Product Hunt - Musso', 'https://www.producthunt.com/search?q=Musso', 'REVIEW', true, '{"product_launches": true}'),
    ('Crunchbase - Musso', 'https://www.crunchbase.com/organization/musso', 'NEWS_WEBSITE', true, '{"track_funding": true}');

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for mentions table
CREATE TRIGGER update_mentions_updated_at BEFORE UPDATE ON mentions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies (if using Supabase Auth)
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_sources ENABLE ROW LEVEL SECURITY;

-- Allow public read access for now (adjust based on your auth setup)
CREATE POLICY "Allow public read access" ON mentions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON mentions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON mentions FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON scraping_jobs FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON scraping_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON scraping_jobs FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON monitoring_sources FOR SELECT USING (true);
CREATE POLICY "Allow public manage" ON monitoring_sources FOR ALL USING (true);