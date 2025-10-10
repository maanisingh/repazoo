#!/bin/bash

# Repazoo Backend API - Development Quick Start
# This script starts both the API server and workers in development mode

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting Repazoo Code-First Backend (Development Mode)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Check if Redis is running
echo ""
echo "🔍 Checking Redis connection..."
if ! redis-cli ping > /dev/null 2>&1; then
  echo "❌ Redis is not running!"
  echo "   Start Redis with: docker start redis"
  echo "   Or: redis-server"
  exit 1
fi
echo "✅ Redis is running"

# Check if PostgreSQL is accessible
echo ""
echo "🔍 Checking PostgreSQL connection..."
if ! PGPASSWORD=repuzoo_secure_pass_2024 psql -h localhost -U postgres -d repazoo -c "SELECT 1" > /dev/null 2>&1; then
  echo "❌ PostgreSQL is not accessible!"
  echo "   Check connection: psql -h localhost -U postgres -d repazoo"
  exit 1
fi
echo "✅ PostgreSQL is accessible"

# Check .env file
echo ""
echo "🔍 Checking environment configuration..."
if [ ! -f ".env" ]; then
  echo "❌ .env file not found!"
  echo "   Copy .env.example to .env and configure it"
  exit 1
fi
echo "✅ .env file exists"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Starting Services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start API server and workers in parallel
trap 'kill $(jobs -p) 2>/dev/null' EXIT

echo ""
echo "🌐 Starting API Server on port 3001..."
npm run dev &
API_PID=$!

sleep 2

echo ""
echo "🔄 Starting BullMQ Workers..."
npm run start:workers &
WORKERS_PID=$!

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Repazoo Backend Running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 API Server:     http://localhost:3001"
echo "📍 Health Check:   http://localhost:3001/health"
echo "📍 Workers:        Running in background"
echo ""
echo "📚 API Endpoints:"
echo "   POST /api/auth/register"
echo "   POST /api/auth/login"
echo "   POST /api/twitter/oauth/connect"
echo "   POST /api/scans/create"
echo "   GET  /api/scans/:scan_id"
echo ""
echo "🔧 Backward Compatible:"
echo "   /webhook/* → /api/* (automatic redirect)"
echo ""
echo "Press Ctrl+C to stop all services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Wait for processes
wait
