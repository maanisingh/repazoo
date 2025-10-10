import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2, Scan, Twitter, AlertCircle, RefreshCw } from 'lucide-react'
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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
import { Checkbox } from '@/components/ui/checkbox'
import { n8nClient } from '@/lib/api/repazoo-client'

const newScanSchema = z.object({
  purpose: z.string().min(1, 'Purpose is required'),
  custom_context: z.string().optional(),
  force_rescan: z.boolean().optional(),
})

type NewScanFormValues = z.infer<typeof newScanSchema>

export const Route = createFileRoute('/_authenticated/scans/new')({
  component: NewScanPage,
})

function NewScanPage() {
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const [createdScanId, setCreatedScanId] = useState<string | null>(null)

  // Get real user ID from auth store
  const userId = auth.user?.accountNo || ''

  // Check if user has connected Twitter
  const { data: userData } = useQuery({
    queryKey: ['user-twitter-status', userId],
    queryFn: () => n8nClient.getUserTwitterStatus(userId),
  })

  const form = useForm<NewScanFormValues>({
    resolver: zodResolver(newScanSchema),
    defaultValues: {
      purpose: 'visa',
      custom_context: '',
      force_rescan: false,
    },
  })

  const purpose = form.watch('purpose')

  const connectTwitterMutation = useMutation({
    mutationFn: async () => {
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

  const createScanMutation = useMutation({
    mutationFn: (data: NewScanFormValues) => {
      const scanId = n8nClient.generateScanId()

      return n8nClient.createScan({
        twitter_handle: userData?.twitter_handle || '',
        user_id: userId,
        scan_id: scanId,
        purpose: data.purpose,
        custom_context: data.custom_context || '',
        force_rescan: data.force_rescan || false,
      })
    },
    onSuccess: (response) => {
      if (response.status === 'success' && response.scan_id) {
        toast.success('Self-scan started successfully!')
        setCreatedScanId(response.scan_id)

        setTimeout(() => {
          navigate({
            to: '/scans/$scanId',
            params: { scanId: response.scan_id },
          })
        }, 1500)
      } else if (response.error) {
        toast.error(response.error)
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to start scan. Please try again.'
      )
    },
  })

  const onSubmit = (data: NewScanFormValues) => {
    if (!userData?.connected) {
      toast.error('Please connect your Twitter account first')
      return
    }
    createScanMutation.mutate(data)
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
            <Link to='/'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to Dashboard
            </Link>
          </Button>

          <h1 className='text-3xl font-bold tracking-tight'>Run Self-Scan</h1>
          <p className='text-muted-foreground mt-1'>
            Analyze your own Twitter account for reputation risks
          </p>
        </div>

        <div className='max-w-2xl space-y-4'>
          {/* Twitter Connection Status */}
          {!userData?.connected && (
            <Card className='border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-yellow-900 dark:text-yellow-100'>
                  <AlertCircle className='h-5 w-5' />
                  Twitter Account Not Connected
                </CardTitle>
                <CardDescription className='text-yellow-700 dark:text-yellow-300'>
                  You need to connect your Twitter account before running a self-scan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => connectTwitterMutation.mutate()}
                  disabled={connectTwitterMutation.isPending}
                  className='w-full'
                >
                  {connectTwitterMutation.isPending ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Twitter className='mr-2 h-4 w-4' />
                      Connect Twitter Account
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Scan Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Scan className='h-5 w-5' />
                Self-Service Reputation Scan
              </CardTitle>
              <CardDescription>
                {userData?.connected
                  ? `Scanning your account: @${userData.twitter_handle}`
                  : 'Connect your Twitter account to begin'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                  <FormField
                    control={form.control}
                    name='purpose'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scan Purpose</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={!userData?.connected || createScanMutation.isPending || !!createdScanId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder='Select your scan purpose' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='visa'>USA Visa Application</SelectItem>
                            <SelectItem value='student'>Student/Academic Application</SelectItem>
                            <SelectItem value='employment'>Employment Background Check</SelectItem>
                            <SelectItem value='general'>General Reputation Analysis</SelectItem>
                            <SelectItem value='custom'>Custom Purpose</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose the context for your reputation analysis
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {purpose === 'custom' && (
                    <FormField
                      control={form.control}
                      name='custom_context'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Context</FormLabel>
                          <FormControl>
                            <textarea
                              className='w-full rounded-md border bg-background px-3 py-2 text-sm'
                              placeholder='Describe your specific analysis requirements...'
                              rows={4}
                              {...field}
                              disabled={!userData?.connected || createScanMutation.isPending || !!createdScanId}
                            />
                          </FormControl>
                          <FormDescription>
                            Provide details about what you want to analyze
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Force Rescan Checkbox */}
                  <FormField
                    control={form.control}
                    name='force_rescan'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4'>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!userData?.connected || createScanMutation.isPending || !!createdScanId}
                          />
                        </FormControl>
                        <div className='space-y-1 leading-none'>
                          <FormLabel className='flex items-center gap-2'>
                            <RefreshCw className='h-4 w-4' />
                            Force Full Rescan
                          </FormLabel>
                          <FormDescription>
                            Ignore cached data and fetch all tweets fresh from Twitter. This will take longer but ensures you get the most up-to-date analysis.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Purpose Info Box */}
                  {purpose && (
                    <div className='rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4'>
                      <div className='text-sm font-medium text-blue-900 dark:text-blue-100 mb-2'>
                        Analysis Focus: {
                          purpose === 'visa' ? 'USA Visa Application' :
                          purpose === 'student' ? 'Student/Academic Application' :
                          purpose === 'employment' ? 'Employment Background Check' :
                          purpose === 'custom' ? 'Custom Analysis' :
                          'General Reputation'
                        }
                      </div>
                      <ul className='text-xs text-blue-700 dark:text-blue-300 space-y-1'>
                        {purpose === 'visa' && (
                          <>
                            <li>• Political views and controversial content</li>
                            <li>• Security concerns and extremism</li>
                            <li>• Immigration policy violations</li>
                            <li>• Character assessment for visa officers</li>
                          </>
                        )}
                        {purpose === 'student' && (
                          <>
                            <li>• Academic integrity and professionalism</li>
                            <li>• Signs of plagiarism or dishonesty</li>
                            <li>• Maturity and readiness for study</li>
                            <li>• Illegal activities or substance abuse</li>
                          </>
                        )}
                        {purpose === 'employment' && (
                          <>
                            <li>• Professional conduct and appropriateness</li>
                            <li>• Discriminatory or offensive content</li>
                            <li>• Comments about employers or colleagues</li>
                            <li>• Brand reputation impact</li>
                          </>
                        )}
                        {purpose === 'general' && (
                          <>
                            <li>• Overall sentiment and tone</li>
                            <li>• Controversial or problematic posts</li>
                            <li>• Harassment or toxic behavior</li>
                            <li>• Privacy and security concerns</li>
                          </>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className='flex gap-3'>
                    <Button
                      type='submit'
                      disabled={!userData?.connected || createScanMutation.isPending || !!createdScanId}
                      className='flex-1'
                    >
                      {createScanMutation.isPending ? (
                        <>
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                          Running Scan...
                        </>
                      ) : createdScanId ? (
                        <>
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                          Redirecting...
                        </>
                      ) : (
                        <>
                          <Scan className='mr-2 h-4 w-4' />
                          Run My Self-Scan
                        </>
                      )}
                    </Button>

                    <Button
                      type='button'
                      variant='outline'
                      asChild
                      disabled={createScanMutation.isPending || !!createdScanId}
                    >
                      <Link to='/'>Cancel</Link>
                    </Button>
                  </div>
                </form>
              </Form>

              {/* Info Section */}
              <div className='mt-6 pt-6 border-t'>
                <h3 className='text-sm font-medium mb-3'>What gets analyzed:</h3>
                <ul className='space-y-2 text-sm text-muted-foreground'>
                  <li className='flex items-start gap-2'>
                    <span className='text-primary mt-1'>•</span>
                    <span>Your recent tweets and retweets</span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <span className='text-primary mt-1'>•</span>
                    <span>Purpose-specific risk assessment (0-100)</span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <span className='text-primary mt-1'>•</span>
                    <span>Sentiment analysis (positive, neutral, negative)</span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <span className='text-primary mt-1'>•</span>
                    <span>Toxicity detection and problematic content</span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <span className='text-primary mt-1'>•</span>
                    <span>Actionable recommendations for improvement</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
