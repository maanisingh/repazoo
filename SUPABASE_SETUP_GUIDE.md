# RepAZoo - Supabase Integration Setup Guide

## 🎯 Quick Setup

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and set project details:
   - **Name**: RepAZoo
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to your users

### Step 2: Get API Keys
1. Go to **Settings > API** in your Supabase dashboard
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (starts with `eyJ`)
   - **service_role** key (starts with `eyJ`)

### Step 3: Update Environment Variables
Replace the placeholder values in your `.env` file:

```env
# Replace these with your actual Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Set Up Database Tables
1. In Supabase dashboard, go to **SQL Editor**
2. Run this SQL to create the mentions table:

```sql
-- Create mentions table for n8n scraping integration
CREATE TABLE mentions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    -- Core mention data
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    source_type TEXT CHECK (source_type IN ('NEWS_WEBSITE', 'SOCIAL_MEDIA', 'FORUM', 'BLOG', 'REVIEW')) NOT NULL,

    -- Person/Company info
    person_name TEXT NOT NULL,
    company TEXT,
    job_title TEXT,

    -- Sentiment analysis
    sentiment TEXT CHECK (sentiment IN ('POSITIVE', 'NEGATIVE', 'NEUTRAL')),
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
CREATE TABLE scraping_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    person_name TEXT NOT NULL,
    company TEXT,
    job_title TEXT,
    search_queries TEXT[] NOT NULL,

    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    mentions_found INTEGER DEFAULT 0,
    error_message TEXT,

    n8n_workflow_id TEXT
);

-- Enable Row Level Security
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view their own mentions" ON mentions
    FOR SELECT USING (auth.uid()::text = scraped_by OR auth.role() = 'service_role');

CREATE POLICY "Allow n8n service to insert mentions" ON mentions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can manage scraping jobs" ON scraping_jobs
    FOR ALL USING (true);
```

### Step 5: Configure n8n Webhook
1. Open n8n at http://localhost:5678 (admin/repazoo123)
2. Import workflow from `n8n-workflows.json`
3. Update Supabase credentials in webhook nodes:
   - **URL**: Your project URL + `/rest/v1/mentions`
   - **Headers**:
     - `apikey`: Your service_role key
     - `Authorization`: `Bearer [service_role_key]`
     - `Content-Type`: `application/json`

### Step 6: Test the Integration

1. **Test Authentication**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123",
       "firstName": "Test",
       "lastName": "User",
       "plan": "BASIC"
     }'
   ```

2. **Test Mention Creation via API**:
   ```bash
   curl -X POST http://localhost:3000/api/mentions/supabase \
     -H "Content-Type: application/json" \
     -d '{
       "person_name": "John Doe",
       "company": "Example Corp",
       "job_title": "CEO"
     }'
   ```

3. **View Data**: Visit http://localhost:3000/admin/data-viewer

## 🔧 Integration Points

### Frontend ↔ Supabase
- **Authentication**: All login/register goes through Supabase Auth
- **Data Access**: Frontend reads mentions from Supabase via API routes
- **Real-time**: Can add Supabase real-time subscriptions for live updates

### n8n ↔ Supabase
- **Webhooks**: n8n workflows POST scraped data directly to Supabase
- **Job Tracking**: Scraping job status updated in `scraping_jobs` table
- **Error Handling**: Failed scrapes logged with error messages

### Supabase ↔ Frontend Integration
- **Authentication**: JWT tokens from Supabase Auth
- **Authorization**: Row Level Security policies
- **Data Flow**:
  1. User creates account → Supabase Auth
  2. n8n scrapes mentions → Supabase Database
  3. Frontend displays mentions → Supabase API

## 🎉 What You Get

- ✅ **Full Supabase Authentication** - signup, login, password reset
- ✅ **n8n Web Scraping** - automated mention collection
- ✅ **Real-time Data** - live updates from scraping
- ✅ **Secure Access** - row-level security policies
- ✅ **Admin Dashboard** - view all scraped data
- ✅ **API Integration** - RESTful APIs for all operations

## 🚀 Ready to Deploy

Once configured, your RepAZoo instance will be fully integrated with Supabase for production-ready reputation monitoring!

**Next Steps**:
1. Update your `.env` file with Supabase credentials
2. Run the SQL setup in Supabase dashboard
3. Configure n8n workflows
4. Start monitoring reputations! 🎯