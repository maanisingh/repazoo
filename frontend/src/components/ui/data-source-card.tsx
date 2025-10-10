import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, RefreshCw, Twitter, Clock, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CacheInfo {
  used_cached_tweets?: boolean
  used_cached_analysis?: boolean
  new_tweets_analyzed?: number
  new_tweets_fetched?: number
  total_tweets_cached?: number
  last_sync?: string | null
}

interface DataSourceCardProps {
  cacheInfo: CacheInfo | null
  className?: string
}

export function DataSourceCard({ cacheInfo, className }: DataSourceCardProps) {
  if (!cacheInfo) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <Twitter className='h-5 w-5' />
            Data Source
          </CardTitle>
          <CardDescription>Information about the analyzed data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            <div className='flex items-start gap-3'>
              <div className='rounded-full bg-blue-100 p-2'>
                <RefreshCw className='h-4 w-4 text-blue-600' />
              </div>
              <div className='flex-1'>
                <p className='text-sm font-medium'>Fresh Scan</p>
                <p className='text-xs text-muted-foreground'>All data fetched and analyzed from Twitter API</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Less than 1 hour ago'
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <Database className='h-5 w-5' />
          Data Source
        </CardTitle>
        <CardDescription>How this analysis was performed</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {/* Cache Status */}
          <div className='flex items-start gap-3'>
            <div className={cn(
              'rounded-full p-2',
              cacheInfo.used_cached_tweets ? 'bg-green-100' : 'bg-blue-100'
            )}>
              {cacheInfo.used_cached_tweets ? (
                <Database className='h-4 w-4 text-green-600' />
              ) : (
                <RefreshCw className='h-4 w-4 text-blue-600' />
              )}
            </div>
            <div className='flex-1'>
              <p className='text-sm font-medium'>
                {cacheInfo.used_cached_tweets ? 'Smart Cache Active' : 'Fresh Data Fetch'}
              </p>
              <p className='text-xs text-muted-foreground'>
                {cacheInfo.used_cached_tweets
                  ? `Using ${cacheInfo.total_tweets_cached || 0} cached tweets for faster analysis`
                  : 'All data fetched directly from Twitter API'}
              </p>
            </div>
          </div>

          {/* New Tweets Fetched */}
          {cacheInfo.new_tweets_fetched !== undefined && cacheInfo.new_tweets_fetched > 0 && (
            <div className='flex items-start gap-3'>
              <div className='rounded-full bg-blue-100 p-2'>
                <TrendingUp className='h-4 w-4 text-blue-600' />
              </div>
              <div className='flex-1'>
                <p className='text-sm font-medium'>New Content Detected</p>
                <p className='text-xs text-muted-foreground'>
                  Found and analyzed {cacheInfo.new_tweets_fetched} new tweet
                  {cacheInfo.new_tweets_fetched > 1 ? 's' : ''} since last scan
                </p>
              </div>
            </div>
          )}

          {/* Analysis Strategy */}
          <div className='flex items-start gap-3'>
            <div className={cn(
              'rounded-full p-2',
              cacheInfo.used_cached_analysis ? 'bg-purple-100' : 'bg-orange-100'
            )}>
              {cacheInfo.used_cached_analysis ? (
                <Database className='h-4 w-4 text-purple-600' />
              ) : (
                <RefreshCw className='h-4 w-4 text-orange-600' />
              )}
            </div>
            <div className='flex-1'>
              <p className='text-sm font-medium'>
                {cacheInfo.used_cached_analysis ? 'Reused Previous Analysis' : 'Fresh AI Analysis'}
              </p>
              <p className='text-xs text-muted-foreground'>
                {cacheInfo.used_cached_analysis
                  ? 'No new content detected, using previous analysis results'
                  : cacheInfo.new_tweets_analyzed !== undefined
                  ? `AI analyzed ${cacheInfo.new_tweets_analyzed} tweet${cacheInfo.new_tweets_analyzed > 1 ? 's' : ''}`
                  : 'AI processed all content for this scan'}
              </p>
            </div>
          </div>

          {/* Last Sync */}
          {cacheInfo.last_sync && (
            <div className='flex items-start gap-3'>
              <div className='rounded-full bg-gray-100 p-2'>
                <Clock className='h-4 w-4 text-gray-600' />
              </div>
              <div className='flex-1'>
                <p className='text-sm font-medium'>Last Twitter Sync</p>
                <p className='text-xs text-muted-foreground'>{formatDate(cacheInfo.last_sync)}</p>
              </div>
            </div>
          )}

          {/* Efficiency Info */}
          {cacheInfo.used_cached_tweets && (
            <div className='mt-4 rounded-lg bg-green-50 p-3 border border-green-100'>
              <p className='text-xs text-green-800'>
                <span className='font-semibold'>💡 Smart Caching Benefit:</span> This scan was faster and more
                efficient by reusing cached data. We only fetch and analyze new content, saving time and API calls.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
