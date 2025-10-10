# Twitter Integration Guide for Repazoo

Everything you need to know about connecting Twitter/X to Repazoo safely and securely.

---

## Table of Contents

1. [Overview](#overview)
2. [What is OAuth and Why It Matters](#what-is-oauth-and-why-it-matters)
3. [How Twitter Login Works](#how-twitter-login-works)
4. [What Data We Collect](#what-data-we-collect)
5. [What We Do With Your Data](#what-we-do-with-your-data)
6. [Privacy & Security](#privacy--security)
7. [Managing Your Connection](#managing-your-connection)
8. [Disconnecting Twitter](#disconnecting-twitter)
9. [Data Retention & Deletion](#data-retention--deletion)
10. [Troubleshooting Twitter Connection](#troubleshooting-twitter-connection)
11. [FAQ](#faq)

---

## Overview

Repazoo connects to your Twitter account to analyze your tweets, engagement patterns, and reputation metrics. This guide explains exactly how the integration works, what data is involved, and how your privacy is protected.

**Key Points:**
- Repazoo uses Twitter's official OAuth 2.0 authentication
- Your Twitter password is NEVER shared with or stored by Repazoo
- You can disconnect at any time
- All data transfers are encrypted
- You control what happens to your data

---

## What is OAuth and Why It Matters

### The Old Way (Why We DON'T Do This)

In the past, apps would ask for your Twitter username and password. This was dangerous because:
- The app could do anything with your account
- You had to trust them with your password
- No way to revoke access without changing your password
- If the app was hacked, hackers got your password

### The Modern Way (OAuth 2.0)

Twitter and Repazoo use OAuth 2.0, which is like a "valet key" for your account:

**How a Valet Key Works:**
- You give the valet a special key
- This key only starts the car and drives it short distances
- It cannot open the glove box or trunk
- You can take the key back anytime
- Your main key stays safe with you

**How OAuth Works:**
- You authorize Repazoo on Twitter's website (not ours)
- Twitter gives Repazoo a special "access token"
- This token only allows reading your public tweets
- It cannot post, delete, or access private data
- You can revoke it anytime on Twitter's settings
- Your password stays safe with Twitter

### Additional Security: PKCE

Repazoo uses an extra security layer called PKCE (Proof Key for Code Exchange):

**What It Does:**
- Prevents attackers from intercepting your authorization
- Critical for mobile apps and modern security
- Industry best practice recommended by security experts

**Why It Matters:**
Even if someone intercepts the OAuth flow, they cannot steal your access without the secret "proof key" that only Repazoo knows.

---

## How Twitter Login Works

Here's the exact step-by-step process when you connect Twitter:

### Step 1: You Click "Connect Twitter"

What happens behind the scenes:
1. Repazoo generates a random "state" value (prevents CSRF attacks)
2. Repazoo creates a "code verifier" and "code challenge" (PKCE security)
3. Repazoo redirects you to Twitter.com with these security tokens

**You'll see:**
- URL changes to twitter.com (or x.com)
- Your browser shows Twitter's real website (check the lock icon!)

### Step 2: Twitter Asks for Authorization

**What Twitter Shows You:**
- App name: "Repazoo"
- Permissions requested (see detailed list below)
- Your Twitter account details
- "Authorize app" button

**What You Should Verify:**
1. URL is `https://twitter.com` or `https://api.twitter.com` (check for HTTPS lock icon)
2. App name says "Repazoo" exactly
3. Permissions match what's listed in this guide
4. You're logged into the Twitter account you want to connect

**If anything looks suspicious, STOP and contact Repazoo support.**

### Step 3: You Click "Authorize app"

What happens:
1. Twitter generates an "authorization code"
2. Twitter redirects you back to Repazoo
3. The authorization code is in the URL (temporary, expires in 10 minutes)

**You'll see:**
- URL changes back to repazoo.com
- Progress indicator while Repazoo processes

### Step 4: Repazoo Exchanges Code for Token

What happens behind the scenes:
1. Repazoo sends the authorization code to Twitter
2. Repazoo proves it has the matching "code verifier" (PKCE)
3. Twitter verifies everything matches
4. Twitter sends Repazoo an "access token" and "refresh token"

**Security Notes:**
- This exchange happens server-to-server (not in your browser)
- The tokens are encrypted immediately upon receipt
- The authorization code is used once and discarded

### Step 5: Repazoo Stores Your Connection

What Repazoo saves in its database:
- Your Twitter user ID (unique identifier, not your password)
- Your Twitter username (e.g., @yourname)
- Your display name
- Access token (encrypted)
- Refresh token (encrypted)
- Token expiration time
- Connection timestamp

**What is NOT saved:**
- Your Twitter password
- Your Twitter email (unless public)
- Your Twitter DMs
- Your Twitter login sessions

### Step 6: Success!

You're now connected and Repazoo can:
- Read your public tweets
- Fetch your profile information
- Calculate engagement metrics

You'll see a confirmation message and your Twitter account appears in "Connected Accounts."

---

## What Data We Collect

When you connect Twitter, Repazoo accesses specific data to perform reputation analysis.

### Profile Information

**What We Collect:**
- Twitter User ID (unique number, e.g., 123456789)
- Username (e.g., @yourname)
- Display name (e.g., "John Smith")
- Profile bio
- Profile picture URL
- Follower count
- Following count
- Verification status (blue check)
- Account creation date
- Location (if public)

**How We Use It:**
- Display your account in the Repazoo interface
- Context for tweet analysis
- Engagement calculations
- Reputation scoring

**Not Collected:**
- Email address (unless it's in your public bio)
- Phone number
- Birthday
- Private account information

### Tweet Data

**What We Collect:**
- Your most recent 200 public tweets
- Tweet text content
- Tweet creation timestamp
- Like count per tweet
- Retweet count per tweet
- Reply count per tweet
- Quote tweet count
- Media types (photo, video, link)
- Hashtags used
- @mentions in tweets (usernames only, not user IDs)

**How We Use It:**
- Sentiment analysis
- Theme detection
- Risk assessment
- Engagement metrics
- Content pattern analysis

**Not Collected:**
- Direct messages (DMs)
- Private/protected tweets
- Draft tweets
- Scheduled tweets
- Twitter analytics data
- Private lists
- Bookmarks
- Deleted tweets

### Engagement Metrics

**What We Calculate:**
- Average likes per tweet
- Average retweets per tweet
- Average replies per tweet
- Overall engagement rate
- Peak engagement times
- Best performing content types
- Engagement trends over time

**Data Sources:**
- Public engagement counts on your tweets
- Timestamp analysis
- Statistical calculations

### Network Information

**What We Collect:**
- Follower count (number only)
- Following count (number only)

**What We DO NOT Collect:**
- List of who follows you
- List of who you follow
- Private list memberships
- Blocked or muted accounts
- DM conversations
- Twitter Circle members

---

## What We Do With Your Data

### Analysis Processing

**During Analysis:**
1. **Fetch Data:** Retrieve your tweets from Twitter API
2. **Sanitize:** Remove personal information and location data
3. **Anonymize:** Strip user IDs from @mentions (keep usernames only)
4. **Truncate:** Limit to 200 most recent tweets
5. **Send to AI:** Processed data sent to Claude AI for analysis
6. **Generate Report:** AI returns insights, recommendations, risk scores
7. **Store Results:** Analysis results saved to your Repazoo account
8. **Clean Up:** Temporary data deleted after processing

**What Gets Sent to Claude AI:**
- Sanitized tweet text (with PII removed)
- Engagement metrics (aggregated numbers)
- Metadata (timestamps, hashtags, general themes)
- Your stated analysis purpose

**What Does NOT Get Sent to AI:**
- Your exact location
- Specific user IDs of people you mention
- Private account information
- Data unrelated to reputation analysis

### Data Storage

**In Repazoo's Database (Supabase):**

**Permanently Stored:**
- Your Repazoo account info (email, name)
- Twitter connection metadata (user ID, username)
- Analysis results (insights, scores, recommendations)
- Usage tracking (API calls, quota)
- Audit logs (for security)

**Temporarily Cached:**
- Recent tweets (up to 30 days)
- Profile information (updated on each analysis)
- OAuth tokens (until revoked or expired)

**Never Stored:**
- Your Twitter password
- Direct messages
- Private conversations
- Deleted tweets (we respect your deletions)

**Encryption:**
- All OAuth access tokens are encrypted at rest using industry-standard AES-256 encryption
- Database connections are encrypted with TLS 1.3
- API communications use HTTPS only

### Data Sharing

**Who Sees Your Data:**

**ONLY YOU:**
- Your complete analysis reports
- Your tweet data
- Your risk assessments
- Your recommendations
- Your usage metrics

**ANTHROPIC (Claude AI):**
- Sanitized tweet text for analysis
- No personally identifiable information
- No stored data after analysis completes
- Subject to Anthropic's privacy policy

**TWITTER:**
- We send back basic API requests (reads only)
- Twitter sees which app (Repazoo) is accessing your account
- You can view this in Twitter's "Connected Apps" settings

**NO ONE ELSE:**
- We do NOT sell your data
- We do NOT share data with advertisers
- We do NOT provide data to third parties
- We do NOT use your data for training AI models (your data is your data)

---

## Privacy & Security

### How We Protect Your Data

**Encryption in Transit:**
- All connections use HTTPS/TLS 1.3
- Twitter OAuth tokens transmitted over encrypted channels only
- API requests to Repazoo use certificate pinning

**Encryption at Rest:**
- OAuth access tokens encrypted with AES-256
- Refresh tokens encrypted separately
- Database encrypted at rest (Supabase security)
- Backups are encrypted

**Access Controls:**
- Row-level security (RLS) in database
- You can only access YOUR data
- Admin access is logged and audited
- Multi-factor authentication for Repazoo staff

**Security Monitoring:**
- Real-time intrusion detection
- Anomaly detection for unusual API usage
- Audit logs of all data access
- Automated security alerts

### Your Privacy Rights

**Right to Access:**
- View all your data anytime in Settings > Data
- Export complete analysis history
- Download raw data in JSON format

**Right to Deletion:**
- Delete individual analyses
- Delete all analysis data
- Disconnect Twitter (revokes access)
- Delete entire Repazoo account

**Right to Portability:**
- Export data in standard formats (JSON, CSV, PDF)
- Take your data to competitors if you choose
- No lock-in or proprietary formats

**Right to Correction:**
- Update your profile information anytime
- Re-run analysis to get updated results
- Report inaccuracies to support

### Compliance

**GDPR (European Users):**
- Data processing is lawful, fair, and transparent
- Data collected only for specified purposes
- Data minimization (only collect what's needed)
- Data kept only as long as necessary
- Data controller: Repazoo Inc.

**CCPA (California Users):**
- You can opt-out of data sharing (nothing to opt out of - we don't share!)
- You can request deletion at any time
- We do not sell personal information
- We do not discriminate based on privacy choices

**Twitter API Terms:**
- Repazoo complies with Twitter's Developer Agreement
- We respect Twitter's rate limits
- We honor user privacy preferences
- We cache data appropriately per Twitter's rules

---

## Managing Your Connection

### Viewing Connected Accounts

1. **Navigate to Settings > Connected Accounts**
2. **You'll See:**
   - Twitter username and profile picture
   - Connection status (Active, Expired, Revoked)
   - Connection date
   - Last used date
   - Token expiration date

### Checking Connection Health

**Connection Status Indicators:**

**Active (Green):**
- Connection is working
- Token is valid
- No action needed

**Expiring Soon (Yellow):**
- Token expires within 7 days
- Repazoo will auto-refresh
- No action needed (usually)

**Expired (Orange):**
- Token has expired
- Repazoo tried to refresh but failed
- Click "Reconnect" to re-authorize

**Revoked (Red):**
- You manually disconnected on Twitter
- Or Twitter suspended your account
- Click "Connect" to re-authorize

### Refreshing Tokens

**Automatic Refresh:**
- Repazoo automatically refreshes tokens before they expire
- Happens in the background
- No action needed from you

**Manual Refresh:**
- Settings > Connected Accounts
- Click three-dot menu next to account
- Select "Refresh Token"
- Useful if you see errors

### Multiple Account Management

**Adding Another Account:**
1. Settings > Connected Accounts
2. Click "Add Another Account"
3. Log into different Twitter account when prompted
4. Authorize Repazoo
5. Both accounts now appear in your list

**Switching Between Accounts:**
- When running analysis, select which account from dropdown
- Each account has separate analysis history
- Quota applies to your Repazoo account (shared across Twitter accounts)

**Removing an Account:**
- Click three-dot menu next to account
- Select "Disconnect"
- Past analyses remain (unless you delete them separately)

---

## Disconnecting Twitter

You can disconnect your Twitter account from Repazoo in two ways:

### Method 1: Disconnect from Repazoo (Recommended)

**Steps:**
1. Log into Repazoo
2. Go to Settings > Connected Accounts
3. Find the Twitter account
4. Click "Disconnect" or three-dot menu > "Disconnect"
5. Confirm disconnection

**What Happens:**
- Repazoo revokes the OAuth token on Twitter (tells Twitter to deactivate it)
- Repazoo deletes the encrypted tokens from its database
- Your past analysis results remain available (you can delete separately)
- Twitter connection disappears from your Connected Accounts list

**On Twitter's Side:**
- Repazoo app is automatically removed from your authorized apps
- Repazoo can no longer access your account
- Token is invalidated immediately

### Method 2: Revoke from Twitter

**Steps:**
1. Log into Twitter.com
2. Go to Settings and Privacy
3. Click "Security and account access"
4. Click "Apps and sessions"
5. Find "Repazoo" in the list
6. Click "Revoke access"

**What Happens:**
- Twitter immediately invalidates all Repazoo tokens
- Repazoo can no longer access your account
- Next time you visit Repazoo, it will show "Connection Revoked"
- You can reconnect anytime

**Note:** This method doesn't delete your data from Repazoo. To do that, use Method 1 or delete your data separately.

### What Gets Deleted vs. What Remains

**Immediately Deleted:**
- OAuth access token (encrypted)
- OAuth refresh token (encrypted)
- Cached tweets (if any)
- Live connection to your account

**Remains Available (Until You Delete):**
- Past analysis results
- Your Repazoo account
- Usage history
- Exported reports (on your device)

**To Delete Everything:**
1. Disconnect Twitter (Method 1 above)
2. Go to Settings > Privacy
3. Click "Delete All Analysis Data"
4. If desired: Settings > Account > "Delete Account"

---

## Data Retention & Deletion

### What We Keep and For How Long

**Active Users:**
- Analysis results: Indefinitely (until you delete)
- OAuth tokens: Until expired or revoked
- Cached tweets: 30 days maximum
- Audit logs: 90 days
- Usage metrics: 12 months

**Inactive Users:**
- After 12 months of inactivity, we may delete cached data
- Analysis results remain available
- Account remains active
- You can log in anytime to reactivate

**Deleted Accounts:**
- Account deleted within 30 days
- All data deleted within 90 days (compliance requirement)
- Backups purged within 90 days
- Audit logs retained 1 year (security/legal requirement)

### Deleting Your Data

**Delete a Single Analysis:**
1. Dashboard > Past Analyses
2. Open the analysis
3. Click three-dot menu > "Delete"
4. Confirm deletion
5. Deleted immediately and permanently

**Delete All Analyses:**
1. Settings > Privacy
2. Click "Delete All Analysis Data"
3. Confirm by typing "DELETE"
4. All analysis results deleted immediately
5. Quota usage reset to 0
6. Cannot be undone

**Delete Cached Tweets:**
1. Settings > Privacy
2. Click "Clear Cached Data"
3. Removes all cached tweet data
4. Next analysis will fetch fresh data
5. Past analysis results unaffected

**Delete Your Entire Account:**
1. Settings > Account
2. Scroll to bottom
3. Click "Delete My Account"
4. Confirm by entering your password
5. Confirm by typing "DELETE ACCOUNT"
6. Account deleted within 30 days
7. All data deleted within 90 days
8. Subscription cancelled automatically
9. Cannot be undone

### Export Before Deleting (Recommended)

**Always export your data before deleting if you might want it later:**

1. Dashboard > Past Analyses
2. For each analysis, click "Export" > Choose format
3. Download all exports to your device
4. Verify files downloaded correctly
5. THEN proceed with deletion

---

## Troubleshooting Twitter Connection

### Common Issues

#### Issue: "Failed to Connect Twitter Account"

**Symptom:** After clicking "Authorize app" on Twitter, you're redirected back to Repazoo but see an error.

**Possible Causes:**
1. You clicked "Deny" instead of "Authorize"
2. Twitter is experiencing issues
3. Browser blocked the redirect
4. Session timed out

**Solutions:**
1. Try connecting again from scratch
2. Check https://status.twitterstat.us/ for Twitter API status
3. Allow popups/redirects from repazoo.com in browser settings
4. Clear cookies for repazoo.com and twitter.com
5. Try a different browser
6. Disable browser extensions temporarily

#### Issue: "Twitter Connection Expired"

**Symptom:** Your connected account shows "Expired" status.

**Cause:** OAuth tokens expire after a certain period (typically 2 hours for access tokens, but we refresh them).

**Solutions:**
1. Click "Reconnect" next to the account
2. Re-authorize on Twitter
3. Connection should be active again

**Prevention:**
- Repazoo automatically refreshes tokens before they expire
- If you see this, it means auto-refresh failed
- Usually happens if you revoked access manually on Twitter

#### Issue: "Protected Account Cannot Be Analyzed"

**Symptom:** Error message when trying to run analysis: "This Twitter account is protected."

**Cause:** Your tweets are private/protected on Twitter.

**Solution:**
1. Go to Twitter.com > Settings and Privacy
2. Click "Privacy and safety"
3. Uncheck "Protect your Tweets"
4. Wait 5 minutes for Twitter to update
5. Try analysis again

**Note:** Repazoo can only analyze public accounts. This is a Twitter API limitation.

#### Issue: "Rate Limit Exceeded"

**Symptom:** Error message: "Twitter API rate limit exceeded. Please try again in 15 minutes."

**Cause:** Twitter limits how many requests can be made in a time period.

**Solution:**
1. Wait 15 minutes
2. Try analysis again
3. If repeated: Contact support (might indicate a bug)

**Note:** This is rare and usually resolves quickly.

#### Issue: "Cannot Access Recent Tweets"

**Symptom:** Analysis shows tweets from weeks ago, not recent tweets.

**Cause:** Twitter API caching or your account is protected.

**Solutions:**
1. Ensure your account is public on Twitter
2. Wait 15 minutes and try again (Twitter API cache)
3. If tweets are brand new (posted in last hour), they might not be indexed yet
4. Click "Refresh" in Connected Accounts

#### Issue: Token Refresh Failed

**Symptom:** "Failed to refresh access token" error.

**Causes:**
1. You revoked access on Twitter
2. Twitter suspended your account
3. Twitter API is down

**Solutions:**
1. Check if your Twitter account is accessible
2. Disconnect and reconnect the account
3. Check Twitter API status page
4. Contact support if issue persists

---

## FAQ

### General Questions

**Q: Does Repazoo see my Twitter password?**
A: No, absolutely not. OAuth 2.0 means you authorize Repazoo on Twitter's website, and Twitter gives us an access token. We never see or store your password.

**Q: Can Repazoo post tweets on my behalf?**
A: No. Repazoo only requests "read" permissions, not "write" permissions. We cannot post, delete, like, retweet, or modify anything on your account.

**Q: Can Repazoo see my DMs?**
A: No. Direct messages are not included in the permissions Repazoo requests. We cannot access DMs.

**Q: Will anyone know I'm using Repazoo?**
A: Not unless you tell them. The only indication is in Twitter's "Connected Apps" settings (Settings > Apps and sessions), where Twitter lists all authorized apps. This is visible only to you, not to the public.

**Q: Does Repazoo slow down my Twitter account?**
A: No. Repazoo reads data through Twitter's API, which is designed for this purpose and doesn't affect your account's performance.

### Privacy Questions

**Q: Is my data sold to advertisers?**
A: No. Repazoo does not sell, rent, or share your data with advertisers or third parties. Your data is used solely for providing you with reputation analysis services.

**Q: Does Repazoo train AI models on my tweets?**
A: No. Your tweets are analyzed by Claude AI to generate YOUR report, but they are not used to train AI models. Anthropic (Claude's creator) does not use customer data for training.

**Q: Can other Repazoo users see my analysis?**
A: No. Your analysis results are completely private. Only you can see them (unless you export and share them yourself).

**Q: What if I delete a tweet? Does Repazoo still have it?**
A: If you delete a tweet on Twitter, it's removed from our cache within 30 days. Past analyses that included that tweet will still show it (since it was public when analyzed), but future analyses won't include it.

**Q: Is my data encrypted?**
A: Yes. All data is encrypted in transit (HTTPS/TLS 1.3) and sensitive data like OAuth tokens are encrypted at rest using AES-256 encryption.

### Analysis Questions

**Q: How many tweets do I need for analysis?**
A: Minimum 10 tweets, but we recommend at least 50 for accurate results. Repazoo analyzes up to 200 of your most recent tweets.

**Q: Can I analyze someone else's Twitter account?**
A: No. You can only analyze Twitter accounts you have authorized access to. You cannot analyze other people's accounts without their permission.

**Q: How often should I run an analysis?**
A: Depends on your needs:
- Occasional tweeters: Monthly
- Active tweeters: Weekly
- Professionals/brands: Before important events or campaigns

**Q: Does analysis use my quota if it fails?**
A: No. Quota is only consumed when analysis completes successfully. Failed attempts do not count against your monthly limit.

### Technical Questions

**Q: What Twitter API version does Repazoo use?**
A: Repazoo uses Twitter API v2, the latest version, for maximum security and features.

**Q: What permissions does Repazoo request?**
A: Read-only access to:
- Public tweets
- Profile information (bio, followers count, etc.)
- This is the minimal permission set needed for analysis.

**Q: How long do OAuth tokens last?**
A: Access tokens expire after 2 hours, but Repazoo automatically refreshes them using refresh tokens. Refresh tokens last 6 months. You'll never notice this happening.

**Q: Can I use Repazoo's API to automate analyses?**
A: Yes! Pro tier includes API access. See documentation at https://repazoo.com/docs/api

**Q: Is Repazoo open source?**
A: The core platform is proprietary, but we may open-source certain components in the future. Join our mailing list for updates.

---

## Need Help?

### Support Channels

**Email Support:**
- support@repazoo.com
- Include: Your username, which Twitter account, what you were trying to do, any error messages

**Documentation:**
- Complete feature list: COMPLETE_FEATURE_SCOPE.md
- User guide: USER_GUIDE.md
- This guide: TWITTER_INTEGRATION_GUIDE.md

**Status Page:**
- https://status.repazoo.com
- Check for Twitter API or Repazoo service issues

**Twitter API Status:**
- https://api.twitterstat.us/
- Check if Twitter's API is experiencing problems

### Reporting Security Issues

If you discover a security vulnerability:
- Email: security@repazoo.com
- Do NOT post publicly
- We'll respond within 24 hours
- Responsible disclosure is appreciated

---

## Summary

**Key Takeaways:**

1. **Secure:** OAuth 2.0 with PKCE - your password is never shared
2. **Transparent:** You know exactly what data we collect and why
3. **Private:** Your data is not sold or shared with third parties
4. **Controlled:** You can disconnect, export, or delete anytime
5. **Encrypted:** All sensitive data is encrypted in transit and at rest
6. **Compliant:** GDPR and CCPA compliant, respects your privacy rights

**You're in Control:**
- You choose when to connect
- You choose what to analyze
- You control who sees your results
- You decide when to disconnect
- You own your data

**Questions or Concerns?**
Contact us anytime: support@repazoo.com

---

*Twitter Integration Guide - Repazoo Phase 14 - Updated: October 7, 2025*
*Twitter and X are trademarks of Twitter, Inc. / X Corp.*
