import { Badge } from '@/components/ui/badge'
import { RefreshCw, Database, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CacheInfo {
  used_cached_tweets?: boolean
  used_cached_analysis?: boolean
  new_tweets_analyzed?: number
  new_tweets_fetched?: number
  total_tweets_cached?: number
  last_sync?: string | null
}

interface CacheStatusBadgeProps {
  cacheInfo: CacheInfo | null
  needsRefresh?: boolean
  className?: string
  variant?: 'default' | 'detailed'
}

export function CacheStatusBadge({
  cacheInfo,
  needsRefresh = false,
  className,
  variant = 'default',
}: CacheStatusBadgeProps) {
  // If no cache info, show default state
  if (!cacheInfo) {
    return (
      <Badge variant='outline' className={cn('bg-blue-50 text-blue-700', className)}>
        <RefreshCw className='mr-1 h-3 w-3' />
        First scan
      </Badge>
    )
  }

  // Show refresh needed badge
  if (needsRefresh) {
    return (
      <Badge variant='outline' className={cn('bg-yellow-50 text-yellow-700', className)}>
        <RefreshCw className='mr-1 h-3 w-3' />
        Will fetch new tweets
      </Badge>
    )
  }

  // Show cache status based on what happened
  if (variant === 'detailed') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {cacheInfo.used_cached_tweets && (
          <Badge variant='outline' className='bg-green-50 text-green-700'>
            <Database className='mr-1 h-3 w-3' />
            {cacheInfo.total_tweets_cached || 0} tweets cached
          </Badge>
        )}

        {cacheInfo.new_tweets_fetched !== undefined && cacheInfo.new_tweets_fetched > 0 && (
          <Badge variant='outline' className='bg-blue-50 text-blue-700'>
            <RefreshCw className='mr-1 h-3 w-3' />
            {cacheInfo.new_tweets_fetched} new tweets fetched
          </Badge>
        )}

        {cacheInfo.used_cached_analysis && (
          <Badge variant='outline' className='bg-purple-50 text-purple-700'>
            <Database className='mr-1 h-3 w-3' />
            Reused previous analysis
          </Badge>
        )}

        {cacheInfo.new_tweets_analyzed !== undefined && cacheInfo.new_tweets_analyzed > 0 && (
          <Badge variant='outline' className='bg-orange-50 text-orange-700'>
            <RefreshCw className='mr-1 h-3 w-3' />
            {cacheInfo.new_tweets_analyzed} tweets analyzed
          </Badge>
        )}

        {cacheInfo.last_sync && (
          <Badge variant='outline' className='bg-gray-50 text-gray-700'>
            <Clock className='mr-1 h-3 w-3' />
            Last sync: {new Date(cacheInfo.last_sync).toLocaleDateString()}
          </Badge>
        )}
      </div>
    )
  }

  // Default compact variant
  if (cacheInfo.used_cached_analysis) {
    return (
      <Badge variant='outline' className={cn('bg-purple-50 text-purple-700', className)}>
        <Database className='mr-1 h-3 w-3' />
        Used cached analysis
      </Badge>
    )
  }

  if (cacheInfo.used_cached_tweets) {
    return (
      <Badge variant='outline' className={cn('bg-green-50 text-green-700', className)}>
        <Database className='mr-1 h-3 w-3' />
        Up to date
      </Badge>
    )
  }

  return (
    <Badge variant='outline' className={cn('bg-blue-50 text-blue-700', className)}>
      <RefreshCw className='mr-1 h-3 w-3' />
      Fresh scan
    </Badge>
  )
}
