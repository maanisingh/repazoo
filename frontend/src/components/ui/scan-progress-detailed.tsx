import { Clock, CheckCircle2, Loader2, Twitter, Brain, Shield, FileSearch, Database } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface ScanStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'complete'
  icon: React.ReactNode
  detail?: string
}

interface CacheInfo {
  used_cached_tweets?: boolean
  used_cached_analysis?: boolean
  new_tweets_analyzed?: number
  new_tweets_fetched?: number
  total_tweets_cached?: number
}

interface ScanProgressDetailedProps {
  className?: string
  twitterHandle?: string
  cacheInfo?: CacheInfo | null
}

export function ScanProgressDetailed({ className, twitterHandle, cacheInfo }: ScanProgressDetailedProps) {
  const [currentStep, setCurrentStep] = useState(0)

  // Determine fetch step label based on cache info
  const getFetchStepLabel = () => {
    if (cacheInfo?.used_cached_tweets) {
      return 'Checking for new tweets'
    }
    return 'Fetching recent tweets'
  }

  const getFetchStepDetail = () => {
    if (cacheInfo?.used_cached_tweets && cacheInfo.new_tweets_fetched === 0) {
      return `Using ${cacheInfo.total_tweets_cached || 0} cached tweets (up to date)`
    }
    if (cacheInfo?.new_tweets_fetched) {
      return `Found ${cacheInfo.new_tweets_fetched} new tweets, using cache for the rest`
    }
    return `Retrieving tweets from @${twitterHandle || 'user'}`
  }

  const getAnalyzeStepLabel = () => {
    if (cacheInfo?.used_cached_analysis) {
      return 'Reusing previous analysis'
    }
    if (cacheInfo?.new_tweets_analyzed && cacheInfo.new_tweets_analyzed < (cacheInfo.total_tweets_cached || 0)) {
      return 'Analyzing new tweets only'
    }
    return 'Analyzing content with AI'
  }

  const getAnalyzeStepDetail = () => {
    if (cacheInfo?.used_cached_analysis) {
      return 'No new content, using previous results'
    }
    if (cacheInfo?.new_tweets_analyzed !== undefined && cacheInfo.new_tweets_analyzed > 0) {
      return `Analyzing ${cacheInfo.new_tweets_analyzed} new tweets from @${twitterHandle}'s account (${cacheInfo.total_tweets_cached || 0} total cached)`
    }
    if (cacheInfo?.total_tweets_cached) {
      return `Analyzing ${cacheInfo.total_tweets_cached} tweets from @${twitterHandle}'s timeline`
    }
    return `Analyzing tweets from @${twitterHandle}'s account with AI`
  }

  const steps: ScanStep[] = [
    {
      id: 'connect',
      label: 'Connecting to Twitter API',
      status: currentStep > 0 ? 'complete' : currentStep === 0 ? 'active' : 'pending',
      icon: <Twitter className="h-4 w-4" />,
      detail: 'Authenticating and establishing secure connection'
    },
    {
      id: 'fetch',
      label: getFetchStepLabel(),
      status: currentStep > 1 ? 'complete' : currentStep === 1 ? 'active' : 'pending',
      icon: cacheInfo?.used_cached_tweets ? <Database className="h-4 w-4" /> : <FileSearch className="h-4 w-4" />,
      detail: getFetchStepDetail()
    },
    {
      id: 'analyze',
      label: getAnalyzeStepLabel(),
      status: currentStep > 2 ? 'complete' : currentStep === 2 ? 'active' : 'pending',
      icon: cacheInfo?.used_cached_analysis ? <Database className="h-4 w-4" /> : <Brain className="h-4 w-4" />,
      detail: getAnalyzeStepDetail()
    },
    {
      id: 'risk',
      label: 'Calculating risk scores',
      status: currentStep > 3 ? 'complete' : currentStep === 3 ? 'active' : 'pending',
      icon: <Shield className="h-4 w-4" />,
      detail: 'Evaluating sentiment, toxicity, and reputation factors'
    },
    {
      id: 'report',
      label: 'Generating final report',
      status: currentStep > 4 ? 'complete' : currentStep === 4 ? 'active' : 'pending',
      icon: <CheckCircle2 className="h-4 w-4" />,
      detail: 'Compiling findings and recommendations'
    }
  ]

  // Simulate progress through steps (stops at completion, no loop)
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(stepInterval) // Stop at final step
          return prev
        }
        return prev + 1
      })
    }, 4000) // Change step every 4 seconds

    return () => clearInterval(stepInterval)
  }, [steps.length])


  return (
    <div className={cn('space-y-6', className)}>
      {/* Main progress header */}
      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <Clock className='h-5 w-5 animate-spin text-primary' />
          <span className='text-sm font-medium'>Scan In Progress</span>
        </div>
        <div className='relative h-2 w-full overflow-hidden rounded-full bg-muted'>
          <div className='scan-progress-bar h-full bg-primary' />
        </div>
      </div>

      {/* Step-by-step breakdown */}
      <div className='space-y-3'>
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3 transition-all duration-300',
              step.status === 'active' && 'border-primary/50 bg-primary/5',
              step.status === 'complete' && 'border-green-500/30 bg-green-500/5 opacity-60',
              step.status === 'pending' && 'border-muted-foreground/20 opacity-40'
            )}
          >
            <div className={cn(
              'mt-0.5 flex h-6 w-6 items-center justify-center rounded-full',
              step.status === 'active' && 'bg-primary/20 text-primary',
              step.status === 'complete' && 'bg-green-500/20 text-green-500',
              step.status === 'pending' && 'bg-muted text-muted-foreground'
            )}>
              {step.status === 'active' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : step.status === 'complete' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                step.icon
              )}
            </div>
            <div className='flex-1 space-y-1'>
              <div className='flex items-center justify-between'>
                <span className={cn(
                  'text-sm font-medium',
                  step.status === 'active' && 'text-foreground',
                  step.status === 'complete' && 'text-muted-foreground',
                  step.status === 'pending' && 'text-muted-foreground'
                )}>
                  {step.label}
                </span>
                {step.status === 'active' && (
                  <span className='text-xs text-muted-foreground'>In progress...</span>
                )}
                {step.status === 'complete' && (
                  <span className='text-xs text-green-500'>✓ Done</span>
                )}
              </div>
              {step.detail && step.status !== 'pending' && (
                <p className='text-xs text-muted-foreground'>
                  {step.detail}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Live tweet analysis feed */}
      {currentStep === 2 && (
        <div className='space-y-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300'>
          <div className='rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2'>
            <div className='flex items-center gap-2'>
              <Brain className="h-4 w-4 animate-pulse text-primary" />
              <p className='text-sm font-medium text-foreground'>
                Analyzing your real tweets with AI...
              </p>
            </div>
            <p className='text-xs text-muted-foreground'>
              {cacheInfo?.total_tweets_cached
                ? `Processing ${cacheInfo.total_tweets_cached} tweets from @${twitterHandle}'s account using Llama 3`
                : `Processing tweets from @${twitterHandle}'s account using local AI`
              }
            </p>
          </div>
        </div>
      )}

      {/* Helpful tip */}
      <div className='rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground'>
        💡 <span className='font-medium'>Tip:</span> This process typically takes 1-3 minutes depending on account activity.
        You can safely leave this page and check back later.
      </div>
    </div>
  )
}
