import { useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp, Heart, Repeat2, MessageSquare, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ImageAnalysisBadge, ImageAnalysisSection } from './image-analysis-badge'

interface TweetDetailCardProps {
  tweet: {
    text: string
    created_at: string
    has_media?: boolean
    media_count?: number
    media?: any[]
    image_analysis?: {
      analyses?: Array<{
        scene_description: string
        ocr_text: string | null
        sentiment: 'positive' | 'neutral' | 'negative'
        inappropriate_content: {
          detected: boolean
          categories: string[]
          severity: 'low' | 'medium' | 'high' | 'critical'
        }
        confidence_score: number
      }>
      summary?: {
        total_images: number
        has_inappropriate_content: boolean
        max_severity: string
        combined_description: string
        all_ocr_text: string[]
        overall_sentiment: string
      }
    } | null
    has_image_analysis?: boolean
    public_metrics?: {
      likes?: number
      retweets?: number
      replies?: number
      views?: number
    }
  }
  index?: number
  className?: string
}

export function TweetDetailCard({ tweet, index, className }: TweetDetailCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasAnalysisDetails = tweet.has_image_analysis && tweet.image_analysis?.summary

  // Determine border color based on inappropriate content severity
  const getBorderColor = () => {
    if (!tweet.image_analysis?.summary?.has_inappropriate_content) {
      return 'border-border'
    }

    const severity = tweet.image_analysis.summary.max_severity
    switch (severity) {
      case 'critical':
        return 'border-red-500/50'
      case 'high':
        return 'border-orange-500/50'
      case 'medium':
        return 'border-yellow-500/50'
      default:
        return 'border-border'
    }
  }

  return (
    <div
      className={cn(
        'border rounded-lg transition-all duration-200',
        getBorderColor(),
        isExpanded ? 'bg-muted/20' : 'hover:bg-muted/50',
        className
      )}
    >
      {/* Main Tweet Content (Always Visible) */}
      <div className='p-4 space-y-3'>
        {/* Tweet Text */}
        <div className='space-y-2'>
          {index !== undefined && (
            <div className='text-xs text-muted-foreground font-mono'>Tweet #{index + 1}</div>
          )}
          <p className='text-sm leading-relaxed'>{tweet.text}</p>
        </div>

        {/* Media & Analysis Badges */}
        <ImageAnalysisBadge
          hasImages={tweet.has_media}
          hasAnalysis={tweet.has_image_analysis}
          inappropriateContent={tweet.image_analysis?.summary?.has_inappropriate_content}
          severity={tweet.image_analysis?.summary?.max_severity as any}
        />

        {/* Metrics & Expand Button Row */}
        <div className='flex items-center justify-between pt-2 border-t'>
          {/* Engagement Metrics */}
          <div className='flex items-center gap-4 text-xs text-muted-foreground'>
            <span>{format(new Date(tweet.created_at), 'MMM d, yyyy')}</span>
            {tweet.public_metrics && (
              <>
                <div className='flex items-center gap-1'>
                  <Heart className='h-3 w-3' />
                  <span>{tweet.public_metrics.likes || 0}</span>
                </div>
                <div className='flex items-center gap-1'>
                  <Repeat2 className='h-3 w-3' />
                  <span>{tweet.public_metrics.retweets || 0}</span>
                </div>
                <div className='flex items-center gap-1'>
                  <MessageSquare className='h-3 w-3' />
                  <span>{tweet.public_metrics.replies || 0}</span>
                </div>
                {tweet.public_metrics.views !== undefined && (
                  <div className='flex items-center gap-1'>
                    <Eye className='h-3 w-3' />
                    <span>{tweet.public_metrics.views || 0}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Expand/Collapse Button (only show if there's analysis to show) */}
          {hasAnalysisDetails && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setIsExpanded(!isExpanded)}
              className='h-7 text-xs'
            >
              {isExpanded ? (
                <>
                  Collapse
                  <ChevronUp className='ml-1 h-3 w-3' />
                </>
              ) : (
                <>
                  View Analysis
                  <ChevronDown className='ml-1 h-3 w-3' />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Details (Image Analysis) */}
      {isExpanded && hasAnalysisDetails && (
        <div className='px-4 pb-4 border-t bg-muted/30'>
          <div className='pt-4'>
            <ImageAnalysisSection imageAnalysis={tweet.image_analysis!} />
          </div>
        </div>
      )}
    </div>
  )
}
