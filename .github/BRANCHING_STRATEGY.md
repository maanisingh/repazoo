# Repazoo Branching & Deployment Strategy

## Branch Structure

```
master (production)
  ↑
staging (pre-production)
  ↑
develop (active development)
  ↑
feature/* (individual features)
hotfix/* (critical production fixes)
```

## Branch Purposes

### `master` - Production
- **Protected**: No direct commits allowed
- **Deploys to**: dash.repazoo.com (Production)
- **Deployment**: Manual, requires approval
- **Merge from**: `staging` branch only
- **Purpose**: Production-ready code only

### `staging` - Pre-Production
- **Protected**: No direct commits allowed
- **Deploys to**: ntf.repazoo.com (Staging)
- **Deployment**: Automatic on merge
- **Merge from**: `develop` branch only
- **Purpose**: Final testing before production

### `develop` - Active Development
- **Protected**: No direct commits allowed
- **Deploys to**: cfy.repazoo.com (Development)
- **Deployment**: Automatic on merge
- **Merge from**: `feature/*` and `hotfix/*` branches
- **Purpose**: Integration of completed features

### `feature/*` - Feature Branches
- **Created from**: `develop`
- **Merged to**: `develop`
- **Naming**: `feature/short-description`
- **Purpose**: Individual feature development
- **Lifespan**: Until feature is complete and merged

### `hotfix/*` - Hotfix Branches
- **Created from**: `master`
- **Merged to**: `master` AND `develop`
- **Naming**: `hotfix/issue-description`
- **Purpose**: Critical production fixes
- **Lifespan**: Until fix is deployed

## Development Workflow

### Starting a New Feature

```bash
# 1. Update develop branch
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/add-user-notifications

# 3. Make changes and commit
git add .
git commit -m "feat: add user notification system"

# 4. Push to remote
git push origin feature/add-user-notifications

# 5. Create Pull Request on GitHub
# - Base: develop
# - Compare: feature/add-user-notifications
# - Fill out PR template
# - Request review

# 6. After approval, merge PR
# - Feature will auto-deploy to cfy.repazoo.com
```

### Promoting to Staging

```bash
# 1. Create PR from develop to staging
# - Base: staging
# - Compare: develop
# - Requires: All tests passing, code reviewed

# 2. After merge
# - Auto-deploys to ntf.repazoo.com
# - Run manual smoke tests
```

### Deploying to Production

```bash
# 1. Create PR from staging to master
# - Base: master
# - Compare: staging
# - Requires: Staging testing complete, deployment plan documented

# 2. Get approval from project lead

# 3. Manual deployment
./scripts/deploy-prod.sh

# 4. Verify deployment
# - Check health endpoints
# - Monitor error logs
# - Verify critical functionality
```

### Creating a Hotfix

```bash
# 1. Create from master
git checkout master
git pull origin master
git checkout -b hotfix/fix-payment-bug

# 2. Make fix and test locally
git add .
git commit -m "fix: resolve payment processing error"

# 3. Push and create PR to master
git push origin hotfix/fix-payment-bug

# 4. After approval and merge
./scripts/deploy-prod.sh

# 5. Merge hotfix back to develop
git checkout develop
git merge hotfix/fix-payment-bug
git push origin develop
```

## Commit Message Convention

Use conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `ci`: CI/CD configuration changes

### Examples:
```bash
feat(auth): add OAuth2 authentication
fix(api): resolve null pointer in user service
docs(readme): update installation instructions
refactor(database): optimize query performance
```

## Environment URLs

- **Development (CFY)**: https://cfy.repazoo.com
  - Branch: `develop`
  - Auto-deployed on merge
  - For testing new features

- **Staging (NTF)**: https://ntf.repazoo.com
  - Branch: `staging`
  - Auto-deployed on merge
  - Pre-production testing

- **Production (DASH)**: https://dash.repazoo.com
  - Branch: `master`
  - Manual deployment
  - Live user traffic

## Deployment Safety Checklist

Before deploying to production:

- [ ] All tests pass
- [ ] Code reviewed and approved
- [ ] Tested on CFY (develop)
- [ ] Tested on NTF (staging)
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Deployment plan documented
- [ ] Stakeholders notified
- [ ] Monitoring alerts configured

## Rollback Procedures

### Frontend Rollback
```bash
git checkout <previous-working-commit>
npm run build
# Deploy specific environment
./scripts/deploy-<env>.sh
```

### Backend Rollback
```bash
pm2 stop repazoo-backend-api
git checkout <previous-working-commit>
npm run build
pm2 restart repazoo-backend-api
```

### Database Rollback
```bash
./scripts/restore-database.sh /var/backups/postgresql/repazoo/repazoo_YYYYMMDD_HHMMSS.sql.gz
```

## Questions?

Contact: @maanisingh
