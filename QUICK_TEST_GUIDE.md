# QUICK TEST GUIDE - Repazoo Final Deployment

## 🚀 Quick Start (5 Minutes)

### Step 1: Verify Services Running
```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(repazoo|ollama)"
```
**Expected:** All containers should be "Up"

---

### Step 2: Check Database
```bash
# Verify reputation_reports table exists
docker exec -i repazoo-postgres psql -U postgres -d postgres -c "\d public.reputation_reports" | head -20
```
**Expected:** Table with columns: scan_id, user_id, twitter_handle, purpose, analysis_result, overall_score, risk_level, etc.

---

### Step 3: Test Ollama
```bash
curl -s -X POST http://ai.repazoo.com/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model": "llama3.2:3b", "prompt": "Say hello", "stream": false}' | jq -r '.response'
```
**Expected:** Ollama responds with a greeting

---

### Step 4: Access Supabase Studio
```bash
# Open in browser
google-chrome http://localhost:9010 &
# Or
firefox http://localhost:9010 &
```
**Expected:** Supabase Studio interface loads
**Action:** Navigate to "Table Editor" → "reputation_reports"

---

### Step 5: Update n8n Workflow (MANUAL - REQUIRED)

#### 5a. Open n8n UI
```bash
# Open in browser
google-chrome http://localhost:5678 &
```

#### 5b. Find Workflow
- Look for: "Opus Orchestration - Twitter Reputation Analysis"
- Or search for workflow ID: `uoIGlvXTHDU9ONpi`

#### 5c. Replace Workflow
1. Click on the workflow to open editor
2. Select all nodes (Ctrl+A)
3. Delete all nodes (Delete key)
4. Open: `/root/repazoo/n8n/workflows/opus-orchestration-fixed.json`
5. Copy the **nodes** and **connections** sections
6. Paste into n8n workflow editor
7. **Important:** Set Postgres credential for all Postgres nodes:
   - Credential: "Postgres account"
8. Click "Save"
9. Toggle "Active" switch ON

---

### Step 6: Run Test Scan
```bash
# Create a test scan
curl -X POST https://wf.repazoo.com/webhook/twitter-reputation-scan \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_demo_001",
    "scan_id": "test_scan_'$(date +%s)'",
    "purpose": "visa",
    "purpose_category": "visa"
  }' | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "scan_id": "test_scan_1234567890",
  "result": {
    "overall_score": 70,
    "risk_level": "medium",
    "sentiment": { "positive": 60, "neutral": 30, "negative": 10 },
    "toxicity_score": 20,
    "hate_speech_detected": false,
    "key_findings": ["..."],
    "recommendations": ["..."]
  }
}
```

---

### Step 7: Verify Data in Database
```bash
# Check if scan was saved
docker exec -i repazoo-postgres psql -U postgres -d postgres -c "SELECT scan_id, twitter_handle, purpose, risk_level, overall_score FROM public.reputation_reports ORDER BY created_at DESC LIMIT 5"
```
**Expected:** Your test scan appears in the list

---

### Step 8: Check Frontend Dashboard
```bash
# Access frontend
google-chrome http://localhost:3000 &
```

