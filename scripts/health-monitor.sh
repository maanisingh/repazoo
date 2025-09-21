#!/bin/bash

# RepAZoo Service Health Monitor & Auto-Recovery
# Monitors all critical services and automatically restarts if needed

LOG_FILE="/var/log/repazoo-health.log"
SERVICES_STATUS=()

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_service() {
    local service_name=$1
    local port=$2
    local fallback_port=$3

    if nc -z localhost $port > /dev/null 2>&1; then
        log "✅ $service_name (port $port) - HEALTHY"
        return 0
    elif [ ! -z "$fallback_port" ] && nc -z localhost $fallback_port > /dev/null 2>&1; then
        log "⚠️  $service_name (fallback port $fallback_port) - HEALTHY"
        return 0
    else
        log "❌ $service_name (port $port) - DOWN"
        return 1
    fi
}

restart_service() {
    local service_name=$1
    local restart_command=$2

    log "🔄 Attempting to restart $service_name..."
    eval "$restart_command"
    sleep 10
    log "✅ $service_name restart initiated"
}

# Check PostgreSQL
if ! check_service "PostgreSQL" 5432; then
    restart_service "PostgreSQL" "sudo systemctl restart postgresql"
fi

# Check RepAZoo App (with fallback)
if ! check_service "RepAZoo App" 3000 3002; then
    log "🔄 Starting RepAZoo fallback on port 3002..."
    cd /root/repazoo && PORT=3002 npm run dev > /dev/null 2>&1 &
fi

# Check Temporal Server
if ! check_service "Temporal Server" 8233; then
    restart_service "Temporal Server" "cd /root/repazoo && /root/.temporalio/bin/temporal server start-dev --ui-port 8233 > /dev/null 2>&1 &"
fi

# Check Grafana
if ! check_service "Grafana" 3001; then
    restart_service "Grafana" "sudo systemctl restart grafana-server"
fi

# Check Nginx
if ! systemctl is-active --quiet nginx; then
    log "❌ Nginx - DOWN"
    restart_service "Nginx" "sudo systemctl restart nginx"
else
    log "✅ Nginx - HEALTHY"
fi

# Health summary
log "📊 Health check completed - $(date)"
log "======================================"