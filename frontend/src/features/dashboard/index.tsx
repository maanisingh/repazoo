import { useQuery, useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Activity, AlertTriangle, BarChart3, Loader2, Scan, Twitter, Shield } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { n8nClient } from '@/lib/api/repazoo-client'
import { Overview } from './components/overview'
import { RecentScans } from './components/recent-scans'
import { CriticalMentions } from './components/critical-mentions'
import { ScoreCircle } from '@/components/ui/score-circle'

export function Dashboard() {
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const [selectedPurpose, setSelectedPurpose] = useState<string>('visa')
  const [customContext, setCustomContext] = useState<string>('')

  // Get real user ID from auth store
  const userId = auth.user?.accountNo || ''

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!auth.isAuthenticated()) {
      toast.error('Please sign in to access the dashboard')
      navigate({ to: '/sign-in', search: { redirect: '/dashboard' } })
    }
  }, [auth, navigate])

  const { data: statsData, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => n8nClient.getDashboardStats(),
  })

  // Check if user has connected Twitter
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user-twitter-status', userId],
    queryFn: () => n8nClient.getUserTwitterStatus(userId),
  })

  const connectTwitterMutation = useMutation({
    mutationFn: async () => {
      // CRITICAL FIX: Always use cfy.repazoo.com callback URL for consistency
      const response = await n8nClient.connectTwitter({
        user_id: userId,
        callback_url: 'https://cfy.repazoo.com/api/twitter/oauth/callback',
      })
      return response
    },
    onSuccess: (data) => {
      if (data.success && data.auth_url) {
        window.location.href = data.auth_url
      } else {
        toast.error(data.error || 'Failed to initiate Twitter connection')
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to connect Twitter')
    },
  })

  const disconnectTwitterMutation = useMutation({
    mutationFn: async () => {
      const response = await n8nClient.disconnectTwitter(userId)
      return response
    },
    onSuccess: () => {
      toast.success('Twitter account disconnected successfully')
      // Refetch user status to update UI
      window.location.reload()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect Twitter')
    },
  })

  const savePurposeMutation = useMutation({
    mutationFn: async (purpose: string) => {
      return await n8nClient.savePurpose({
        user_id: userId,
        purpose: purpose === 'custom' ? customContext : purpose,
        purpose_category: purpose,
      })
    },
    onSuccess: () => {
      toast.success('Purpose saved successfully!')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save purpose')
    },
  })

  const stats = statsData?.stats

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-6 space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>Twitter Reputation Scanner</h1>
              <p className='text-muted-foreground mt-1'>
                Scan your own Twitter account for reputation risks
              </p>
            </div>
          </div>

          {/* Twitter Connection & Self-Scan Card */}
          <Card className='border-2'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Shield className='h-5 w-5' />
                Self-Service Reputation Scan
              </CardTitle>
              <CardDescription>
                Connect your Twitter account and run purpose-based reputation analysis
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Twitter Connection Status */}
              <div className='rounded-lg border bg-muted/50 p-4'>
                {isLoadingUser ? (
                  <div className='flex items-center gap-2'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    <span className='text-sm'>Checking Twitter connection...</span>
                  </div>
                ) : userData?.connected ? (
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-500'>
                        <Twitter className='h-5 w-5 text-white' />
                      </div>
                      <div>
                        <div className='font-medium'>Connected as @{userData.twitter_handle}</div>
                        <div className='text-sm text-muted-foreground'>Ready to scan your account</div>
                      </div>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => disconnectTwitterMutation.mutate()}
                      disabled={disconnectTwitterMutation.isPending}
                    >
                      {disconnectTwitterMutation.isPending ? (
                        <>
                          <Loader2 className='mr-2 h-3 w-3 animate-spin' />
                          Disconnecting...
                        </>
                      ) : (
                        'Disconnect'
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted'>
                        <Twitter className='h-5 w-5 text-muted-foreground' />
                      </div>
                      <div>
                        <div className='font-medium'>Twitter Not Connected</div>
                        <div className='text-sm text-muted-foreground'>Connect to start scanning your account</div>
                      </div>
                    </div>
                    <Button
                      onClick={() => connectTwitterMutation.mutate()}
                      disabled={connectTwitterMutation.isPending}
                    >
                      {connectTwitterMutation.isPending ? (
                        <>
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Twitter className='mr-2 h-4 w-4' />
                          Connect Twitter
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Purpose Selection */}
              {userData?.connected && (
                <>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium'>Scan Purpose</label>
                    <Select value={selectedPurpose} onValueChange={setSelectedPurpose}>
                      <SelectTrigger>
                        <SelectValue placeholder='Select scan purpose' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='visa'>USA Visa Application</SelectItem>
                        <SelectItem value='student'>Student/Academic Application</SelectItem>
                        <SelectItem value='employment'>Employment Background Check</SelectItem>
                        <SelectItem value='general'>General Reputation</SelectItem>
                        <SelectItem value='custom'>Custom Purpose</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedPurpose === 'custom' && (
                      <textarea
                        className='mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm'
                        placeholder='Describe your custom analysis purpose...'
                        value={customContext}
                        onChange={(e) => setCustomContext(e.target.value)}
                        rows={3}
                      />
                    )}
                  </div>

                  <div className='flex gap-3'>
                    <Button
                      onClick={() => savePurposeMutation.mutate(selectedPurpose)}
                      variant='outline'
                      disabled={savePurposeMutation.isPending}
                    >
                      {savePurposeMutation.isPending ? (
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      ) : null}
                      Save Purpose
                    </Button>
                    <Button asChild className='flex-1'>
                      <Link to='/scans/new'>
                        <Scan className='mr-2 h-4 w-4' />
                        Run My Scan
                      </Link>
                    </Button>
                  </div>

                  <div className='rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3'>
                    <div className='text-sm font-medium text-blue-900 dark:text-blue-100 mb-1'>
                      Purpose: {selectedPurpose === 'visa' ? 'USA Visa Application' :
                               selectedPurpose === 'student' ? 'Student Application' :
                               selectedPurpose === 'employment' ? 'Employment Check' :
                               selectedPurpose === 'custom' ? 'Custom' : 'General'}
                    </div>
                    <div className='text-xs text-blue-700 dark:text-blue-300'>
                      {selectedPurpose === 'visa' && 'Analysis focuses on political views, hate speech, illegal content, and immigration concerns'}
                      {selectedPurpose === 'student' && 'Analysis focuses on academic integrity, professionalism, and maturity'}
                      {selectedPurpose === 'employment' && 'Analysis focuses on professional conduct, workplace appropriateness, and brand alignment'}
                      {selectedPurpose === 'general' && 'General reputation analysis covering sentiment, toxicity, and overall online presence'}
                      {selectedPurpose === 'custom' && 'Custom analysis based on your specific requirements'}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <div className='space-y-4'>
            {isLoading ? (
              <div className='flex items-center justify-center py-8'>
                <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
              </div>
            ) : isError ? (
              <div className='flex items-center justify-center py-8'>
                <p className='text-muted-foreground'>Failed to load dashboard stats</p>
              </div>
            ) : (
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>
                      Total Scans
                    </CardTitle>
                    <Scan className='text-muted-foreground h-4 w-4' />
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold'>{stats?.total_scans ?? 0}</div>
                    <p className='text-muted-foreground text-xs'>
                      All reputation scans
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>
                      Today&apos;s Scans
                    </CardTitle>
                    <Activity className='text-muted-foreground h-4 w-4' />
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold'>{stats?.today_scans ?? 0}</div>
                    <p className='text-muted-foreground text-xs'>
                      Scans completed today
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>Average Risk Score</CardTitle>
                    <BarChart3 className='text-muted-foreground h-4 w-4' />
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold'>
                      {stats?.average_risk_score?.toFixed(1) ?? '0.0'}
                    </div>
                    <p className='text-muted-foreground text-xs'>
                      Out of 100
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>
                      High-Risk Accounts
                    </CardTitle>
                    <AlertTriangle className='text-muted-foreground h-4 w-4' />
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold'>{stats?.high_risk_accounts ?? 0}</div>
                    <p className='text-muted-foreground text-xs'>
                      Require attention
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Reputation Score Circle */}
            <Card className='border-2'>
              <CardHeader>
                <CardTitle>Your Reputation Score</CardTitle>
                <CardDescription>
                  Overall reputation score based on your latest scan (Higher is better)
                </CardDescription>
              </CardHeader>
              <CardContent className='flex justify-center py-6'>
                <ScoreCircle
                  score={stats?.average_risk_score ? Math.round(stats.average_risk_score) : 0}
                  size='lg'
                />
              </CardContent>
            </Card>

            {/* Critical Mentions Table */}
            <Card className='border-2 border-red-200 dark:border-red-900'>
              <CardHeader>
                <div className='flex items-center gap-2'>
                  <AlertTriangle className='h-5 w-5 text-red-500' />
                  <CardTitle>Critical Mentions - Action Required</CardTitle>
                </div>
                <CardDescription>
                  High-risk mentions that need your immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CriticalMentions />
              </CardContent>
            </Card>

            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <Card className='col-span-1 lg:col-span-4'>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className='ps-2'>
                  <Overview />
                </CardContent>
              </Card>
              <Card className='col-span-1 lg:col-span-3'>
                <CardHeader>
                  <CardTitle>Recent Scans</CardTitle>
                  <CardDescription>
                    Latest Twitter reputation scans
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentScans />
                </CardContent>
              </Card>
            </div>
        </div>
      </Main>
    </>
  )
}
