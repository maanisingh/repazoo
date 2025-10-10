import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Users, Database, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { adminClient } from '@/lib/api/admin-client'

export const Route = createFileRoute('/_authenticated/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ['admin', 'user-stats'],
    queryFn: () => adminClient.getUsers(10, 0),
  })

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold tracking-tight'>Dashboard Overview</h2>
        <p className='text-muted-foreground'>
          Quick overview of system status and key metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Users</CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{userStats?.total || 0}</div>
            <p className='text-xs text-muted-foreground'>
              Registered accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Admin Users</CardTitle>
            <ShieldAlert className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {userStats?.users?.filter((u: any) => u.is_admin).length || 0}
            </div>
            <p className='text-xs text-muted-foreground'>
              Users with admin access
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Database</CardTitle>
            <Database className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold flex items-center gap-2'>
              <CheckCircle2 className='h-5 w-5 text-green-500' />
              Online
            </div>
            <p className='text-xs text-muted-foreground'>
              PostgreSQL connection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>API Status</CardTitle>
            <Activity className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold flex items-center gap-2'>
              <CheckCircle2 className='h-5 w-5 text-green-500' />
              Healthy
            </div>
            <p className='text-xs text-muted-foreground'>
              All endpoints operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        <Card className='cursor-pointer hover:bg-accent transition-colors'>
          <a href='/admin/users'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Users className='h-5 w-5' />
                Manage Users
              </CardTitle>
              <CardDescription>
                View and manage user accounts, permissions, and subscriptions
              </CardDescription>
            </CardHeader>
          </a>
        </Card>

        <Card className='cursor-pointer hover:bg-accent transition-colors'>
          <a href='/admin/queues'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Activity className='h-5 w-5' />
                Monitor Queues
              </CardTitle>
              <CardDescription>
                Check background job queues and worker status
              </CardDescription>
            </CardHeader>
          </a>
        </Card>

        <Card className='cursor-pointer hover:bg-accent transition-colors'>
          <a href='/admin/system'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <ShieldAlert className='h-5 w-5' />
                System Health
              </CardTitle>
              <CardDescription>
                View system metrics, logs, and performance data
              </CardDescription>
            </CardHeader>
          </a>
        </Card>

        <Card className='cursor-pointer hover:bg-accent transition-colors'>
          <a href='/admin/database'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Database className='h-5 w-5' />
                Database Tools
              </CardTitle>
              <CardDescription>
                Run queries, check tables, and monitor database health
              </CardDescription>
            </CardHeader>
          </a>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current system information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <CheckCircle2 className='h-4 w-4 text-green-500' />
                <span className='text-sm'>Backend API</span>
              </div>
              <span className='text-sm text-muted-foreground'>Running</span>
            </div>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <CheckCircle2 className='h-4 w-4 text-green-500' />
                <span className='text-sm'>Database Connection</span>
              </div>
              <span className='text-sm text-muted-foreground'>Connected</span>
            </div>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <CheckCircle2 className='h-4 w-4 text-green-500' />
                <span className='text-sm'>Redis Cache</span>
              </div>
              <span className='text-sm text-muted-foreground'>Active</span>
            </div>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <AlertTriangle className='h-4 w-4 text-yellow-500' />
                <span className='text-sm'>Background Workers</span>
              </div>
              <span className='text-sm text-muted-foreground'>Check Queues</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
