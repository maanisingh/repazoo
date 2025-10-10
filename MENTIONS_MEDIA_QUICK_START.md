# Twitter Mentions with Media - Quick Start Guide

## 🎯 What Was Built

A complete Twitter mentions system that fetches, stores, and displays:
- ✅ Tweet text and metadata
- ✅ **Images** (up to 4 per tweet)
- ✅ **Videos** with preview thumbnails
- ✅ **Animated GIFs**
- ✅ Sentiment analysis results
- ✅ Risk level assessment
- ✅ Engagement metrics

## 📁 Key Files Created

### Database
- `/root/repazoo/supabase/migrations/20251009_001_tweet_media.sql` - Schema migration
- `/root/repazoo/sample_mentions_with_media_fixed.sql` - Sample data

### Backend
- `/root/repazoo/backend/api/mentions.py` - API endpoints (NEW)
- `/root/repazoo/backend/main.py` - Added mentions router (MODIFIED)
- `/root/repazoo/backend/config.py` - Added n8n config (MODIFIED)

### Frontend
- `/root/repazoo/frontend/src/features/mentions/types/mention.ts` - Types (MODIFIED)
- `/root/repazoo/frontend/src/features/mentions/components/MentionMediaGallery.tsx` - Media gallery (NEW)
- `/root/repazoo/frontend/src/features/mentions/components/MentionCard.tsx` - Mention card (NEW)
- `/root/repazoo/frontend/src/features/mentions/components/MentionsList.tsx` - List view (NEW)
- `/root/repazoo/frontend/src/features/mentions/components/index.ts` - Exports (NEW)

### Workflows
- `/root/repazoo/n8n/workflows/twitter-fetch-mentions-with-media.json` - N8N workflow (NEW)

## 🚀 Quick Test Commands

### 1. Check Database
```bash
docker exec -i repazoo-postgres psql -U postgres -d repazoo -c "
SELECT
    tm.author_username,
    tm.sentiment,
    tm.has_media,
    tm.media_count,
    COUNT(med.id) as actual_media
FROM twitter_mentions tm
LEFT JOIN tweet_media med ON med.mention_id = tm.id
WHERE tm.user_id = '123e4567-e89b-12d3-a456-426614174000'::UUID
GROUP BY tm.id
ORDER BY tm.created_at DESC;
"
```

### 2. Test API Endpoint
```bash
# Get all mentions (requires auth token)
curl -X GET 'http://localhost:8000/api/mentions' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  | jq '.mentions[] | {username: .author.username, text: .text, media_count: .media | length}'
```

### 3. Check Health
```bash
curl -s http://localhost:8000/healthz | jq .
```

## 📊 Sample Data Verification

Run this to see the sample mentions:
```bash
docker exec -i repazoo-postgres psql -U postgres -d repazoo -c "
SELECT
    author_username,
    LEFT(tweet_text, 50) as preview,
    sentiment,
    risk_level,
    media_count
FROM twitter_mentions
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'::UUID
ORDER BY created_at DESC;
"
```

Expected output:
- @techreviewer - Positive, Low risk, 1 media
- @socialmediaguru - Positive, Low risk, 4 media
- @videomaker - Positive, Low risk, 1 media (video)
- @concerneduser - Negative, Medium risk, 0 media
- @neutralobserver - Neutral, Low risk, 0 media

## 🎨 Frontend Usage

### Import Components
```typescript
import { MentionMediaGallery, MentionCard, MentionsList } from '@/features/mentions/components'
import type { Mention } from '@/features/mentions/types/mention'
```

### Use MentionCard
```tsx
<MentionCard mention={mention} />
```

### Use MentionsList
```tsx
<MentionsList
  mentions={mentions}
  loading={isLoading}
  error={error}
  emptyMessage="No mentions found"
/>
```

### Use MentionMediaGallery (standalone)
```tsx
<MentionMediaGallery media={mention.media} />
```

## 🔌 API Endpoints

### GET /api/mentions
List mentions with filtering and pagination

**Query Parameters:**
- `page` (int, default: 1)
- `page_size` (int, default: 20, max: 100)
- `sentiment` (string: "positive", "neutral", "negative")
- `risk_level` (string: "low", "medium", "high", "critical")
- `has_media` (boolean)
- `sort_by` (string: "newest", "oldest", "most_engagement", "highest_risk")

**Example:**
```bash
curl 'http://localhost:8000/api/mentions?has_media=true&sentiment=positive&page_size=10'
```

### GET /api/mentions/{mention_id}
Get single mention with all media

### GET /api/mentions/stats/summary
Get aggregate statistics

### POST /api/mentions/scan
Trigger new mention fetch from Twitter

**Body:**
```json
{
  "twitter_user_id": "1234567890",
  "max_results": 100
}
```

## 🛠️ Deployment Checklist

### Backend ✅
- [x] Database migration executed
- [x] API endpoints created
- [x] Service restarted
- [x] Health check passing

### Frontend ⏳
- [ ] Components created (✅ Done)
- [ ] Build frontend (`npm run build`)
- [ ] Restart dashboard service
- [ ] Test in browser

### N8N Workflow ⏳
- [ ] Import workflow JSON into n8n
- [ ] Configure Twitter credentials
- [ ] Test webhook endpoint
- [ ] Verify database writes

## 📝 Next Steps

1. **Build Frontend:**
   ```bash
   cd /root/repazoo/frontend
   npm install date-fns  # If needed
   npm run build
   ```

2. **Restart Dashboard:**
   ```bash
   cd /root/repazoo
   docker-compose -f docker-compose.production.yml restart dashboard
   ```

3. **Import N8N Workflow:**
   - Access: http://cfy.repazoo.com/workflows/
   - Import: `/root/repazoo/n8n/workflows/twitter-fetch-mentions-with-media.json`
   - Configure Twitter Bearer Token credentials

4. **Test End-to-End:**
   - Trigger mention fetch via API
   - Verify data in database
   - View in frontend UI

## 🐛 Common Issues

### Issue: Media not showing
**Fix:** Check if `has_media` flag is true in database. Triggers should auto-update this.

### Issue: API returns 500
**Fix:** Check backend logs: `docker logs repazoo-api --tail 50`

### Issue: CORS errors
**Fix:** Verify CORS origins in `/root/repazoo/backend/config.py` include your frontend domain

### Issue: Empty media array
**Fix:** Run stored function directly:
```sql
SELECT * FROM get_user_mentions_with_media(
    '123e4567-e89b-12d3-a456-426614174000'::UUID,
    20, 0, NULL, NULL, NULL
);
```

## 📚 Full Documentation

See `/root/repazoo/TWITTER_MENTIONS_MEDIA_DEPLOYMENT_REPORT.md` for complete details.

## ✅ System Status

| Component | Status |
|-----------|--------|
| Database Schema | ✅ Deployed |
| Backend API | ✅ Running |
| Sample Data | ✅ Loaded |
| Frontend Components | ✅ Created |
| N8N Workflow | ✅ Ready |
| Production Deployment | ⏳ Pending frontend build |

---

**Last Updated:** October 9, 2025
**Version:** 1.0.0
