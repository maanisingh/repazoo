# RepAZoo - n8n + Supabase Web Scraping Configuration

## ✅ Implementation Complete - Andrew Chatterley (CEO of Musso) Tracking

### Current Status
- **n8n**: Running at http://localhost:5678 (admin/repazoo123)
- **Supabase**: Database schema ready for deployment
- **Backend Viewer**: Available at http://localhost:3000/admin/data-viewer
- **Target Person**: Andrew Chatterley - CEO of Musso

### What Was Implemented

#### 1. Supabase Database Structure
- **mentions** table: Stores scraped mentions with sentiment analysis
- **scraping_jobs** table: Tracks scraping job status
- **monitoring_sources** table: 10 pre-configured sources for Andrew Chatterley

#### 2. n8n Workflow System
- Webhook-triggered scraping workflow
- Multi-source data collection (Google News, LinkedIn, HackerNews)
- Automated sentiment analysis
- Direct Supabase integration

#### 3. Backend Data Viewer
- Real-time monitoring dashboard at `/admin/data-viewer`
- View mentions, scraping jobs, and monitoring sources
- Trigger scraping directly from UI
- Sentiment and status indicators

#### 4. Monitoring Sources for Andrew Chatterley
Pre-configured sources tracking "Andrew Chatterley" as CEO of Musso:
1. Google News - Andrew Chatterley
2. LinkedIn - Andrew Chatterley
3. Twitter/X - Andrew Chatterley OR Musso CEO
4. TechCrunch - Musso
5. Hacker News - Musso
6. Reddit - Tech Leaders
7. Forbes - CEO Profiles
8. Bloomberg - Musso
9. Product Hunt - Musso
10. Crunchbase - Musso

### Setup Instructions

#### 1. Create Supabase Project
1. Go to https://supabase.com
2. Create new project
3. Copy project URL and anon key
4. Run SQL from `supabase-schema.sql` in SQL editor

#### 2. Configure Environment Variables
Add to `.env` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here
N8N_WEBHOOK_URL=http://localhost:5678/webhook
```

#### 3. Start n8n
```bash
# n8n is already running in Docker
# Access at: http://localhost:5678
# Login: admin / repazoo123
```

#### 4. Import n8n Workflow
1. Open n8n dashboard
2. Import workflow from `n8n-workflows.json`
3. Configure Supabase credentials in workflow nodes

#### 5. Access Data Viewer
Navigate to: http://localhost:3000/admin/data-viewer

### API Endpoints

#### Trigger Scraping
```bash
POST /api/mentions/supabase
{
  "person_name": "Andrew Chatterley",
  "company": "Musso",
  "job_title": "CEO"
}
```

#### Get Mentions
```bash
GET /api/mentions/supabase?person=Andrew%20Chatterley
```

### Search Queries Configured
The system searches for:
- "Andrew Chatterley" Musso
- "Andrew Chatterley" CEO
- Musso CEO
- Andrew Chatterley technology
- Musso leadership

### File Structure
```
/root/repazoo/
├── src/
│   ├── lib/
│   │   └── supabase.ts (Supabase client & types)
│   ├── app/
│   │   ├── admin/
│   │   │   └── data-viewer/
│   │   │       └── page.tsx (Backend data viewer)
│   │   └── api/
│   │       └── mentions/
│   │           └── supabase/
│   │               └── route.ts (Supabase API endpoints)
├── supabase-schema.sql (Database schema)
├── n8n-workflows.json (n8n workflow configuration)
├── docker-compose.n8n.yml (n8n Docker setup)
└── N8N_SUPABASE_SETUP.md (This file)
```

### Key Features
1. **Real Identity Tracking**: Configured specifically for Andrew Chatterley as CEO of Musso
2. **Automated Sentiment Analysis**: Built into n8n workflow
3. **10 Monitoring Sources**: Pre-configured for comprehensive coverage
4. **Visual Data Viewer**: See all scraped data in real-time
5. **Webhook Integration**: Trigger scraping from frontend or n8n
6. **Status Tracking**: Monitor job progress and failures

### Next Steps
1. Add Supabase credentials to `.env`
2. Run database schema in Supabase
3. Configure n8n workflow with Supabase credentials
4. Start scraping Andrew Chatterley mentions
5. Monitor results in data viewer

### Important Notes
- The system is configured to track Andrew Chatterley as CEO of Musso
- Search queries are optimized for executive/leadership mentions
- Sentiment analysis uses keyword-based detection
- All data flows through Supabase for centralized storage
- n8n handles the actual web scraping and processing

### Troubleshooting
- If n8n webhook fails: Check n8n is running at http://localhost:5678
- If Supabase errors: Verify credentials in .env file
- If no data appears: Trigger scraping manually from data viewer
- PostgreSQL port conflict: Using existing PostgreSQL, n8n connects to it

The system is ready to track Andrew Chatterley's online presence as CEO of Musso!