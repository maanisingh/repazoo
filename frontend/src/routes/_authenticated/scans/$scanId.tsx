import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  TrendingUp,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
  Meh,
  Twitter,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { n8nClient } from '@/lib/api/repazoo-client'
import { RiskGauge } from '@/features/reputation/components'
import { ScanProgressDetailed } from '@/components/ui/scan-progress-detailed'
import { DataSourceCard } from '@/components/ui/data-source-card'
import { CacheStatusBadge } from '@/components/ui/cache-status-badge'
import { TweetDetailCard } from '@/components/ui/tweet-detail-card'

export const Route = createFileRoute('/_authenticated/scans/$scanId')({
  component: ScanDetailsPage,
})

function ScanDetailsPage() {
  const { scanId } = Route.useParams()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['scan', scanId],
    queryFn: () => n8nClient.getScanById(scanId),
  })

  const scan = data?.scan

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
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

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6'>
          <Button asChild variant='ghost' size='sm' className='mb-4'>
            <Link to='/scans'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to Scans
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : isError ? (
          <div className='flex flex-col items-center justify-center py-12'>
            <p className='text-destructive text-lg font-medium'>Failed to load scan details</p>
            <p className='text-muted-foreground text-sm mt-2'>
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </div>
        ) : !scan ? (
          <div className='flex flex-col items-center justify-center py-12'>
            <p className='text-muted-foreground text-lg'>Scan not found</p>
          </div>
        ) : (
          <div className='space-y-6'>
            {/* Header Section */}
            <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
              <div>
                <h1 className='text-3xl font-bold tracking-tight flex items-center gap-3'>
                  @{scan.twitter_handle}
                  <Badge variant={getStatusBadgeVariant(scan.status)}>
                    {scan.status}
                  </Badge>
                </h1>
                <p className='text-muted-foreground mt-2'>
                  Scan ID: {scan.scan_id}
                </p>
                <p className='text-muted-foreground text-sm'>
                  Created on {format(new Date(scan.created_at), 'MMMM d, yyyy \'at\' HH:mm')}
                </p>
                {scan.completed_at && (
                  <p className='text-muted-foreground text-sm'>
                    Completed on {format(new Date(scan.completed_at), 'MMMM d, yyyy \'at\' HH:mm')}
                  </p>
                )}
              </div>

              {scan.status === 'completed' && (scan.summary || scan.analysis_result) && (
                <div className='flex justify-center'>
                  <RiskGauge
                    score={scan.summary?.overall_score ?? scan.analysis_result?.overall_score ?? 0}
                    size='lg'
                    showLabel={true}
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Error Message */}
            {scan.status === 'failed' && scan.error_message && (
              <Card className='border-destructive'>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-destructive'>
                    <AlertTriangle className='h-5 w-5' />
                    Scan Failed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-sm'>{scan.error_message}</p>
                </CardContent>
              </Card>
            )}

            {/* Processing State */}
            {(scan.status === 'processing' || scan.status === 'pending') && (
              <Card>
                <CardHeader>
                  <CardTitle>Scan In Progress</CardTitle>
                  <CardDescription>
                    Analyzing @{scan.twitter_handle}'s Twitter profile and activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScanProgressDetailed
                    twitterHandle={scan.twitter_handle}
                    cacheInfo={scan.cache_info || null}
                  />
                </CardContent>
              </Card>
            )}

            {/* Analysis Results */}
            {scan.status === 'completed' && scan.analysis_result && (
              <>
                {/* Cache Status Badge - Show at top of results */}
                {scan.cache_info && (
                  <div className='flex justify-start'>
                    <CacheStatusBadge cacheInfo={scan.cache_info} variant='detailed' />
                  </div>
                )}

                <div className='grid gap-6 md:grid-cols-2'>
                  {/* Data Source Card */}
                  <DataSourceCard cacheInfo={scan.cache_info || null} className='md:col-span-2' />

                  {/* Risk Overview */}
                  <Card>
                  <CardHeader>
                    <CardTitle>Risk Overview</CardTitle>
                    <CardDescription>Overall risk assessment</CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium'>Risk Level</span>
                      <Badge variant={getRiskBadgeVariant(scan.analysis_result.risk_level)}>
                        {scan.analysis_result.risk_level}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium'>Overall Score</span>
                      <span className='text-lg font-bold'>
                        {scan.analysis_result.overall_score.toFixed(1)}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium'>Toxicity Score</span>
                      <span className='text-lg font-bold'>
                        {scan.analysis_result.toxicity_score.toFixed(1)}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium'>Hate Speech Detected</span>
                      {scan.analysis_result.hate_speech_detected ? (
                        <AlertTriangle className='h-5 w-5 text-destructive' />
                      ) : (
                        <CheckCircle2 className='h-5 w-5 text-green-500' />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Sentiment Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sentiment Analysis</CardTitle>
                    <CardDescription>Tweet sentiment breakdown</CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='space-y-3'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <ThumbsUp className='h-4 w-4 text-green-500' />
                          <span className='text-sm font-medium'>Positive</span>
                        </div>
                        <span className='text-lg font-bold'>
                          {(scan.analysis_result.sentiment.positive * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <Meh className='h-4 w-4 text-yellow-500' />
                          <span className='text-sm font-medium'>Neutral</span>
                        </div>
                        <span className='text-lg font-bold'>
                          {(scan.analysis_result.sentiment.neutral * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <ThumbsDown className='h-4 w-4 text-red-500' />
                          <span className='text-sm font-medium'>Negative</span>
                        </div>
                        <span className='text-lg font-bold'>
                          {(scan.analysis_result.sentiment.negative * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Findings */}
                {scan.analysis_result.key_findings && scan.analysis_result.key_findings.length > 0 && (
                  <Card className='md:col-span-2'>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2'>
                        <TrendingUp className='h-5 w-5' />
                        Key Findings
                      </CardTitle>
                      <CardDescription>Important observations from the analysis</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className='space-y-2'>
                        {scan.analysis_result.key_findings.map((finding, index) => (
                          <li key={index} className='flex items-start gap-2'>
                            <span className='text-muted-foreground mt-1'>•</span>
                            <span className='text-sm'>{finding}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                {scan.analysis_result.recommendations && scan.analysis_result.recommendations.length > 0 && (
                  <Card className='md:col-span-2'>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2'>
                        <MessageSquare className='h-5 w-5' />
                        Recommendations
                      </CardTitle>
                      <CardDescription>Actions to improve reputation</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className='space-y-2'>
                        {scan.analysis_result.recommendations.map((recommendation, index) => (
                          <li key={index} className='flex items-start gap-2'>
                            <span className='text-muted-foreground mt-1'>•</span>
                            <span className='text-sm'>{recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Analyzed Tweets */}
                {scan.analysis_result.tweets_list && scan.analysis_result.tweets_list.length > 0 && (
                  <Card className='md:col-span-2'>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2'>
                        <Twitter className='h-5 w-5' />
                        Analyzed Tweets
                      </CardTitle>
                      <CardDescription>
                        {scan.analysis_result.tweets_analyzed || scan.analysis_result.tweets_list.length} tweets analyzed in this scan
                        {scan.analysis_result.tweets_list.some((t: any) => t.has_image_analysis) && (
                          <span className='ml-2 text-blue-600 dark:text-blue-400'>
                            • {scan.analysis_result.tweets_list.filter((t: any) => t.has_image_analysis).length} with AI vision analysis
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-3'>
                        {scan.analysis_result.tweets_list.map((tweet: any, index: number) => (
                          <TweetDetailCard key={index} tweet={tweet} index={index} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                </div>
              </>
            )}
          </div>
        )}
      </Main>
    </>
  )
}
