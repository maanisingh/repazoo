import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScanProgressProps {
  variant?: 'default' | 'compact'
  className?: string
}

export function ScanProgress({ variant = 'default', className }: ScanProgressProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Clock className='h-4 w-4 animate-spin text-muted-foreground' />
        <div className='relative h-1.5 w-24 overflow-hidden rounded-full bg-muted'>
          <div className='scan-progress-bar h-full bg-primary' />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Clock className='h-5 w-5 animate-spin text-primary' />
          <span className='text-sm font-medium'>Analyzing your scan...</span>
        </div>
      </div>
      <div className='relative h-2 w-full overflow-hidden rounded-full bg-muted'>
        <div className='scan-progress-bar h-full bg-primary' />
      </div>
      <p className='text-xs text-muted-foreground'>
        This usually takes a few moments
      </p>
    </div>
  )
}
