import { useQuery } from '@tanstack/react-query'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { n8nClient } from '@/lib/api/repazoo-client'
import { ScanProgress } from '@/components/ui/scan-progress'

function getRiskColor(riskLevel: string) {
  switch (riskLevel) {
    case 'low':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 70) return 'text-yellow-600 dark:text-yellow-400'
  if (score >= 50) return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

function getInitials(handle: string) {
  if (!handle) return '??'
  const clean = handle.replace('@', '')
  return clean.substring(0, 2).toUpperCase()
}

export function RecentScans() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['recent-scans'],
    queryFn: async () => {
      const response = await n8nClient.getAllScans()
      return response.scans?.slice(0, 5) || []
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (isError || !data || data.length === 0) {
    return (
      <div className='space-y-4 text-center py-8'>
        <p className='text-sm text-muted-foreground'>
          No scans yet. Run your first Twitter reputation scan to see results here.
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-8'>
      {data.map((scan) => {
        // Try multiple possible score locations
        const score = scan.overall_score || scan.analysis_result?.overall_score || scan.summary?.overall_score
        const riskLevel = scan.risk_level || scan.analysis_result?.risk_level || scan.summary?.risk_level || 'unknown'
        const status = scan.status || 'pending'

        return (
          <div key={scan.scan_id} className='flex items-center gap-4'>
            <Avatar className='h-9 w-9 bg-primary/10'>
              <AvatarFallback className='bg-primary/10 text-primary font-semibold'>
                {getInitials(scan.twitter_handle)}
              </AvatarFallback>
            </Avatar>
            <div className='flex flex-1 flex-wrap items-center justify-between gap-2'>
              <div className='space-y-1 min-w-0'>
                <p className='text-sm leading-none font-medium truncate'>
                  @{scan.twitter_handle}
                </p>
                <div className='flex items-center gap-2'>
                  {status === 'completed' && riskLevel !== 'unknown' ? (
                    <Badge
                      variant='outline'
                      className={`text-xs ${getRiskColor(riskLevel)}`}
                    >
                      {riskLevel}
                    </Badge>
                  ) : (
                    <Badge variant='outline' className='text-xs'>
                      {status === 'processing' ? 'Processing...' : status === 'pending' ? 'Pending' : status}
                    </Badge>
                  )}
                  <p className='text-muted-foreground text-xs'>
                    {new Date(scan.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div>
                {status === 'completed' && score !== undefined && score !== null ? (
                  <div className={`font-bold text-lg ${getScoreColor(score)}`}>
                    {Math.round(score)}/100
                  </div>
                ) : status === 'processing' || status === 'pending' ? (
                  <ScanProgress variant='compact' />
                ) : status === 'failed' ? (
                  <span className='text-sm text-destructive font-medium'>Failed</span>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
