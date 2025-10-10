# REPAZOO SAAS - TESTER QUICK START GUIDE

**Welcome to Repazoo!** This guide will help you quickly access and test the Repazoo SaaS application.

---

## QUICK ACCESS

### Server Information

- **Server IP:** 128.140.82.187
- **Server IPv6:** 2a01:4f8:c013:2625::1
- **Deployment:** Production (AI Stage)
- **Status:** Ready for Testing

### Main Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| **Main Entry** | http://128.140.82.187/ | Redirects to dashboard |
| **Dashboard** | http://128.140.82.187/dash | Appsmith UI for building apps |
| **API** | http://128.140.82.187/api/* | Backend API endpoints |
| **Workflows** | http://128.140.82.187/workflows | Prefect workflow UI |
| **Analytics** | http://128.140.82.187/analytics | Metabase data dashboard |
| **Monitoring** | http://128.140.82.187/monitor | Uptime Kuma status |

---

## 5-MINUTE QUICK START

### Step 1: Verify the System is Running

Open your browser and visit:
```
http://128.140.82.187/healthz
```

You should see:
```json
{
  "status": "healthy",
  "service": "repazoo-api",
  "version": "1.0.0",
  "environment": "local"
}
```

If you see this, the system is operational!

### Step 2: Access the Dashboard

Visit the main dashboard:
```
http://128.140.82.187/dash
```

This will load the Appsmith UI where you can:
- Build custom applications
- Connect to the PostgreSQL database
- Create forms and workflows
- Design user interfaces

**First-time setup:** Appsmith will ask you to create an admin account on first access.

### Step 3: Check the API Endpoints

Test the API directly:
```bash
# Health check
curl http://128.140.82.187/healthz

# API health
curl http://128.140.82.187/api/health
```

### Step 4: View Analytics

Access Metabase for data visualization:
```
http://128.140.82.187/analytics
```

**First-time setup:** Metabase will ask you to:
1. Create an admin account
2. Connect to the database (credentials below)

### Step 5: Monitor System Health

Access Uptime Kuma:
```
http://128.140.82.187/monitor
```

**First-time setup:** Create an admin account to configure monitoring.

---

## DETAILED SERVICE ACCESS

### 1. Appsmith Dashboard (No-Code UI Builder)

**URL:** http://128.140.82.187/dash (or direct: http://128.140.82.187:8080)

**What it does:** Build internal tools, dashboards, and admin panels without code

**First-time setup:**
1. Visit the URL
2. Click "Get Started" or "Sign Up"
3. Create admin account with email and password
4. You'll be taken to the application builder

**How to use:**
- Create a new application
- Add widgets (tables, forms, charts)
- Connect to PostgreSQL database
- Build UI for Twitter analysis results
- Create subscription management interface

**Database Connection Details for Appsmith:**
```
Host: postgres
Port: 5432
Database: postgres
Username: postgres
Password: repuzoo_secure_pass_2024
```

### 2. Metabase Analytics

**URL:** http://128.140.82.187/analytics (or direct: http://128.140.82.187:3001)

**What it does:** Create dashboards, charts, and analyze data

**First-time setup:**
1. Visit the URL
2. Click "Let's get started"
3. Enter your name and email
4. Create a password
5. Add database connection:
   - **Database type:** PostgreSQL
   - **Name:** Repazoo Production
   - **Host:** postgres
   - **Port:** 5432
   - **Database name:** postgres
   - **Username:** postgres
   - **Password:** repuzoo_secure_pass_2024
6. Click "Connect database"

**How to use:**
- Browse data tables
- Create questions (SQL queries)
- Build visualizations (charts, graphs)
- Create dashboards
- Set up automated reports

**Suggested dashboards to create:**
- User registration metrics
- Subscription analytics
- API usage tracking
- Twitter analysis results

### 3. Prefect Workflows

**URL:** http://128.140.82.187/workflows (or direct: http://128.140.82.187:4200)

