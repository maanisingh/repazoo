# Repazoo Admin Panel

A comprehensive admin panel for monitoring and managing the Repazoo Twitter reputation analysis SaaS application.

## Features

### 1. Queue Monitoring (`/admin/queues`)
- Real-time BullMQ queue statistics
- View all queues: auth, twitter-oauth, reputation-scan, tweet-actions
- Job status tracking: waiting, active, completed, failed, delayed
- Retry failed jobs
- Auto-refresh every 5 seconds

### 2. User Management (`/admin/users`)
- List all users with pagination (50 per page)
- Search by email or name
- Edit user details: name, subscription tier, admin status
- View user creation date and last login
- Subscription tier management: free, basic, pro, enterprise

### 3. System Health (`/admin/system`)
- Overall system status: healthy, degraded, unhealthy
- Redis connection and memory usage
- PostgreSQL connection pool monitoring
- BullMQ queue health
- System resource usage (CPU, memory, load)
- Auto-refresh every 10 seconds

### 4. Database Viewer (`/admin/database`)
- Browse all database tables
- View table data with pagination
- SQL query executor (read-only)
- Pre-built query examples
- Column type information
- Row count for each table

## Setup

### Backend Setup

1. **Run the database migration:**
```bash
cd /root/repazoo/backend-api
psql $DATABASE_URL -f migrations/001_add_admin_role.sql
```

2. **Set your user as admin:**
```sql
UPDATE users SET is_admin = TRUE WHERE email = 'your-email@example.com';
```

3. **Restart the backend server:**
```bash
npm run dev
```

### Frontend Setup

The admin routes are automatically available at `/admin/*` after authentication.

## Security

### Backend Security
- **Admin Middleware**: Verifies user has `is_admin = TRUE` in database
- **Authentication Required**: All admin endpoints require valid JWT token
- **Input Validation**: Zod schemas validate all inputs
- **SQL Injection Protection**: Parameterized queries and table name validation
- **Read-Only Queries**: Database query executor only allows SELECT, WITH, EXPLAIN
- **Rate Limiting**: Recommended to add rate limiting middleware (not implemented yet)

### Frontend Security
- **Route Protection**: Admin routes require authentication
- **Role Verification**: Backend verifies admin role on every request
- **No Sensitive Data**: Passwords and tokens not displayed

## API Endpoints

### Queue Management
- `GET /api/admin/queues` - Get all queue statistics
- `GET /api/admin/queues/:queueName/jobs?status=waiting&limit=50` - Get queue jobs
- `POST /api/admin/queues/:queueName/jobs/:jobId/retry` - Retry failed job

### User Management
- `GET /api/admin/users?limit=50&offset=0&search=email` - List users
- `PUT /api/admin/users/:userId` - Update user details

### System Health
- `GET /api/admin/health` - Get system health status

### Database Management
- `GET /api/admin/tables` - List all database tables
- `GET /api/admin/tables/:tableName?limit=50&offset=0` - Get table data
- `POST /api/admin/query` - Execute read-only SQL query

## Tech Stack

### Backend
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **BullMQ** - Queue management
- **PostgreSQL** - Database
- **Redis** - Cache and queue backend
- **Zod** - Input validation

### Frontend
- **React** - UI framework
- **TanStack Router** - File-based routing
- **TanStack Query** - Data fetching and caching
- **Shadcn UI** - Component library
- **Sonner** - Toast notifications

## Project Structure

### Backend
```
backend-api/src/
├── middleware/
│   ├── auth.middleware.ts      # JWT authentication
│   └── admin.middleware.ts     # Admin role verification
├── routes/
│   └── admin.routes.ts         # Admin API endpoints
├── services/
│   └── admin.service.ts        # Admin business logic
└── migrations/
    └── 001_add_admin_role.sql  # Database migration
```

### Frontend
```
frontend/src/
├── lib/api/
│   └── admin-client.ts         # Admin API client
└── routes/_authenticated/admin/
    ├── route.tsx               # Admin layout with navigation
    ├── index.tsx               # Redirect to /admin/queues
    ├── queues.tsx              # Queue monitoring UI
    ├── users.tsx               # User management UI
    ├── system.tsx              # System health dashboard
    └── database.tsx            # Database viewer UI
```

## Usage Examples

### Making a User Admin
```sql
-- Connect to your database
psql $DATABASE_URL

-- Set user as admin
UPDATE users SET is_admin = TRUE WHERE email = 'admin@repazoo.com';

-- Verify
SELECT id, email, is_admin FROM users WHERE is_admin = TRUE;
```

### Monitoring Queue Health
1. Navigate to `/admin/queues`
2. View real-time statistics for all queues
3. Click on a queue card to view jobs
4. Use the status dropdown to filter jobs
5. Click "Retry" on failed jobs to reprocess them

### Executing SQL Queries
1. Navigate to `/admin/database`
2. Click "Query" button
3. Enter your SELECT query
4. Click "Execute Query"
5. View results in the table below

### Example Queries
```sql
-- Count users by subscription tier
SELECT subscription_tier, COUNT(*) as count
FROM users
GROUP BY subscription_tier;

-- Recent scans with status
SELECT id, twitter_handle, status, created_at
FROM scans
ORDER BY created_at DESC
LIMIT 20;

-- Failed jobs summary
SELECT name, COUNT(*) as count
FROM (
  SELECT data->>'type' as name
  FROM bullmq_jobs
  WHERE state = 'failed'
) as failed_jobs
GROUP BY name;
```

## Monitoring Best Practices

1. **Regular Health Checks**: Monitor system health dashboard for degraded services
2. **Queue Management**: Keep failed job count low by investigating and fixing issues
3. **Database Monitoring**: Watch for slow queries and optimize as needed
4. **User Activity**: Track new signups and subscription changes
5. **Resource Usage**: Monitor memory and CPU to plan scaling

## Troubleshooting

### Admin Access Denied
```
Error: Admin access required
```
**Solution**: Verify user has `is_admin = TRUE` in database

### Queue Not Found
```
Error: Queue {queueName} not found
```
**Solution**: Check queue name matches: auth, twitterOAuth, scan, tweet

### Read-Only Query Error
```
Error: Only SELECT, WITH, and EXPLAIN queries are allowed
```
**Solution**: Remove UPDATE/DELETE/INSERT from your query

### Database Connection Error
```
Error: Failed to connect to database
```
**Solution**: Check DATABASE_URL environment variable and PostgreSQL service

## Future Enhancements

- [ ] Rate limiting on admin endpoints
- [ ] Audit log for admin actions
- [ ] Export data to CSV
- [ ] Advanced query builder UI
- [ ] Real-time WebSocket updates
- [ ] Email notifications for system alerts
- [ ] Performance metrics and charts
- [ ] Backup and restore functionality

## Support

For issues or questions, please contact the development team or create an issue in the project repository.
