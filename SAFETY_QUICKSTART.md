# Repazoo Safety Infrastructure - Quick Start Guide

## ✅ What's Now in Place

Your Repazoo application now has comprehensive safety infrastructure to prevent accidents and enable safe development:

### 🌳 Git Branch Structure
```
master (production - dash.repazoo.com)
  ↑
staging (pre-production - ntf.repazoo.com)
  ↑
develop (development - cfy.repazoo.com)
  ↑
feature/* (your work)
```

### 📜 Key Files Created

**GitHub Configuration:**
- `.github/CODEOWNERS` - Requires code review
- `.github/pull_request_template.md` - PR checklist
- `.github/BRANCHING_STRATEGY.md` - Full documentation

**Deployment Scripts:**
- `scripts/deploy-cfy.sh` - Deploy to development
- `scripts/deploy-ntf.sh` - Deploy to staging (with tests)
- `scripts/deploy-prod.sh` - Deploy to production (manual, with checks)

**Safety Scripts:**
- `scripts/restore-database.sh` - Restore from backup
- `scripts/rollback-deployment.sh` - Rollback to previous version
- `scripts/health-monitor.sh` - Automated health monitoring

**Backend:**
- `backend-api/src/routes/health.routes.ts` - Health endpoints

### 🤖 Automated Systems

**Cron Jobs (Running Now):**
```bash
# Health monitoring every 5 minutes
*/5 * * * * /root/repazoo/scripts/health-monitor.sh

# Database backup every 6 hours
0 */6 * * * /root/backup_strategy.sh
```

**Health Endpoints:**
- `GET /api/health` - Comprehensive health check
- `GET /api/ready` - Readiness check
- `GET /api/live` - Liveness check

---

## 🚀 Daily Workflow

### Starting a New Feature

```bash
# 1. Update develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/add-notifications

# 3. Make changes and commit
git add .
git commit -m "feat: add user notifications"

# 4. Push and create PR on GitHub
git push origin feature/add-notifications

# 5. After approval, merge PR
# → Auto-deploys to cfy.repazoo.com
```

### Testing on Staging

```bash
# 1. Create PR: develop → staging
# 2. After merge → Auto-deploys to ntf.repazoo.com
# 3. Run manual tests on staging
# 4. If all tests pass, ready for production
```

### Deploying to Production

```bash
# 1. Create PR: staging → master
# 2. Get approval
# 3. Merge PR
# 4. Run production deployment (MANUAL)
cd /root/repazoo
./scripts/deploy-prod.sh

# Script will:
# - Create database backup
# - Run tests
# - Build frontend and backend
# - Apply migrations
# - Create deployment tag
# - Health checks
# - Auto-rollback on failure
```

---

## 🆘 Emergency Procedures

### Rollback Deployment

```bash
# See available deployment tags
git tag | grep deploy-prod

# Rollback to specific deployment
./scripts/rollback-deployment.sh deploy-prod-YYYYMMDD-HHMMSS

# Script handles:
# - Code rollback
# - Database restore (if needed)
# - Health verification
```

### Restore Database

```bash
# List available backups
ls -lh /var/backups/postgresql/repazoo/

# Restore from specific backup
./scripts/restore-database.sh /var/backups/postgresql/repazoo/repazoo_20251010_120000.sql.gz

# Script creates safety backup before restore
```

### Check System Health

```bash
# View health monitoring logs
tail -f /var/log/repazoo_health.log

# Manual health check
curl https://cfy.repazoo.com/api/health

# Check backend status
pm2 status
pm2 logs repazoo-backend-api
```

---

## 🛡️ Safety Features

### Automated Protection

✅ **Database Backups**
- Every 6 hours automatically
- 30-day retention
- Integrity verification
- Location: `/var/backups/postgresql/repazoo/`

✅ **Health Monitoring**
- Every 5 minutes
- Auto-restart on failure
- Email alerts (configure in health-monitor.sh)
- Logs: `/var/log/repazoo_health.log`

✅ **Deployment Safety**
- Production requires manual approval
- Automatic pre-deployment backup
- Test suite runs before deploy
- Health checks after deploy
- Auto-rollback on failure
- Deployment tags for tracking

✅ **Code Review**
- CODEOWNERS enforces reviews
- PR template ensures checklist
- Branch protection (configure on GitHub)

---

## 📋 Pre-Production Checklist

Before deploying to production, verify:

- [ ] Feature tested locally
- [ ] PR created and reviewed
- [ ] Tests passing
- [ ] Deployed to CFY (develop) and tested
- [ ] Deployed to NTF (staging) and tested
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Stakeholders notified
- [ ] Monitoring configured

---

## 🔧 Configuration

### Environment URLs

- **Development (CFY)**: https://cfy.repazoo.com - Auto-deploy from `develop`
- **Staging (NTF)**: https://ntf.repazoo.com - Auto-deploy from `staging`
- **Production (DASH)**: https://dash.repazoo.com - Manual deploy from `master`

### Email Alerts

Edit `/root/repazoo/scripts/health-monitor.sh`:
```bash
ALERT_EMAIL="your-email@repazoo.com"
```

### Backup Retention

Edit `/root/backup_strategy.sh`:
```bash
RETENTION_DAYS=30  # Change as needed
```

---

## 📚 Full Documentation

- **Branching Strategy**: `.github/BRANCHING_STRATEGY.md`
- **PR Template**: `.github/pull_request_template.md`
- **Code Owners**: `.github/CODEOWNERS`

---

## 🎯 Next Steps (Optional)

### Phase 2: CI/CD Pipeline
- Set up GitHub Actions workflows
- Automated testing on PRs
- Auto-deploy to CFY/NTF
- See implementation plan in main README

### Phase 3: Testing Infrastructure
- Create test suites (vitest configured)
- Unit tests for critical paths
- Integration tests
- E2E tests

---

## 💡 Tips

1. **Always work on feature branches** - Never commit directly to develop/staging/master
2. **Test on CFY first** - Catch issues early in development environment
3. **Verify on NTF** - Staging is production-like, final testing ground
4. **Production deploys are manual** - Intentionally requires human oversight
5. **Keep backups** - Database backed up every 6 hours automatically
6. **Monitor health logs** - Check `/var/log/repazoo_health.log` regularly

---

## 🆘 Support

If you encounter issues:
1. Check health logs: `tail -f /var/log/repazoo_health.log`
2. Check PM2 logs: `pm2 logs repazoo-backend-api`
3. Verify cron jobs: `crontab -l`
4. Test health endpoint: `curl https://cfy.repazoo.com/api/health`

---

**Stay safe, ship confidently! 🚀**