**What it does:** Orchestrate and monitor data workflows

**How to use:**
- View workflow runs
- Monitor task execution
- Schedule recurring jobs
- Check workflow logs
- Trigger manual runs

**Note:** Workflow definitions are in `/root/repazoo/workflows/` on the server.

### 4. Uptime Kuma Monitoring

**URL:** http://128.140.82.187/monitor (or direct: http://128.140.82.187:3002)

**What it does:** Monitor service uptime and health

**First-time setup:**
1. Visit the URL
2. Create admin username and password
3. Click "Create"

**Recommended monitors to add:**
- API Health: http://128.140.82.187/healthz
- Appsmith: http://128.140.82.187:8080
- Metabase: http://128.140.82.187:3001
- Prefect: http://128.140.82.187:4200

---

## API TESTING

### Available Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| /healthz | GET | System health | Working |
| /api/health | GET | API health | Working |
| /auth/twitter/login | POST | Twitter OAuth | Needs API keys |
| /auth/twitter/callback | GET | OAuth callback | Needs API keys |
| /api/user/profile | GET | User profile | Needs auth |
| /api/subscriptions | GET | Subscription status | Needs auth |
| /webhooks/stripe | POST | Stripe webhook | Needs API keys |
| /api/analyze | POST | Twitter analysis | Needs API keys |

### Test with cURL

```bash
# Health check
curl http://128.140.82.187/healthz

# API health
curl http://128.140.82.187/api/health

# Prefect health
curl http://128.140.82.187:4200/api/health
```

### Test with Browser

Simply paste these URLs in your browser:
- http://128.140.82.187/healthz
- http://128.140.82.187/api/health

---

## DATABASE ACCESS (For Advanced Users)

### PostgreSQL

**Connection from server:**
```bash
docker exec -it repazoo-postgres psql -U postgres
```

**Connection from external client:**
```
Host: 128.140.82.187
Port: 5432
Database: postgres
Username: postgres
Password: repuzoo_secure_pass_2024
```

**Available databases:**
- `postgres` - Main application data
- `prefect` - Workflow data
- `metabase` - Analytics metadata

**Useful SQL queries:**
```sql
-- List all databases
\l

-- Connect to database
\c postgres

-- List tables
\dt

-- View users table (if exists)
SELECT * FROM users LIMIT 10;
```

### MongoDB

**Connection from server:**
```bash
docker exec -it repazoo-mongo mongosh
```

**Connection string:**
```
mongodb://128.140.82.187:27017/appsmith?replicaSet=rs0
```

### Redis

**Connection from server:**
```bash
docker exec -it repazoo-redis redis-cli
```

**Connection:** `redis://128.140.82.187:6379`

**Useful commands:**
```bash
PING        # Test connection
KEYS *      # List all keys
GET key     # Get value
INFO        # Server info
```

---

## TESTING SCENARIOS

### Scenario 1: Build a User Dashboard in Appsmith

1. Access http://128.140.82.187/dash
2. Create new application "User Dashboard"
3. Add PostgreSQL datasource (credentials above)
4. Create a table widget
5. Query: `SELECT * FROM users LIMIT 100`
6. Add filters and search
7. Publish the app

### Scenario 2: Create Analytics in Metabase

1. Access http://128.140.82.187/analytics
2. Go to "Browse Data" → "Repazoo Production"
3. Click on a table
4. Click "Ask a question"
5. Build a chart (e.g., users over time)
6. Save to a dashboard

### Scenario 3: Monitor System Health

1. Access http://128.140.82.187/monitor
2. Add monitor for API: http://128.140.82.187/healthz
3. Set check interval to 60 seconds
4. Add notification (email or webhook)
5. View status page

### Scenario 4: Test API Endpoints

```bash
# From command line
curl -X GET http://128.140.82.187/healthz

# Or use Postman/Insomnia
# Import collection with base URL: http://128.140.82.187
```

---

## KNOWN LIMITATIONS (Current Testing Phase)

