# 🔧 N8N SETUP GUIDE - Using API Key

## Step 1: Get Your N8N API Key

### Option A: Generate from UI (Recommended)
1. Open browser and go to: **https://wf.repazoo.com**
2. Login with credentials:
   - **Username:** `admin`
   - **Password:** `repazoo_n8n_2024`
3. Click on your profile icon (bottom left)
4. Click **"Settings"**
5. Go to **"API"** tab
6. Click **"Create API Key"**
7. Copy the generated key (it looks like: `n8n_api_xxxxxxxxxxxxx`)

### Option B: Use Environment Variable
If API key is already set in environment:
```bash
echo $N8N_API_KEY
```

---

## Step 2: Import All Workflows Automatically

Once you have the API key, run:

```bash
/root/repazoo/scripts/import-n8n-workflows.sh YOUR_API_KEY_HERE
```

This will:
- Import all 15 workflows from `/root/repazoo/n8n/workflows/`
- Create them in your n8n instance
- Show success/failure for each workflow

**Example:**
```bash
/root/repazoo/scripts/import-n8n-workflows.sh n8n_api_12345abcdefghijklmnop
```

**Expected Output:**
```
🚀 Importing n8n workflows...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 n8n URL: https://wf.repazoo.com
📂 Workflows: /root/repazoo/n8n/workflows

📦 Importing: dashboard-stats.json
   ✅ Imported successfully (ID: 1)

📦 Importing: get-all-scans.json
   ✅ Imported successfully (ID: 2)

... (13 more workflows)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary:
   ✅ Imported: 15 workflows
   ❌ Failed: 0 workflows

🎉 Workflows imported successfully!
```

---

## Step 3: Configure Credentials in N8N

After importing, you need to set up credentials for each workflow.

### 3.1 PostgreSQL Credential

1. In n8n UI, go to **Credentials** (left sidebar)
2. Click **"Create New Credential"**
3. Select **"PostgreSQL"**
4. Enter:
   - **Name:** `Repazoo PostgreSQL`
   - **Host:** `postgres`
   - **Database:** `postgres`
   - **User:** `postgres`
   - **Password:** `repuzoo_secure_pass_2024` (from docker-compose)
   - **Port:** `5432`
   - **SSL:** Off (internal network)
5. Click **"Create"**

### 3.2 Ollama Credential