**Verify:**
1. Dashboard loads without errors
2. Stats cards show numbers (Total Scans, Today's Scans, etc.)
3. "Recent Scans" section shows your test scan
4. Purpose dropdown works (visa/student/employment/general/custom)

---

### Step 9: Verify Auto-Refresh
1. Leave Dashboard open
2. Run another test scan (use Step 6 command again with different scan_id)
3. Wait 30 seconds
4. Check if new scan appears in "Recent Scans" section

---

## 🎯 SUCCESS CHECKLIST

- [ ] All Docker containers running
- [ ] Database has reputation_reports table with correct schema
- [ ] Ollama responds to API requests
- [ ] Supabase Studio accessible at localhost:9010
- [ ] n8n workflow updated and activated
- [ ] Test scan completes successfully
- [ ] Scan data saved to database
- [ ] Frontend Dashboard loads
- [ ] Recent Scans shows real data
- [ ] Auto-refresh works (30 second interval)

---

## 🐛 TROUBLESHOOTING QUICK FIXES

### "No scans yet" in Dashboard
**Fix:** Run Step 6 (test scan) and wait 30 seconds

### Workflow fails at "Get Twitter Handle"
**Fix:** Add test Twitter account:
```bash
docker exec -i repazoo-postgres psql -U postgres -d postgres << 'EOF'
INSERT INTO public.twitter_accounts (user_id, twitter_user_id, twitter_username, access_token_encrypted, refresh_token_encrypted, token_expires_at, scopes, is_active)
VALUES (
  'user_demo_001'::uuid,
  'test123',
  'demo_user',
  'test'::bytea,
  'test'::bytea,
  NOW() + INTERVAL '1 year',
  ARRAY['read'],
  true
) ON CONFLICT (twitter_user_id) DO NOTHING;
EOF
```

### Ollama not responding
**Fix:**
```bash
docker restart ollama
sleep 10
curl http://ai.repazoo.com/api/tags
```

### Dashboard stats not loading
**Fix:**
```bash
# Test stats endpoint directly
curl https://wf.repazoo.com/webhook/dashboard-stats | jq .

# Check n8n logs
docker logs repazoo-n8n --tail 50
```

### Supabase Studio won't load
**Fix:**
```bash
docker restart repazoo-supabase-studio
sleep 5
curl -I http://localhost:9010
```

---

## 📊 TESTING DIFFERENT PURPOSES

### Visa Application Scan
```bash
curl -X POST https://wf.repazoo.com/webhook/twitter-reputation-scan \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_demo_001", "scan_id": "visa_test_'$(date +%s)'", "purpose": "visa", "purpose_category": "visa"}' | jq .
```

### Student Application Scan
```bash
curl -X POST https://wf.repazoo.com/webhook/twitter-reputation-scan \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_demo_001", "scan_id": "student_test_'$(date +%s)'", "purpose": "student", "purpose_category": "student"}' | jq .
```

### Employment Background Check Scan
```bash
curl -X POST https://wf.repazoo.com/webhook/twitter-reputation-scan \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_demo_001", "scan_id": "employment_test_'$(date +%s)'", "purpose": "employment", "purpose_category": "employment"}' | jq .
```

### General Reputation Scan
```bash
curl -X POST https://wf.repazoo.com/webhook/twitter-reputation-scan \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_demo_001", "scan_id": "general_test_'$(date +%s)'", "purpose": "general", "purpose_category": "general"}' | jq .
```

---

## 🔍 MONITORING COMMANDS

### Watch n8n Logs (Real-time)
```bash
docker logs repazoo-n8n --tail 100 -f
```

### Watch Ollama Logs (Real-time)
```bash
docker logs ollama --tail 100 -f
```

### Watch Database Queries (Real-time)
```bash
# Enable query logging (if not already enabled)
docker exec -i repazoo-postgres psql -U postgres -d postgres -c "ALTER SYSTEM SET log_statement = 'all'"
docker restart repazoo-postgres

# View logs
docker logs repazoo-postgres --tail 100 -f | grep -E "(INSERT|SELECT|UPDATE)"
```

### Check Recent Scans Count
```bash
watch -n 5 'docker exec -i repazoo-postgres psql -U postgres -d postgres -c "SELECT COUNT(*) as total_scans FROM public.reputation_reports"'
```

---

## 📝 VERIFICATION QUERIES

### View All Scans
```bash
docker exec -i repazoo-postgres psql -U postgres -d postgres -c "
SELECT
  scan_id,
  twitter_handle,
  purpose_category,
  risk_level,
  overall_score,
  created_at
FROM public.reputation_reports
ORDER BY created_at DESC
LIMIT 10
"
```

### View Stats (Same as Dashboard)
```bash
docker exec -i repazoo-postgres psql -U postgres -d postgres << 'EOF'
SELECT
  (SELECT COUNT(*) FROM reputation_reports) as total_scans,
  (SELECT COUNT(*) FROM reputation_reports WHERE DATE(created_at) = CURRENT_DATE) as today_scans,
  (SELECT ROUND(AVG(overall_score)) FROM reputation_reports WHERE overall_score IS NOT NULL) as avg_score,
  (SELECT COUNT(*) FROM reputation_reports WHERE risk_level IN ('high', 'critical')) as high_risk_count;
EOF
```

### View Purpose Distribution
```bash
docker exec -i repazoo-postgres psql -U postgres -d postgres -c "
SELECT
  purpose_category,
  COUNT(*) as count,
  ROUND(AVG(overall_score)) as avg_score
FROM public.reputation_reports
GROUP BY purpose_category
ORDER BY count DESC
"
```

---

## ⏱️ EXPECTED TIMING

- **Test Scan Duration:** 5-10 seconds
- **Dashboard Auto-Refresh:** Every 30 seconds
- **Ollama Response Time:** 3-5 seconds
- **Database Query Time:** < 100ms
- **Frontend Initial Load:** 1-2 seconds

---

## 🎉 SUCCESS!

If all steps above work:
✅ **Your deployment is fully functional!**

You now have:
- Working Ollama AI integration
- Real-time dashboard with actual scan data
- Purpose-based reputation analysis
- Direct PostgreSQL integration
- Supabase Studio for data inspection

---

**Total Test Time:** ~5-10 minutes
**Last Updated:** 2025-10-08
