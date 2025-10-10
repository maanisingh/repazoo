import { Badge } from '@/components/ui/badge'
import { Camera, Eye, AlertTriangle, FileText, Smile } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageAnalysisBadgeProps {
  hasImages?: boolean
  hasAnalysis?: boolean
  inappropriateContent?: boolean
  severity?: 'low' | 'medium' | 'high' | 'critical'
  className?: string
}

export function ImageAnalysisBadge({
  hasImages,
  hasAnalysis,
  inappropriateContent,
  severity = 'low',
  className,
}: ImageAnalysisBadgeProps) {
  if (!hasImages) return null

  const severityColors = {
    low: 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400',
    medium: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    high: 'border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400',
    critical: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400',
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {/* Has Images Badge */}
      <Badge variant='outline' className='gap-1'>
        <Camera className='h-3 w-3' />
        <span className='text-xs'>Image</span>
      </Badge>

      {/* AI Vision Analyzed Badge */}
      {hasAnalysis && (
        <Badge variant='outline' className='gap-1 border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400'>
          <Eye className='h-3 w-3' />
          <span className='text-xs'>AI Analyzed</span>
        </Badge>
      )}

      {/* Inappropriate Content Warning */}
      {inappropriateContent && (
        <Badge
          variant='outline'
          className={cn(
            'gap-1',
            severityColors[severity]
          )}
        >
          <AlertTriangle className='h-3 w-3' />
          <span className='text-xs capitalize'>{severity} Risk</span>
        </Badge>
      )}
    </div>
  )
}

interface ImageAnalysisSectionProps {
  imageAnalysis: {
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
  }
  className?: string
}

export function ImageAnalysisSection({ imageAnalysis, className }: ImageAnalysisSectionProps) {
  if (!imageAnalysis?.summary) return null

  const { summary } = imageAnalysis

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return <Smile className='h-4 w-4 text-green-500' />
      case 'negative':
        return <Smile className='h-4 w-4 text-red-500 rotate-180' />
      default:
        return <Smile className='h-4 w-4 text-gray-500' />
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className='flex items-center gap-2'>
        <Eye className='h-4 w-4 text-muted-foreground' />
        <h4 className='text-sm font-semibold'>AI Vision Analysis</h4>
      </div>

      <div className='space-y-2 text-sm'>
        {/* Scene Description */}
        <div className='rounded-md bg-muted/50 p-3'>
          <p className='text-muted-foreground text-xs font-medium mb-1'>Scene Description:</p>
          <p className='text-foreground'>{summary.combined_description}</p>
        </div>

        {/* OCR Text */}
        {summary.all_ocr_text && summary.all_ocr_text.length > 0 && (
          <div className='rounded-md bg-blue-500/5 border border-blue-500/20 p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <FileText className='h-3.5 w-3.5 text-blue-600 dark:text-blue-400' />
              <p className='text-xs font-medium text-blue-600 dark:text-blue-400'>Text Found in Image:</p>
            </div>
            <p className='text-foreground font-mono text-xs'>&quot;{summary.all_ocr_text.join(', ')}&quot;</p>
          </div>
        )}

        {/* Sentiment */}
        <div className='flex items-center gap-2'>
          {getSentimentIcon(summary.overall_sentiment)}
          <span className='text-xs text-muted-foreground'>Image Sentiment:</span>
          <span className='text-xs font-medium capitalize'>{summary.overall_sentiment}</span>
        </div>

        {/* Inappropriate Content Warning */}
        {summary.has_inappropriate_content ? (
          <div className='rounded-md bg-red-500/10 border border-red-500/20 p-3'>
            <div className='flex items-center gap-2'>
              <AlertTriangle className='h-4 w-4 text-red-600 dark:text-red-400' />
              <p className='text-sm font-medium text-red-600 dark:text-red-400'>
                ⚠️ Inappropriate Content Detected
              </p>
            </div>
            <p className='text-xs text-red-600/80 dark:text-red-400/80 mt-1'>
              Severity: <span className='font-semibold capitalize'>{summary.max_severity}</span>
            </p>
          </div>
        ) : (
          <div className='flex items-center gap-2 text-green-600 dark:text-green-400'>
            <span className='text-xs'>✅ No inappropriate content detected</span>
          </div>
        )}

        {/* Confidence Score */}
        {imageAnalysis.analyses && imageAnalysis.analyses.length > 0 && (
          <div className='text-xs text-muted-foreground'>
            Confidence: {Math.round(imageAnalysis.analyses[0].confidence_score * 100)}%
          </div>
        )}
      </div>
    </div>
  )
}
