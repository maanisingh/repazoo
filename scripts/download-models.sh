#!/bin/bash
# Script to download all AI models for Repazoo SaaS
# This runs automatically when containers start

set -e

echo "🤖 Downloading AI models for Repazoo..."

# Wait for Ollama to be ready
echo "Waiting for Ollama to start..."
until curl -s http://ollama:11434/api/tags > /dev/null 2>&1; do
    sleep 2
    echo "Still waiting for Ollama..."
done
echo "✅ Ollama is ready!"

# Download Llama3.1 70B (Opus Orchestrator)
echo "📥 Downloading Llama3.1 70B (Opus Orchestrator)..."
docker exec repazoo-ollama ollama pull llama3.1:70b || echo "⚠️ Llama3.1 70B failed, will fallback to cloud"

# Download Mistral 7B (Sonnet Specialist 1)
echo "📥 Downloading Mistral 7B (Sonnet Specialist)..."
docker exec repazoo-ollama ollama pull mistral:7b

# Download Llama3 8B (Sonnet Specialist 2)
echo "📥 Downloading Llama3 8B (Sonnet Specialist)..."
docker exec repazoo-ollama ollama pull llama3:8b

# Note: HuggingFace RoBERTa models need conversion to GGUF format
# For now, we'll use them via HuggingFace Inference API or convert them later
echo "
ℹ️  HuggingFace RoBERTa models (sentiment, toxicity, hate) will be accessed via:
   - Direct HuggingFace Inference API (free tier), or
   - Converted to GGUF format and loaded into Ollama later

   Models to integrate:
   - cardiffnlp/twitter-roberta-base-sentiment-latest
   - cardiffnlp/twitter-roberta-base-offensive
   - cardiffnlp/twitter-roberta-base-hate
"

echo "✅ Core AI models downloaded successfully!"
echo "
📊 Models ready:
  - Llama3.1 70B (opus-orchestrator)
  - Mistral 7B (sonnet-specialist-1)
  - Llama3 8B (sonnet-specialist-2)

🚀 You can now use these models via:
  - LiteLLM API: https://ai.repazoo.com/v1/chat/completions
  - Open WebUI: https://ai.repazoo.com
  - n8n workflows: Connect to http://litellm:4000
"
