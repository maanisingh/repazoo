import { cn } from '@/lib/utils'

interface RiskGaugeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function RiskGauge({ score, size = 'md', showLabel = true }: RiskGaugeProps) {
  // Clamp score between 0-100
  const clampedScore = Math.min(100, Math.max(0, score))

  // Calculate color based on score (higher score = lower risk)
  const getColor = (score: number) => {
    if (score >= 70) return 'text-green-500'      // 70-100 = Low Risk (Green)
    if (score >= 40) return 'text-amber-500'      // 40-69 = Medium Risk (Amber)
    if (score >= 20) return 'text-orange-500'     // 20-39 = High Risk (Orange)
    return 'text-red-500'                         // 0-19 = Critical Risk (Red)
  }

  const getRiskLevel = (score: number) => {
    if (score >= 70) return 'Low Risk'
    if (score >= 40) return 'Medium Risk'
    if (score >= 20) return 'High Risk'
    return 'Critical Risk'
  }

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  // Calculate the stroke dash offset for the circle
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference

  return (
    <div className='flex flex-col items-center gap-2'>
      <div className={cn('relative', sizeClasses[size])}>
        <svg
          className='transform -rotate-90'
          width='100%'
          height='100%'
          viewBox='0 0 100 100'
        >
          {/* Background circle */}
          <circle
            cx='50'
            cy='50'
            r={radius}
            stroke='currentColor'
            strokeWidth='8'
            fill='none'
            className='text-muted-foreground/20'
          />
          {/* Progress circle */}
          <circle
            cx='50'
            cy='50'
            r={radius}
            stroke='currentColor'
            strokeWidth='8'
            fill='none'
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap='round'
            className={cn('transition-all duration-500', getColor(clampedScore))}
          />
        </svg>
        {/* Score text in the center */}
        <div className='absolute inset-0 flex items-center justify-center'>
          <span className={cn('font-bold', textSizeClasses[size], getColor(clampedScore))}>
            {Math.round(clampedScore)}
          </span>
        </div>
      </div>
      {showLabel && (
        <div className='text-center'>
          <p className={cn('font-medium', labelSizeClasses[size])}>
            {getRiskLevel(clampedScore)}
          </p>
        </div>
      )}
    </div>
  )
}
