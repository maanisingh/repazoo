# 🤖 OPUS ORCHESTRATION - NATIVE n8n AI AGENTS

## ✅ THE BETTER SOLUTION

Instead of using LiteLLM (which has database dependencies and complexity), we're using **n8n's built-in AI Agent orchestration** - which is:

- ✅ **Native** - Built into n8n, no extra services needed
- ✅ **Simple** - Direct Ollama integration
- ✅ **Powerful** - Uses LangChain under the hood
- ✅ **Visual** - Configure everything in n8n UI
- ✅ **Proven** - Recommended by n8n for local AI workflows

---

## 🏗️ NEW ARCHITECTURE

```
User Request → n8n Webhook
    ↓
Fetch Twitter Data (FastAPI)
    ↓
┌──────────────────────────────────────────────┐
│  n8n AI Agent Node (Opus Orchestrator)       │
│  Connected to: Ollama Llama3:8b              │
│                                              │
│  Has 5 Tool Nodes (Specialist Agents):       │
│  1. Sentiment Analysis Tool                  │
│  2. Toxicity Detection Tool                  │
│  3. Hate Speech Detection Tool               │
│  4. Risk Assessment Tool                     │
│  5. Compliance Monitor Tool                  │
│                                              │
│  The AI Agent automatically:                 │
│  - Decides which tools to use                │
│  - Executes them in optimal order            │
│  - Combines results into final analysis      │
└──────────────────────────────────────────────┘
    ↓
Save to PostgreSQL
    ↓
Return JSON Response
```

---

## 🎯 HOW IT WORKS

### **1. n8n AI Agent Node**
- Acts as the "Opus Orchestrator"
- Connected to Ollama (Llama3:8b locally)
- Has a system prompt defining its role
- Automatically uses tools as needed

### **2. Tool Nodes (The 5 Specialists)**
Each tool is a separate workflow node that the AI Agent can call:
- **Sentiment Analysis**: Calculates positive/neutral/negative percentages
- **Toxicity Detection**: Scores offensive content 0-100
- **Hate Speech Detection**: Flags discrimination and hate speech
- **Risk Assessment**: Determines overall reputation risk level
- **Compliance Monitor**: Checks policy violations

### **3. The Agent Decides**
Unlike hardcoded workflows, the AI Agent:
- Reads the Twitter data
- **Autonomously decides** which tools to use
- Calls them in the best order
- Combines results intelligently
- Returns comprehensive analysis

---

## 🔧 SERVICES NEEDED

### **Running:**
- ✅ **n8n** - Workflow platform with AI Agent nodes
- ✅ **Ollama** - Local LLM runtime (Llama3:8b, Mistral:7b)
- ✅ **PostgreSQL** - Data storage
- ✅ **FastAPI** - Twitter OAuth & data API
- ✅ **Caddy** - Reverse proxy with SSL

### **NOT Needed:**
- ❌ LiteLLM (too complex, database issues)
- ❌ Flowise (redundant with n8n AI Agents)
- ❌ Extra orchestration layers

---

## 📋 SETUP STEPS

### **1. Access n8n**
```
URL: https://wf.repazoo.com
Username: admin
Password: repazoo_n8n_2024
```

### **2. Import the Workflow**
1. Click "Add workflow" → "Import from File"
2. Select: `/root/repazoo/n8n/workflows/opus-orchestration-native-ai-agent.json`
3. The workflow will appear with all nodes configured

### **3. Configure Ollama Connection**
The "Ollama: Llama3 8B" node is already configured to:
- Model: `llama3:8b`
- Base URL: `http://ollama:11434`
- Temperature: 0.7

### **4. Activate the Workflow**
1. Click the toggle in top-right to "Active"
2. The webhook will be live at: `https://ntf.repazoo.com/webhook/twitter-reputation-scan`

---

## 🚀 TESTING

### **Trigger the Analysis:**
```bash
curl -X POST https://ntf.repazoo.com/webhook/twitter-reputation-scan \
  -H "Content-Type: application/json" \
  -d '{
    "twitter_handle": "@elonmusk",
    "user_id": "1",
    "scan_id": "test_001"
  }'
```