1. Create new credential
2. Select **"HTTP Request"** (Ollama doesn't have native node)
3. Enter:
   - **Name:** `Ollama Local`
   - **Base URL:** `http://ollama:11434`
   - **Authentication:** None
4. Click **"Create"**

### 3.3 FastAPI Backend Credential

1. Create new credential
2. Select **"HTTP Request"**
3. Enter:
   - **Name:** `Repazoo Backend`
   - **Base URL:** `http://api:8000`
   - **Authentication:** None (internal network)
4. Click **"Create"**

### 3.4 Flowise Credential

1. Create new credential
2. Select **"HTTP Request"**
3. Enter:
   - **Name:** `Flowise API`
   - **Base URL:** `http://flowise:3000`
   - **Authentication:** API Key (if set)
4. Click **"Create"**

---

## Step 4: Update Workflows to Use Credentials

For each imported workflow:

1. Open the workflow
2. Click on each node that needs credentials
3. Select the credential you created (dropdown)
4. Click **"Save"** (top right)

**Nodes that need credentials:**
- **PostgreSQL** nodes → Use "Repazoo PostgreSQL"
- **HTTP Request** nodes calling Ollama → Use "Ollama Local"
- **HTTP Request** nodes calling API → Use "Repazoo Backend"
- **HTTP Request** nodes calling Flowise → Use "Flowise API"

---

## Step 5: Activate All Workflows

For each workflow:

1. Open the workflow
2. Toggle the switch in top-right from **Off** (grey) to **Active** (green)
3. Workflow will now respond to webhook requests

**Alternatively, activate all at once via API:**

```bash
# Run this script (provide your API key)
/root/repazoo/scripts/activate-all-workflows.sh YOUR_API_KEY
```

---

## Step 6: Test Webhooks

### Test 1: Health Check
```bash
curl https://wf.repazoo.com/healthz
# Expected: {"status":"ok"}
```

### Test 2: Dashboard Stats
```bash
curl -X POST https://ntf.repazoo.com/webhook/dashboard-stats \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user-123"}'
```

### Test 3: Get All Scans
```bash
curl -X POST https://ntf.repazoo.com/webhook/get-scans \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user-123"}'
```

### Test 4: Create Scan
```bash
curl -X POST https://ntf.repazoo.com/webhook/twitter-reputation-scan \
  -H "Content-Type: application/json" \
  -d '{
    "twitter_handle": "@elonmusk",
    "user_id": "test-user-123",
    "scan_id": "test-001"
  }'
```

---

## Troubleshooting

### Issue: "Workflow not found"
**Solution:** Make sure the workflow is activated (green toggle)

### Issue: "Credential not found"
**Solution:**
1. Open workflow
2. Click on node with error
3. Select credential from dropdown
4. Save workflow

### Issue: "Connection refused to postgres"
**Solution:** Check PostgreSQL is running:
```bash
docker ps | grep postgres
docker logs repazoo-postgres --tail 20
```

### Issue: "Ollama model not found"
**Solution:** Pull the model:
```bash
docker exec repazoo-ollama ollama pull llama3:8b
docker exec repazoo-ollama ollama list
```

---

## Verify Everything Works

### Check n8n Executions
1. Go to https://wf.repazoo.com
2. Click **"Executions"** (left sidebar)
3. You should see recent webhook calls
4. Click any execution to see detailed data flow

### Check Docker Logs
```bash
# n8n logs
docker logs repazoo-n8n --tail 50 -f

# Backend logs
docker logs repazoo-api --tail 50 -f

# Ollama logs
docker logs repazoo-ollama --tail 50 -f
```

---

## Workflow Webhook Endpoints

Once activated, these webhooks will be live:

| Endpoint | Workflow | Purpose |
|----------|----------|---------|
| `/webhook/register` | user-registration.json | User signup |
| `/webhook/login` | user-login.json | User login |
| `/webhook/password-reset` | password-reset.json | Password reset |
| `/webhook/user/purpose` | save-user-purpose.json | Save user purpose |
| `/webhook/twitter/oauth/connect` | twitter-oauth-connect.json | Start Twitter OAuth |
| `/webhook/twitter/oauth/callback` | twitter-oauth-callback.json | OAuth callback |
| `/webhook/twitter/my-posts/:id` | twitter-get-my-posts.json | Get user tweets |
| `/webhook/twitter/post-tweet` | twitter-post-tweet.json | Post new tweet |
| `/webhook/twitter/delete-tweet` | twitter-delete-tweet.json | Delete tweet |
| `/webhook/get-scans` | get-all-scans.json | List all scans |
| `/webhook/get-scan/:id` | get-scan-by-id.json | Get scan details |
| `/webhook/twitter-reputation-scan` | opus-orchestration-twitter-reputation.json | Create scan |
| `/webhook/dashboard-stats` | dashboard-stats.json | Dashboard statistics |

---

## Quick Commands

```bash
# Import workflows
./scripts/import-n8n-workflows.sh YOUR_API_KEY

# Activate all workflows
./scripts/activate-all-workflows.sh YOUR_API_KEY

# Test a webhook
curl -X POST https://ntf.repazoo.com/webhook/dashboard-stats \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test"}'

# Check n8n logs
docker logs repazoo-n8n --tail 50 -f

# Restart n8n
docker-compose -f docker-compose.production.yml restart n8n
```

---

## What's Next?

After setup is complete:
1. ✅ Frontend at `dash.repazoo.com` will call n8n webhooks
2. ✅ n8n orchestrates all business logic
3. ✅ Ollama provides AI analysis
4. ✅ PostgreSQL stores all data
5. ✅ FastAPI handles OAuth callbacks

**Everything connected via open-source configuration!** 🎉
