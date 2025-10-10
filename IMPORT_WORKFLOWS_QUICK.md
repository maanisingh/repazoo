# Quick Workflow Import Guide

## You have PostgreSQL credential configured ✅

Now import the 4 workflows:

## Fast Import Method:

### 1. Open n8n
- URL: https://wf.repazoo.com
- Already logged in with your API key

### 2. Import Each Workflow (2 minutes each)

For each file:
1. Click **"+"** (Add workflow)
2. Click **"Import from File"**
3. Click **"Select file"** or **"From Text"**
4. Copy entire JSON from files below
5. **Important:** Toggle "Active" ON
6. Click "Save"

### Files to Import:

**Location:** `/root/repazoo/n8n/workflows/`

1. ✅ `opus-orchestration-native-ai-agent.json` - **MAIN AI WORKFLOW**
2. ✅ `get-all-scans.json` - Dashboard data
3. ✅ `get-scan-by-id.json` - Scan details
4. ✅ `dashboard-stats.json` - Statistics

### 3. Verify

After importing all 4:
- Go to "Workflows" tab
- Should see 4 workflows
- All should show "Active" (green)

### 4. Test Immediately

```bash
# Test if workflows are working
curl https://ntf.repazoo.com/webhook/dashboard-stats

# Should return:
# {"success":true,"stats":{"total_scans":0,"today_scans":0,"average_risk_score":0,"high_risk_accounts":0}}
```

---

## Alternative: Direct File Access

If you can access the server files directly in n8n UI:

The JSON files are at:
- `/root/repazoo/n8n/workflows/opus-orchestration-native-ai-agent.json`
- `/root/repazoo/n8n/workflows/get-all-scans.json`
- `/root/repazoo/n8n/workflows/get-scan-by-id.json`
- `/root/repazoo/n8n/workflows/dashboard-stats.json`

You can copy-paste the content directly into n8n's "Import from Text" option.

---

**Total time: ~8 minutes for all 4 workflows**

Once done, tell me and I'll:
1. Test all endpoints
2. Run a full reputation scan
3. Build the dashboard pages