### Features Requiring Configuration

The following features are **not yet active** because API keys need to be configured:

1. **Twitter OAuth Login** - Requires `TWITTER_CLIENT_ID` and `TWITTER_CLIENT_SECRET`
2. **Twitter Profile Analysis** - Requires `TWITTER_BEARER_TOKEN` and `ANTHROPIC_API_KEY`
3. **Stripe Payments** - Requires `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SECRET`
4. **AI Analysis** - Requires `ANTHROPIC_API_KEY`

### What You CAN Test

- System health and monitoring
- Database connections
- UI dashboard creation (Appsmith)
- Analytics and visualization (Metabase)
- Workflow orchestration UI (Prefect)
- API endpoint accessibility
- Service uptime monitoring
- Data persistence
- Container orchestration

---

## TROUBLESHOOTING

### Can't Access a Service?

**Check if container is running:**
```bash
ssh root@128.140.82.187
docker ps | grep repazoo
```

**Restart a service:**
```bash
cd /root/repazoo
docker-compose -f docker-compose.production.yml restart <service-name>
```

### Getting 502 Bad Gateway?

Wait 30 seconds and refresh. Some services (like Metabase and Appsmith) take time to fully start.

### Database Connection Failed?

**From Appsmith/Metabase, use:**
- Host: `postgres` (not `localhost` or IP)
- Port: `5432`
- Password: `repuzoo_secure_pass_2024`

### SSL/HTTPS Certificate Warnings?

This is normal. The server uses a self-signed certificate for IP-based access. Click "Advanced" → "Proceed anyway" in your browser.

### Service Shows as "Unhealthy"?

Some services (like Prefect) may show unhealthy in Docker but are actually working. Test the actual endpoint to verify.

---

## CONTACT & SUPPORT

### System Information

- **Deployment Date:** 2025-10-07
- **Version:** 1.0.0
- **Stage:** Production (AI)
- **Server:** 128.140.82.187

### Documentation

- **Full Deployment Report:** `/root/repazoo/FINAL_DEPLOYMENT_REPORT.md`
- **Docker Compose:** `/root/repazoo/docker-compose.production.yml`
- **Caddyfile:** `/root/repazoo/Caddyfile`
- **Environment:** `/root/repazoo/.env`

### Useful Commands

```bash
# SSH to server
ssh root@128.140.82.187

# Check all containers
docker ps -a

# View logs
docker logs repazoo-api --tail 100 -f

# Restart all services
cd /root/repazoo
docker-compose -f docker-compose.production.yml restart

# Check resource usage
docker stats
```

---

## NEXT STEPS FOR DEVELOPERS

### To Enable Full Functionality

1. Add API keys to `/root/repazoo/.env`:
   - TWITTER_CLIENT_ID
   - TWITTER_CLIENT_SECRET
   - TWITTER_BEARER_TOKEN
   - ANTHROPIC_API_KEY
   - STRIPE_API_KEY
   - STRIPE_WEBHOOK_SECRET

2. Restart services:
   ```bash
   cd /root/repazoo
   docker-compose -f docker-compose.production.yml restart api prefect-agent
   ```

### To Configure DNS (Production)

1. Add DNS A records pointing to 128.140.82.187:
   - api.repazoo.com
   - dash.repazoo.com
   - wf.repazoo.com

2. Update `/root/repazoo/Caddyfile` to use domain names

3. Restart Caddy:
   ```bash
   docker-compose -f docker-compose.production.yml restart caddy
   ```

---

## FEEDBACK

When testing, please note:

- Which features work as expected
- Any errors or issues encountered
- Performance observations
- UI/UX feedback
- Suggested improvements

---

**Happy Testing!**

The Repazoo team appreciates your help in making this platform better.

For technical issues or questions, refer to the FINAL_DEPLOYMENT_REPORT.md for detailed system information.

---

**Document Version:** 1.0
**Last Updated:** 2025-10-07
