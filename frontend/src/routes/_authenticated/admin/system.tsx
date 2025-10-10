import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Activity, Database, Cpu, RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { adminClient } from '@/lib/api/admin-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

export const Route = createFileRoute('/_authenticated/admin/system')({
  component: SystemPage,
})

function SystemPage() {
  const { data: health, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'system-health'],
    queryFn: () => adminClient.getSystemHealth(),
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  })

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center py-12'>
        <XCircle className='h-12 w-12 text-destructive mb-4' />
        <p className='text-lg font-medium'>Failed to load system health</p>
        <p className='text-sm text-muted-foreground mt-2'>
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <Button onClick={() => refetch()} className='mt-4'>
          <RefreshCw className='mr-2 h-4 w-4' />
          Retry
        </Button>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500'
      case 'degraded':
        return 'bg-yellow-500'
      case 'unhealthy':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className='h-5 w-5 text-green-500' />
      case 'degraded':
        return <AlertTriangle className='h-5 w-5 text-yellow-500' />
      case 'unhealthy':
        return <XCircle className='h-5 w-5 text-red-500' />
      default:
        return <Activity className='h-5 w-5 text-gray-500' />
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold'>System Health</h2>
        <Button onClick={() => refetch()} size='sm' variant='outline'>
          <RefreshCw className='mr-2 h-4 w-4' />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            {getStatusIcon(health?.status || 'healthy')}
            System Status
          </CardTitle>
          <CardDescription>
            Last updated: {health ? new Date(health.timestamp).toLocaleString() : '-'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center gap-4'>
            <Badge
              variant='outline'
              className={`${getStatusColor(health?.status || 'healthy')} text-white border-0 px-4 py-2 text-sm`}
            >
              {health?.status.toUpperCase()}
            </Badge>
            <div className='text-sm text-muted-foreground'>
              Uptime: {health ? formatUptime(health.uptime) : '-'}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4 md:grid-cols-2'>
        {/* Redis Status */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Activity className='h-5 w-5' />
              Redis
            </CardTitle>
            <CardDescription>Cache and queue backend</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>Status</span>
              {health?.redis.connected ? (
                <Badge variant='default' className='bg-green-500'>Connected</Badge>
              ) : (
                <Badge variant='destructive'>Disconnected</Badge>
              )}
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>Memory Used</span>
              <span className='text-sm font-medium'>{health?.redis.used_memory || '-'}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>Connected Clients</span>
              <span className='text-sm font-medium'>{health?.redis.connected_clients || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Database Status */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Database className='h-5 w-5' />
              PostgreSQL
            </CardTitle>
            <CardDescription>Primary database</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>Status</span>
              {health?.database.connected ? (
                <Badge variant='default' className='bg-green-500'>Connected</Badge>
              ) : (
                <Badge variant='destructive'>Disconnected</Badge>
              )}
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>Active Connections</span>
              <span className='text-sm font-medium'>
                {health?.database.active_connections || 0}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>Max Connections</span>
              <span className='text-sm font-medium'>
                {health?.database.max_connections || 0}
              </span>
            </div>
            {health?.database.max_connections && health?.database.active_connections && (
              <div className='space-y-1'>
                <div className='flex items-center justify-between text-xs'>
                  <span className='text-muted-foreground'>Connection Usage</span>
                  <span className='font-medium'>
                    {Math.round((health.database.active_connections / health.database.max_connections) * 100)}%
                  </span>
                </div>
                <Progress
                  value={(health.database.active_connections / health.database.max_connections) * 100}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Queue Status */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Activity className='h-5 w-5' />
              BullMQ Queues
            </CardTitle>
            <CardDescription>Job queue system</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>Total Queues</span>
              <span className='text-sm font-medium'>{health?.queues.total || 0}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>Healthy</span>
              <Badge variant='default' className='bg-green-500'>
                {health?.queues.healthy || 0}
              </Badge>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>Paused</span>
              <Badge variant='secondary'>{health?.queues.paused || 0}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* System Resources */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Cpu className='h-5 w-5' />
              System Resources
            </CardTitle>
            <CardDescription>Server hardware stats</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>Platform</span>
              <span className='text-sm font-medium capitalize'>{health?.system.platform || '-'}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>CPU Cores</span>
              <span className='text-sm font-medium'>{health?.system.cpu_count || 0}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>Memory Usage</span>
              <span className='text-sm font-medium'>
                {health ? formatBytes(health.system.memory_usage) : '-'}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>Total Memory</span>
              <span className='text-sm font-medium'>
                {health ? formatBytes(health.system.memory_total) : '-'}
              </span>
            </div>
            {health?.system.memory_total && health?.system.memory_usage && (
              <div className='space-y-1'>
                <div className='flex items-center justify-between text-xs'>
                  <span className='text-muted-foreground'>Memory Usage</span>
                  <span className='font-medium'>
                    {Math.round((health.system.memory_usage / health.system.memory_total) * 100)}%
                  </span>
                </div>
                <Progress
                  value={(health.system.memory_usage / health.system.memory_total) * 100}
                />
              </div>
            )}
            {health?.system.load_average && (
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>Load Average</span>
                <span className='text-sm font-medium'>
                  {health.system.load_average.map(l => l.toFixed(2)).join(', ')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