### **Expected Response:**
```json
{
  "status": "success",
  "scan_id": "test_001",
  "result": {
    "overall_score": 75,
    "risk_level": "medium",
    "sentiment": {
      "positive": 45,
      "neutral": 30,
      "negative": 25
    },
    "toxicity_score": 15,
    "hate_speech_detected": false,
    "key_findings": [
      "Mostly positive engagement",
      "Some controversial topics discussed"
    ],
    "recommendations": [
      "Monitor tone in controversial discussions",
      "Maintain current engagement level"
    ]
  }
}
```

---

## 🎨 CUSTOMIZATION

### **Change the AI Model:**
In n8n, click "Ollama: Llama3 8B" node:
- Change model to: `mistral:7b` or `llama3.1:70b`
- Adjust temperature for creativity (0.1 = focused, 0.9 = creative)

### **Modify System Prompt:**
In "Opus: Master Orchestrator" node options:
- Edit the system message to change behavior
- Add more context or constraints
- Define output format

### **Add More Tools:**
1. Create new Tool Workflow node
2. Connect it to the AI Agent
3. The agent will automatically discover and use it

---

## 📊 WHY THIS IS BETTER

### **vs LiteLLM:**
| Feature | n8n AI Agent | LiteLLM |
|---------|-------------|---------|
| Setup Complexity | Low | High |
| Database Required | No | Yes |
| Visual Configuration | Yes | No |
| Tool Orchestration | Automatic | Manual |
| Updates | UI-based | Code changes |
| Debugging | Visual graph | Log diving |

### **vs Custom Code:**
- ✅ No Python dependencies
- ✅ No code deployment
- ✅ Visual debugging
- ✅ Instant changes (no restart)
- ✅ Version control built-in

---

## 🔍 MONITORING

### **View Executions:**
1. Go to https://wf.repazoo.com
2. Click "Executions" tab
3. See every workflow run with full data

### **Debug Issues:**
- Click any execution to see node-by-node data
- Red nodes = errors (click to see details)
- Green nodes = success (click to see output)

### **Check Ollama:**
```bash
# See available models
docker exec repazoo-ollama ollama list

# Test model directly
docker exec repazoo-ollama ollama run llama3:8b "Say hi"
```

---

## ✨ KEY ADVANTAGES

### **1. Autonomous Decision Making**
The AI Agent **decides** which tools to use based on the data, not hardcoded logic.

### **2. Natural Language Tools**
Tools are described in plain English - the agent understands what they do.

### **3. No Code Changes**
Modify prompts, add tools, change models - all in the UI, no deployment needed.

### **4. Built-in LangChain**
n8n uses LangChain internally, giving you:
- Memory management
- Chain of thought reasoning
- Tool calling patterns
- Error handling

### **5. Production Ready**
- SSL secured (https://wf.repazoo.com)
- Database persistence
- Execution history
- Error retry logic
- Webhook authentication

---

## 🎓 LEARN MORE

### **n8n AI Agent Docs:**
- https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/
- https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmollama/

### **n8n + Ollama Workflows:**
- https://n8n.io/workflows/?tags=ollama
- https://n8n.io/workflows/2931-ai-agent-with-ollama-for-current-weather-and-wiki/

### **Ollama Models:**
- https://ollama.com/library

---

## 🎉 SUMMARY

**We replaced:**
- Complex LiteLLM gateway
- Manual workflow coordination
- Hardcoded agent logic

**With:**
- Native n8n AI Agent nodes
- Direct Ollama integration
- Autonomous tool orchestration

**Result:**
- ✅ Simpler architecture
- ✅ More powerful AI orchestration
- ✅ Easier to maintain and modify
- ✅ Visual workflow management
- ✅ Production-ready immediately

**The Opus orchestrator is now a smart AI Agent that autonomously coordinates 5 specialist tools to analyze Twitter reputation!**

---

**Ready to use at:** https://wf.repazoo.com
**Webhook endpoint:** https://ntf.repazoo.com/webhook/twitter-reputation-scan
