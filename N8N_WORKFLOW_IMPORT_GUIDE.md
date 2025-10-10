# n8n Workflow Import Guide

## 🔐 Access n8n

**URL:** https://wf.repazoo.com
**Username:** admin
**Password:** repazoo_n8n_2024

## 📦 Workflows to Import

All workflow files are located in: `/root/repazoo/n8n/workflows/`

### **1. Opus Orchestration (Main AI Analysis)**
**File:** `opus-orchestration-native-ai-agent.json`
**Webhook:** `POST /webhook/twitter-reputation-scan`
**Purpose:** Analyze Twitter accounts using AI Agent + 5 specialist tools

### **2. Get All Scans**
**File:** `get-all-scans.json`
**Webhook:** `GET /webhook/get-scans`
**Purpose:** Retrieve all reputation scans from database

### **3. Get Scan By ID**
**File:** `get-scan-by-id.json`
**Webhook:** `GET /webhook/get-scan/:scanId`
**Purpose:** Get detailed information for a specific scan

### **4. Dashboard Stats**
**File:** `dashboard-stats.json`
**Webhook:** `GET /webhook/dashboard-stats`
**Purpose:** Get statistics for dashboard overview (total scans, today's scans, avg risk, high-risk count)

## 📝 Import Steps

For each workflow:

1. **Open n8n UI**
   - Go to https://wf.repazoo.com
   - Login with credentials above

2. **Import Workflow**
   - Click "Add workflow" (+ button) in top-right
   - Click "Import from File"
   - Select the JSON file
   - Click "Import"

3. **Configure PostgreSQL Credentials** (first time only)
   - Click on any PostgreSQL node
   - Click "Credential to connect with" dropdown
   - Click "Create New Credential"
   - Fill in:
     - **Host:** postgres
     - **Database:** postgres
     - **User:** postgres
     - **Password:** repuzoo_secure_pass_2024
     - **Port:** 5432
   - Click "Save"
   - Name it: "Repazoo PostgreSQL"

4. **Activate Workflow**
   - Toggle "Active" switch in top-right
   - Workflow is now live!

5. **Test Webhook**
   - Copy webhook URL from the Webhook node
   - Test with curl or browser

## 🧪 Testing Workflows

### **Test Opus Orchestration:**
```bash
curl -X POST https://ntf.repazoo.com/webhook/twitter-reputation-scan \
  -H "Content-Type: application/json" \
  -d '{
    "twitter_handle": "@elonmusk",
    "user_id": "1",
    "scan_id": "test_001"
  }'
```

### **Test Get All Scans:**
```bash
curl https://ntf.repazoo.com/webhook/get-scans
```

### **Test Get Scan By ID:**
```bash
curl https://ntf.repazoo.com/webhook/get-scan/test_001
```

### **Test Dashboard Stats:**
```bash
curl https://ntf.repazoo.com/webhook/dashboard-stats
```

## ✅ Verification

After importing all workflows:

1. Go to "Workflows" tab in n8n
2. You should see 4 workflows
3. All should show "Active" status
4. Test each webhook endpoint
5. Check "Executions" tab to see results

## 🔧 Troubleshooting

### **Webhook not responding:**
- Check if workflow is Active
- Verify Webhook URL in node settings
- Check n8n logs: `docker logs repazoo-n8n`

### **Database connection error:**
- Verify PostgreSQL credentials
- Check postgres container is running: `docker ps | grep postgres`
- Test connection: `docker exec repazoo-postgres psql -U postgres -c "SELECT 1"`

### **AI Agent not working:**
- Check Ollama is running: `docker ps | grep ollama`
- Verify models are loaded: `docker exec repazoo-ollama ollama list`
- Check Ollama URL in AI Agent node: `http://ollama:11434`

## 📊 Database Table

The `reputation_reports` table is already created with this schema:

```sql
CREATE TABLE reputation_reports (
    id SERIAL PRIMARY KEY,
    scan_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    twitter_handle VARCHAR(255) NOT NULL,
    analysis_result JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    error_message TEXT
);
```

## 🎯 Next Steps

After importing workflows:
1. Test all endpoints
2. Insert sample data to test dashboard
3. Build dashboard UI to consume these APIs
4. Configure Open WebUI with user credentials
