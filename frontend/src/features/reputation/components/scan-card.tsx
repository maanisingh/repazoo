import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { type Scan } from '@/lib/api/n8n-client'
import { RiskGauge } from './risk-gauge'
import { ScanProgress } from '@/components/ui/scan-progress'

interface ScanCardProps {
  scan: Scan
}

export function ScanCard({ scan }: ScanCardProps) {
  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low':
        return 'default'
      case 'medium':
        return 'secondary'
      case 'high':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'default'
      case 'processing':
        return 'secondary'
      case 'failed':
        return 'destructive'
      case 'pending':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const overallScore = scan.summary?.overall_score ?? scan.analysis_result?.overall_score ?? 0
  const riskLevel = scan.summary?.risk_level ?? scan.analysis_result?.risk_level ?? 'Unknown'

  return (
    <Card className='hover:shadow-lg transition-shadow'>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <CardTitle className='flex items-center gap-2'>
              @{scan.twitter_handle}
              <Badge variant={getStatusBadgeVariant(scan.status)}>
                {scan.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              Scanned on {format(new Date(scan.created_at), 'MMM d, yyyy')}
            </CardDescription>
          </div>
          {scan.status === 'completed' && (
            <RiskGauge score={overallScore} size='sm' showLabel={false} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className='space-y-2'>
          {scan.status === 'completed' && (
            <>
              <div className='flex justify-between items-center'>
                <span className='text-sm text-muted-foreground'>Risk Level:</span>
                <Badge variant={getRiskBadgeVariant(riskLevel)}>
                  {riskLevel}
                </Badge>
              </div>
              {scan.summary?.toxicity_score !== undefined && (
                <div className='flex justify-between items-center'>
                  <span className='text-sm text-muted-foreground'>Toxicity Score:</span>
                  <span className='text-sm font-medium'>
                    {scan.summary.toxicity_score.toFixed(1)}
                  </span>
                </div>
              )}
            </>
          )}
          {scan.status === 'failed' && scan.error_message && (
            <p className='text-sm text-destructive'>{scan.error_message}</p>
          )}
          {(scan.status === 'processing' || scan.status === 'pending') && (
            <ScanProgress variant='default' />
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild variant='outline' size='sm' className='w-full'>
          <Link to='/scans/$scanId' params={{ scanId: scan.scan_id }}>
            View Details <ExternalLink className='ml-2 h-4 w-4' />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
