# Repazoo Complete Workflow Suite

## ✅ Already Imported (4 workflows):
1. Opus Orchestration - Twitter Reputation Analysis
2. Get All Scans - Dashboard data
3. Get Scan By ID - Scan details  
4. Dashboard Stats - Statistics

## 🔄 New Workflows Created (ready to import):

### User Management:
5. User Registration - `/webhook/register`
6. User Login - `/webhook/login`
7. Password Reset - `/webhook/password-reset`

### Twitter Management:
8. Post Tweet - `/webhook/twitter/post-tweet`
9. Delete Tweet - `/webhook/twitter/delete-tweet`
10. Connect Twitter OAuth - `/webhook/twitter/connect`
11. Get My Twitter Posts - `/webhook/twitter/my-posts`
12. Analyze My Account - `/webhook/twitter/analyze-me`

### Account Management:
13. Update Profile - `/webhook/profile/update`
14. Get User Settings - `/webhook/settings`
15. Delete Account - `/webhook/account/delete`

## Database Tables Needed:

```sql
-- Users table (extend existing)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_oauth_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_oauth_secret TEXT;

-- Tweet history
CREATE TABLE IF NOT EXISTS tweet_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    tweet_id VARCHAR(255),
    tweet_text TEXT,
    action VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

