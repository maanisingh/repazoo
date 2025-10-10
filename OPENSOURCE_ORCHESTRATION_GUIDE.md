# 🎯 REPAZOO OPEN-SOURCE ORCHESTRATION ARCHITECTURE

## Philosophy: Zero Custom Code, 100% Open Source Config

**Goal:** Use existing open-source tools with configuration only - no custom code, no black boxes, all transparent and debuggable.

---

## 🏗️ Architecture Stack

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND: Shadcn Dashboard (React + TypeScript)        │
│  - Location: /root/repazoo/frontend                     │
│  - Build: Vite production build                         │
│  - Served by: Caddy at dash.repazoo.com                 │
└─────────────────────────────────────────────────────────┘
                           ↓ HTTP Requests
┌─────────────────────────────────────────────────────────┐
│  ORCHESTRATION: n8n Workflows (Visual Automation)       │
│  - Location: /root/repazoo/n8n/workflows/*.json         │
│  - URL: wf.repazoo.com (management)                     │
│  - Webhooks: ntf.repazoo.com                            │
│  - 15 Pre-built Workflows Ready                         │
└─────────────────────────────────────────────────────────┘
                           ↓ Calls Services
┌──────────────────┬──────────────────┬──────────────────┐
│  AI AGENTS       │  DATA STORAGE    │  BACKEND APIs    │
│  Flowise + n8n   │  PostgreSQL      │  FastAPI         │
│  Ollama LLMs     │  Redis Cache     │  (Minimal)       │
│  LangChain       │  Supabase        │                  │
└──────────────────┴──────────────────┴──────────────────┘
```

---

## 📦 Existing n8n Workflows (Ready to Import)

### Authentication & User Management
1. **user-registration.json** - `/webhook/register`
2. **user-login.json** - `/webhook/login`
3. **password-reset.json** - `/webhook/password-reset`
4. **save-user-purpose.json** - `/webhook/user/purpose`

### Twitter Integration
5. **twitter-oauth-connect.json** - `/webhook/twitter/oauth/connect`
6. **twitter-oauth-callback.json** - `/webhook/twitter/oauth/callback`
7. **twitter-get-my-posts.json** - `/webhook/twitter/my-posts/:id`
8. **twitter-post-tweet.json** - `/webhook/twitter/post-tweet`
9. **twitter-delete-tweet.json** - `/webhook/twitter/delete-tweet`

### Reputation Scans
10. **get-all-scans.json** - `/webhook/get-scans`
11. **get-scan-by-id.json** - `/webhook/get-scan/:id`
12. **opus-orchestration-twitter-reputation.json** - `/webhook/twitter-reputation-scan`
13. **opus-orchestration-native-ai-agent.json** - AI Agent orchestration

### Dashboard
14. **dashboard-stats.json** - `/webhook/dashboard-stats`

---

## 🎯 Why This Approach Is Better

### Traditional Custom Code Approach ❌
```python
# Custom Python API endpoint - BLACK BOX
@router.post("/api/scans")
async def create_scan(data: ScanRequest):
    # 100+ lines of custom logic
    # Hard to debug
    # Requires code deployment
    # No visual workflow
    # Testing requires code changes
```

### Open Source Orchestration ✅
```
n8n Visual Workflow - TRANSPARENT
┌─────────────────────────────────────┐
│ [Webhook Trigger]                   │ ← Visible entry point
│         ↓                            │
│ [Validate Input]                    │ ← See validation logic
│         ↓                            │
│ [Check Quota in PostgreSQL]         │ ← Database query visible
│         ↓                            │
│ [Call FastAPI Backend]              │ ← API call visible
│         ↓                            │
│ [Trigger AI Analysis (Flowise)]    │ ← AI orchestration visible
│         ↓                            │
│ [Save to Database]                  │ ← Data persistence visible
│         ↓                            │
│ [Return Response]                   │ ← Response format visible
└─────────────────────────────────────┘
```

**Benefits:**
- ✅ **Visual Debugging** - See every step in n8n UI
- ✅ **No Code Deployment** - Change workflows in UI, instant updates
- ✅ **Version Control** - JSON files in git
- ✅ **Execution History** - Every run logged with data
- ✅ **Error Handling** - Visual error paths
- ✅ **Testing** - Run workflows manually with test data
- ✅ **No Black Boxes** - Everything visible and configurable

---

## 🚀 Setup Instructions

### Step 1: Access n8n
```bash
URL: https://wf.repazoo.com
Username: admin
Password: repazoo_n8n_2024
```

### Step 2: Import All Workflows

**Option A: Import Individually**
1. In n8n UI: Click "Workflows" → "Import from File"
2. Select each JSON file from `/root/repazoo/n8n/workflows/`
3. Click "Save" for each workflow
4. Toggle each workflow to "Active"

**Option B: Bulk Import (Recommended)**
```bash
# Copy workflows to n8n container
docker cp /root/repazoo/n8n/workflows/ repazoo-n8n:/data/workflows/

# Restart n8n to load workflows
docker-compose -f docker-compose.production.yml restart n8n
```

### Step 3: Configure Workflow Credentials

Each workflow needs these credentials (set once in n8n UI):

**PostgreSQL Connection:**
- Host: `postgres`
- Port: `5432`
- Database: `postgres`
- User: `postgres`
- Password: From `/root/repazoo/.env`

**FastAPI Backend:**
- Base URL: `http://api:8000`
- Auth: None (internal network)

**Ollama LLM:**
- Base URL: `http://ollama:11434`
- Model: `llama3:8b`

**Flowise API:**
- Base URL: `http://flowise:3000`
- API Key: Set in n8n credentials

### Step 4: Activate All Workflows

In n8n UI, toggle each workflow to "Active" (green switch in top-right)

### Step 5: Update Frontend to Use n8n Webhooks

The frontend is already configured to call n8n webhooks!

**Frontend API Client:** `/root/repazoo/frontend/src/lib/api/n8n-client.ts`
```typescript
const N8N_WEBHOOK_BASE = 'https://ntf.repazoo.com/webhook';
```

**No changes needed!** The frontend already uses the correct architecture.

---

## 🔄 Data Flow Examples

### Example 1: User Creates Scan

```
1. User clicks "New Scan" in dashboard
   ↓
2. Frontend POST https://ntf.repazoo.com/webhook/twitter-reputation-scan
   Body: { twitter_handle: "@elonmusk", user_id: "123" }
   ↓
3. n8n Workflow "opus-orchestration-twitter-reputation.json" triggers
   ↓
4. n8n validates input and checks user quota
   ↓
5. n8n calls FastAPI: POST http://api:8000/api/analyze
   ↓
6. FastAPI fetches Twitter data using OAuth tokens
   ↓
7. n8n triggers Flowise AI Agent for analysis
   ↓
8. Flowise uses Ollama (Llama3) + LangChain tools
   ↓
9. AI Agent orchestrates 5 specialist tools:
   - Sentiment Analysis
   - Toxicity Detection
   - Hate Speech Detection
   - Risk Assessment
   - Compliance Monitor
   ↓
10. n8n saves analysis result to PostgreSQL
    ↓
11. n8n returns response to frontend
    ↓
12. Dashboard displays risk score and findings
```

**Key Points:**
- Every step is visible in n8n execution history
- Can test each step individually
- Can modify logic in n8n UI without code changes
- Errors show exactly where they occurred

---

### Example 2: User Logs In

```
1. User enters email/password in sign-in form
   ↓
2. Frontend POST https://ntf.repazoo.com/webhook/login
   ↓
3. n8n Workflow "user-login.json" triggers
   ↓
4. n8n queries PostgreSQL for user credentials
   ↓
5. n8n validates password (bcrypt via PostgreSQL function)
   ↓
6. n8n generates JWT token
   ↓
7. n8n returns { token, user_info } to frontend
   ↓
8. Frontend stores token and redirects to dashboard
```

---

## 🎨 Open-Source Stack Roles

### 1. **n8n** - Primary Orchestrator
**Purpose:** Visual workflow automation, replaces custom API endpoints

**What it does:**
- Receives webhook requests from frontend
- Orchestrates calls to multiple services
- Handles business logic visually
- Manages data flow between components
- Provides execution history and debugging

**Why use it:**
- No code deployment needed
- Visual debugging
- Built-in error handling
- Webhook management
- PostgreSQL, Redis, HTTP nodes included

---

### 2. **Flowise** - AI Agent Builder
**Purpose:** Visual LangChain orchestration

**What it does:**
- Creates AI agent chatflows
- Connects to Ollama LLMs
- Manages vector stores and memory
- Provides agent tools and chains
- Visual prompt engineering

**Why use it:**
- Drag-and-drop AI agent creation
- No Python code for LangChain
- Built-in agent types (conversational, ReAct, etc.)
- API endpoint generation
- Execution monitoring

---

### 3. **Ollama** - Local LLM Runtime
**Purpose:** Run open-source LLMs locally

**What it does:**
- Runs Llama3, Mistral, etc. locally
- Provides OpenAI-compatible API
- GPU acceleration (if available)
- Model management

**Why use it:**
- No API costs
- Data privacy (local processing)
- Fast inference
- Multiple model support

---

### 4. **PostgreSQL (Supabase)** - Database
**Purpose:** Data persistence and authentication

**What it does:**
- Stores users, scans, analyses
- Row-level security (RLS)
- Built-in encryption functions
- Full-text search

**Why use it:**
- Open-source
- Supabase-compatible
- ACID compliance
- Advanced features (JSONB, extensions)

---

### 5. **FastAPI** - Minimal Backend
**Purpose:** Twitter OAuth, external API integrations

**What it does:**
- Twitter OAuth flow (PKCE)
- Stripe webhook handling
- Direct API endpoints (minimal)

**Why minimal:**
- Most logic in n8n workflows
- Only used for OAuth callbacks
- Stripe webhooks need HTTPS endpoint
- External integrations that n8n can't handle

---

### 6. **Caddy** - Reverse Proxy
**Purpose:** SSL termination, routing

**What it does:**
- Auto SSL certificates
- Routes domains to services
- Serves static frontend

**Why use it:**
- Zero-config HTTPS
- Simple Caddyfile configuration
- Automatic cert renewal

---

## 🔧 Configuration Files

### Current Setup (✅ Ready)

1. **n8n Workflows** - `/root/repazoo/n8n/workflows/*.json`
   - 15 workflows pre-configured
   - Ready to import

2. **Caddyfile** - `/root/repazoo/Caddyfile`
   - Routes configured for all domains
   - SSL enabled

3. **Docker Compose** - `/root/repazoo/docker-compose.production.yml`
   - All services configured
   - Network, volumes, health checks

4. **Environment** - `/root/repazoo/.env`
   - Backend credentials configured
   - Database URLs set

### Missing Configuration (⚠️ To Add)

1. **n8n Credentials** - Set in n8n UI after import
   - PostgreSQL connection
   - Ollama connection
   - Flowise API key

2. **API Keys** - Update in `/root/repazoo/.env`
   - `STRIPE_API_KEY` (currently placeholder)
   - `ANTHROPIC_API_KEY` (currently placeholder)

3. **Frontend Environment** - `/root/repazoo/frontend/.env`
   - Already created with n8n webhook URLs
   - Points to `ntf.repazoo.com/webhook` ✅

---

## 📊 Monitoring & Debugging

### View n8n Executions
1. Go to https://wf.repazoo.com
2. Click "Executions" tab
3. See all workflow runs with timestamps
4. Click any execution to see:
   - Input data
   - Each node's output
   - Errors (if any)
   - Execution time

### Test Workflows Manually
1. Open workflow in n8n
2. Click "Execute Workflow" button
3. Provide test data
4. See results immediately
5. Debug visually

### Check Service Health
```bash
# All containers
docker ps

# n8n logs
docker logs repazoo-n8n --tail 50

# Ollama logs
docker logs repazoo-ollama --tail 50

# Flowise logs
docker logs repazoo-flowise --tail 50
```

---

## 🎓 Learning Resources

### n8n Documentation
- https://docs.n8n.io
- https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/

### Flowise Documentation
- https://docs.flowiseai.com
- https://github.com/FlowiseAI/Flowise

### Ollama Models
- https://ollama.com/library
- https://github.com/ollama/ollama

---

## ✨ Why This Architecture Wins

### vs Custom Python API
| Feature | Custom Code | n8n Orchestration |
|---------|-------------|-------------------|
| Deployment | Code push required | UI change, instant |
| Debugging | Log files, print statements | Visual execution history |
| Testing | Unit tests, pytest | Manual execution in UI |
| Modifications | Code + tests + PR + deploy | Edit workflow, save, done |
| Visibility | Code inspection | Visual graph |
| Error Handling | Try/catch blocks | Visual error paths |
| Onboarding | Read codebase | See visual workflows |

### vs Traditional Microservices
| Feature | Microservices | n8n + Open Source |
|---------|--------------|-------------------|
| Complexity | High (many services) | Medium (fewer services) |
| Orchestration | Custom code | Visual workflows |
| Service Discovery | Required | Docker networking |
| API Gateway | Custom | n8n webhooks |
| Monitoring | APM tools | n8n execution history |

---

## 🚦 Current Status

### ✅ Ready
- All 15 n8n workflows created
- Docker Compose configured
- Services running (n8n, Ollama, Flowise, PostgreSQL, Caddy)
- Frontend built and served
- Domains configured

### 🟡 Configuration Needed
- Import workflows into n8n UI
- Activate workflows
- Set credentials in n8n
- Update placeholder API keys

### ⏳ Future Enhancements
- Add more AI agent workflows in Flowise
- Create custom LangChain tools
- Add more Ollama models
- Build custom n8n nodes (if needed)

---

## 🎯 Next Steps

1. **Import all n8n workflows** (5 minutes)
2. **Set credentials in n8n** (10 minutes)
3. **Activate workflows** (2 minutes)
4. **Test one workflow** (5 minutes)
5. **Verify frontend connection** (5 minutes)

**Total setup time: ~30 minutes**

---

## 🤝 Philosophy Summary

**"Configuration Over Code"**
- Visual workflows > Custom Python code
- Open-source tools > Black-box services
- Transparent > Hidden logic
- Debuggable > Mysterious failures
- Fast iteration > Slow deployments

**Result:** A fully functional SaaS platform built entirely with open-source configuration - no custom black-box code!