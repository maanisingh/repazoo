import { cn } from '@/lib/utils'

interface ScoreCircleProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ScoreCircle({ score, size = 'md', className }: ScoreCircleProps) {
  const radius = size === 'sm' ? 40 : size === 'md' ? 60 : 80
  const strokeWidth = size === 'sm' ? 8 : size === 'md' ? 10 : 12
  const normalizedRadius = radius - strokeWidth / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (score / 100) * circumference

  const getColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    if (score >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  const getLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Poor'
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="currentColor"
          className={getColor(score)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
        <text
          x="50%"
          y="50%"
          className={cn('text-2xl font-bold', getColor(score))}
          dominantBaseline="middle"
          textAnchor="middle"
        >
          {score}
        </text>
      </svg>
      <span className={cn('text-sm font-medium', getColor(score))}>
        {getLabel(score)}
      </span>
    </div>
  )
}
