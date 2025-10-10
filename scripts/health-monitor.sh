#!/bin/bash

# Repazoo Health Monitoring Script
# Runs every 5 minutes via cron to check system health
# Logs issues and sends alerts if needed

# Configuration
LOG_FILE="/var/log/repazoo_health.log"
ALERT_EMAIL="admin@repazoo.com"
BACKEND_URL="http://localhost:3000/api/health"
FRONTEND_CFY_URL="https://cfy.repazoo.com"
FRONTEND_NTF_URL="https://ntf.repazoo.com"
FRONTEND_PROD_URL="https://dash.repazoo.com"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "${LOG_FILE}"
}

# Function to send alert
send_alert() {
    local subject="$1"
    local message="$2"
    echo "$message" | mail -s "[REPAZOO ALERT] $subject" "${ALERT_EMAIL}" 2>/dev/null || true
    log_message "ALERT: $subject - $message"
}

# Check backend API health
check_backend() {
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}" || echo "000")

    if [ "$http_code" = "200" ]; then
        log_message "Backend health check: OK (HTTP $http_code)"
        return 0
    else
        log_message "Backend health check: FAILED (HTTP $http_code)"
        send_alert "Backend API Down" "Backend API health check failed with HTTP code: $http_code"

        # Attempt to restart
        log_message "Attempting to restart backend..."
        pm2 restart repazoo-backend-api
        sleep 5

        # Recheck
        http_code=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}" || echo "000")
        if [ "$http_code" = "200" ]; then
            log_message "Backend restarted successfully"
            send_alert "Backend Auto-Recovered" "Backend was down but has been automatically restarted and is now healthy"
        else
            send_alert "Backend Restart Failed" "Backend failed to restart. Manual intervention required!"
        fi
        return 1
    fi
}

# Check frontend accessibility
check_frontend() {
    local env_name="$1"
    local url="$2"
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "${url}" || echo "000")

    if [ "$http_code" = "200" ]; then
        log_message "Frontend ${env_name} check: OK (HTTP $http_code)"
        return 0
    else
        log_message "Frontend ${env_name} check: FAILED (HTTP $http_code)"
        send_alert "Frontend ${env_name} Unreachable" "Frontend ${env_name} (${url}) returned HTTP ${http_code}"
        return 1
    fi
}

# Check PM2 process status
check_pm2_status() {
    local status=$(pm2 jlist | jq -r '.[] | select(.name=="repazoo-backend-api") | .pm2_env.status' 2>/dev/null || echo "unknown")

    if [ "$status" = "online" ]; then
        log_message "PM2 process status: Online"
        return 0
    else
        log_message "PM2 process status: $status (Expected: online)"
        send_alert "PM2 Process Not Online" "Backend PM2 process status is: $status"
        return 1
    fi
}

# Check database connectivity
check_database() {
    export PGPASSWORD="repuzoo_secure_pass_2024"
    local db_check=$(psql -h localhost -U postgres -d repazoo -t -c "SELECT 1" 2>/dev/null | tr -d ' ' || echo "0")
    unset PGPASSWORD

    if [ "$db_check" = "1" ]; then
        log_message "Database check: OK"
        return 0
    else
        log_message "Database check: FAILED"
        send_alert "Database Connection Failed" "Cannot connect to PostgreSQL database"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    local disk_usage=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')

    if [ "$disk_usage" -lt 80 ]; then
        log_message "Disk space: ${disk_usage}% used (OK)"
        return 0
    elif [ "$disk_usage" -lt 90 ]; then
        log_message "Disk space: ${disk_usage}% used (WARNING)"
        send_alert "Disk Space Warning" "Disk usage is at ${disk_usage}%"
        return 1
    else
        log_message "Disk space: ${disk_usage}% used (CRITICAL)"
        send_alert "Disk Space Critical" "Disk usage is at ${disk_usage}%. Immediate action required!"
        return 1
    fi
}

# Check memory usage
check_memory() {
    local mem_usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100)}')

    if [ "$mem_usage" -lt 90 ]; then
        log_message "Memory usage: ${mem_usage}% (OK)"
        return 0
    else
        log_message "Memory usage: ${mem_usage}% (HIGH)"
        send_alert "High Memory Usage" "Memory usage is at ${mem_usage}%"
        return 1
    fi
}

# Main health check
log_message "========== Health Check Started =========="

# Run all checks
check_pm2_status
check_backend
check_database
check_frontend "CFY" "${FRONTEND_CFY_URL}"
check_frontend "NTF" "${FRONTEND_NTF_URL}"
check_frontend "PROD" "${FRONTEND_PROD_URL}"
check_disk_space
check_memory

log_message "========== Health Check Completed =========="

# Keep log file size under control (keep last 1000 lines)
tail -1000 "${LOG_FILE}" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "${LOG_FILE}"

exit 0
