# Temporal Integration for RepAZoo

This document explains how to set up and use Temporal for automations in RepAZoo.

## Overview

RepAZoo now uses Temporal for reliable, durable automations including:

- **Email Verification Workflows**: Automatic email verification with retry logic
- **Monitoring Workflows**: Scheduled web scraping and mention monitoring
- **Notification Workflows**: Scheduled reports (daily, weekly, monthly)
- **Background Processing**: Reliable execution of long-running tasks

## Setup

### 1. Install Temporal CLI (Optional)

```bash
# Download Temporal CLI for your system
curl -sSf https://temporal.download/cli.sh | sh

# Or use Homebrew on macOS
brew install temporal
```

### 2. Start Temporal Development Server

```bash
# Option 1: Start everything with one command (includes worker)
npm run temporal:dev

# Option 2: Start server and worker separately
npm run temporal:server  # Start Temporal server
npm run temporal:worker  # Start worker in another terminal
```

### 3. Environment Variables

Add to your `.env.local`:

```bash
# Temporal Configuration
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_UI_URL=https://ai.repazoo.com

# Enable Temporal features
ENABLE_TEMPORAL=true
```

## Workflows

### Email Verification

**Workflow**: `emailVerificationWorkflow`
- Sends initial verification email
- Automatically resends after 1 hour if not verified
- Maximum 3 resend attempts
- Completes when user verifies or after 7 days

**Usage**:
```typescript
import { TemporalService } from '@/temporal/services/temporal-service';

// Start workflow (automatically triggered on user registration)
await TemporalService.startEmailVerificationWorkflow({
  userId: 'user-id',
  email: 'user@example.com',
  firstName: 'John',
  maxResendAttempts: 3,
  resendDelayMinutes: 60,
});

// Signal verification complete
await TemporalService.markEmailAsVerified(userId);

// Trigger manual resend
await TemporalService.resendVerificationEmail(userId);
```

### Monitoring Workflows

**Workflow**: `monitoringWorkflow`
- Scans user's monitoring sources at specified intervals
- Processes new mentions and analyzes sentiment
- Handles failures with retry logic
- Can be paused/resumed/forced manually

**Usage**:
```typescript
// Start monitoring
await TemporalService.startMonitoringWorkflow({
  userId: 'user-id',
  scanIntervalMinutes: 60, // Scan every hour
});

// Control monitoring
await TemporalService.pauseMonitoring(userId);
await TemporalService.resumeMonitoring(userId);
await TemporalService.forceScan(userId);
```

### Notification Workflows

**Workflow**: `notificationWorkflow`
- Sends scheduled reports (daily, weekly, monthly)
- Generates analytics summaries
- Handles email delivery failures
- Can send immediate reports on demand

**Usage**:
```typescript
// Start notification workflows
await TemporalService.startNotificationWorkflows(
  userId,
  userEmail,
  {
    daily: true,
    weekly: true,
    monthly: false,
  }
);

// Send immediate report
await TemporalService.sendImmediateReport(userId, 'weekly');
```

## API Endpoints

### GET /api/automation
Get automation status for authenticated user

**Response**:
```json
{
  "success": true,
  "automation": {
    "workflows": [...],
    "emailVerification": { "sent": true, "verified": false, ... },
    "monitoring": { "isRunning": true, "totalScans": 5, ... }
  }
}
```

### POST /api/automation
Control automation workflows

**Actions**:
- `start_monitoring`: Start monitoring workflow
- `start_notifications`: Start notification workflows
- `force_scan`: Trigger immediate scan
- `pause_monitoring`: Pause monitoring
- `resume_monitoring`: Resume monitoring
- `resend_verification`: Resend verification email
- `send_immediate_report`: Send immediate report

**Example**:
```json
{
  "action": "start_monitoring",
  "scanIntervalMinutes": 30
}
```

### DELETE /api/automation
Cancel workflows

**Query Parameters**:
- `workflowId`: Cancel specific workflow
- `action`: Cancel all workflows of type (e.g., "monitoring")

## Temporal Dashboard

Access the Temporal Web UI at: https://ai.repazoo.com

Features:
- View all running workflows
- Monitor workflow execution history
- Debug failed workflows
- View activity logs
- Manage workflow schedules

## Development

### Running Tests

```bash
# Test email verification workflow
curl -X POST http://localhost:3000/api/automation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"action": "resend_verification"}'

# Test monitoring workflow
curl -X POST http://localhost:3000/api/automation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"action": "start_monitoring", "scanIntervalMinutes": 5}'

# Force scan
curl -X POST http://localhost:3000/api/automation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"action": "force_scan"}'
```

### Workflow Development

1. **Activities** (`src/temporal/activities/`): Pure functions that perform actual work
2. **Workflows** (`src/temporal/workflows/`): Orchestration logic with signals/queries
3. **Workers** (`src/temporal/workers/`): Process that executes workflows and activities
4. **Services** (`src/temporal/services/`): API layer for starting/controlling workflows

### Best Practices

- Activities should be idempotent
- Use signals for external events
- Use queries for workflow status
- Handle failures gracefully with retry policies
- Use Continue-As-New for long-running workflows
- Monitor workflow execution in Temporal UI

## Production Deployment

1. **Use Temporal Cloud** or self-hosted cluster
2. **Configure authentication** (mTLS certificates)
3. **Set up monitoring** and alerts
4. **Use namespaces** for environment separation
5. **Scale workers** based on load
6. **Backup workflow history**

## Troubleshooting

### Common Issues

1. **Worker not starting**: Check Temporal server is running
2. **Workflows failing**: Check activity implementations and retry policies
3. **Email not sending**: Verify SMTP configuration in activities
4. **High memory usage**: Use Continue-As-New for long workflows

### Logs

Check logs in:
- Temporal Web UI: https://ai.repazoo.com
- Worker logs: Console output from `npm run temporal:worker`
- Application logs: Next.js console for workflow triggers

## Migration from setTimeout

Old pattern:
```typescript
setTimeout(async () => {
  await sendEmail();
}, 100);
```

New pattern:
```typescript
await TemporalService.startEmailVerificationWorkflow({
  userId,
  email,
  firstName,
});
```

Benefits:
- ✅ Durable execution (survives server restarts)
- ✅ Retry logic with exponential backoff
- ✅ Monitoring and observability
- ✅ Signal-based control
- ✅ Workflow history and debugging
- ✅ Scalable and reliable