import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { n8nClient } from '@/lib/api/repazoo-client'
import { Loader2 } from 'lucide-react'

export function Overview() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['all-scans-for-chart'],
    queryFn: async () => {
      const response = await n8nClient.getAllScans()
      return response.scans || []
    },
    refetchInterval: 60000, // Refresh every minute
  })

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-[350px]'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (isError || !data || data.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-[350px] text-center px-4'>
        <p className='text-muted-foreground text-sm'>
          No scan data available yet. Run your first scan to see activity insights here.
        </p>
      </div>
    )
  }

  // Check if all scans are from today to show hourly breakdown
  const now = new Date()
  const today = now.toDateString()
  const allToday = data.every((scan: any) => new Date(scan.created_at).toDateString() === today)

  // Group scans by time period and calculate average scores
  const scansByPeriod = data.reduce((acc: any, scan: any) => {
    const scanDate = new Date(scan.created_at)

    // If all scans are today, group by hour, otherwise by date
    const period = allToday
      ? scanDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
      : scanDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    if (!acc[period]) {
      acc[period] = { period, scores: [], count: 0 }
    }

    // Try multiple possible score locations
    const score = scan.overall_score || scan.analysis_result?.overall_score || scan.summary?.overall_score
    if (score !== undefined && score !== null) {
      acc[period].scores.push(score)
    }
    acc[period].count++

    return acc
  }, {})

  // Convert to array and calculate averages
  const chartData = Object.values(scansByPeriod)
    .map((item: any) => ({
      period: item.period,
      avgScore: item.scores.length > 0
        ? Math.round(item.scores.reduce((a: number, b: number) => a + b, 0) / item.scores.length)
        : 0,
      scanCount: item.count,
      completedCount: item.scores.length,
    }))
    .slice(-12) // Show last 12 data points

  return (
    <ResponsiveContainer width='100%' height={350}>
      <BarChart data={chartData}>
        <XAxis
          dataKey='period'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload
              return (
                <div className='rounded-lg border bg-background p-2 shadow-sm'>
                  <div className='grid gap-2'>
                    <div className='flex flex-col'>
                      <span className='text-[0.70rem] uppercase text-muted-foreground'>
                        {data.period}
                      </span>
                      <span className='font-bold text-muted-foreground'>
                        Avg Score: {payload[0].value}/100
                      </span>
                      <span className='text-[0.70rem] text-muted-foreground'>
                        {data.scanCount} total ({data.completedCount} completed)
                      </span>
                    </div>
                  </div>
                </div>
              )
            }
            return null
          }}
        />
        <Bar
          dataKey='avgScore'
          fill='currentColor'
          radius={[4, 4, 0, 0]}
          className='fill-primary'
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
