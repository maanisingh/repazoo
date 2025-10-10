# Admin Panel Quick Start Guide

Get the Repazoo Admin Panel up and running in 5 minutes.

## Step 1: Run Database Migration

```bash
cd /root/repazoo/backend-api
psql $DATABASE_URL -f migrations/001_add_admin_role.sql
```

This adds the `is_admin` column to the users table.

## Step 2: Make Yourself Admin

Connect to your database and run:

```sql
UPDATE users SET is_admin = TRUE WHERE email = 'your-email@example.com';
```

Replace `your-email@example.com` with your actual email address.

To verify:
```sql
SELECT id, email, is_admin FROM users WHERE is_admin = TRUE;
```

## Step 3: Restart Backend (if running)

```bash
cd /root/repazoo/backend-api
# Kill existing process if needed
npm run dev
```

## Step 4: Access Admin Panel

1. Open your browser to the frontend URL (e.g., `http://localhost:5173`)
2. Login with your admin user account
3. Navigate to `/admin` or click the admin link
4. You should see the admin navigation with 4 tabs:
   - **Queues**: Monitor BullMQ job queues
   - **Users**: Manage user accounts
   - **System**: View system health
   - **Database**: Browse database and run queries

## Common Issues

### "Admin access required" error
**Problem**: Your user doesn't have admin privileges.

**Solution**:
```sql
UPDATE users SET is_admin = TRUE WHERE email = 'your-email@example.com';
```

### "Column is_admin does not exist" error
**Problem**: Database migration hasn't been run.

**Solution**: Run the migration script from Step 1.

### API endpoints return 404
**Problem**: Backend routes not loaded.

**Solution**: Make sure `/root/repazoo/backend-api/src/index.ts` includes:
```typescript
import adminRoutes from './routes/admin.routes.js';
app.use('/api/admin', adminRoutes);
```

Then restart the backend.

### Frontend shows blank page
**Problem**: TypeScript errors or missing dependencies.

**Solution**:
```bash
cd /root/repazoo/frontend
npm install
npm run dev
```

## Quick Feature Overview

### Queue Monitoring (`/admin/queues`)
- View all BullMQ queues (auth, twitter-oauth, reputation-scan, tweet-actions)
- See job counts: waiting, active, completed, failed
- Click a queue to view jobs
- Retry failed jobs with one click
- Auto-refreshes every 5 seconds

### User Management (`/admin/users`)
- See all registered users
- Search by email or name
- Edit user details:
  - Full name
  - Subscription tier
  - Admin status
- 50 users per page with pagination

### System Health (`/admin/system`)
- Overall status: healthy/degraded/unhealthy
- Redis: connection, memory, clients
- PostgreSQL: connections, pool usage
- BullMQ: queue health
- System: CPU, memory, load average
- Auto-refreshes every 10 seconds

### Database Viewer (`/admin/database`)
- **Tables Mode**: Browse all tables, view data
- **Query Mode**: Execute SELECT queries
- Pre-built example queries
- Shows column types
- Pagination for large result sets

## Example Queries to Try

Once in the Database Viewer, try these queries:

```sql
-- Count users by subscription tier
SELECT subscription_tier, COUNT(*) as count
FROM users
GROUP BY subscription_tier;

-- Recent scans
SELECT id, twitter_handle, status, created_at
FROM scans
ORDER BY created_at DESC
LIMIT 20;

-- User growth over time
SELECT DATE(created_at) as date, COUNT(*) as signups
FROM users
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
```

## Security Notes

1. **Admin Access**: Only users with `is_admin = TRUE` can access the panel
2. **Authentication**: All endpoints require valid JWT token
3. **Read-Only Queries**: Database query executor blocks UPDATE/DELETE/INSERT
4. **Input Validation**: All inputs validated with Zod schemas

## Next Steps

1. Monitor your queues for failed jobs
2. Review user signups and subscription tiers
3. Check system health regularly
4. Use database viewer to analyze data trends

## Need Help?

- Documentation: See `ADMIN_PANEL.md` for full details
- Implementation: See `ADMIN_PANEL_SUMMARY.md` for technical details
- Issues: Create a GitHub issue or contact the dev team

---

**Ready to go!** Navigate to `/admin` and start managing your Repazoo application.
