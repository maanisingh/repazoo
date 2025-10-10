import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { CheckCircle2, Twitter, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/(auth)/twitter-success' as any)({
  component: TwitterSuccess,
})

function TwitterSuccess() {
  const navigate = useNavigate()

  // Get twitter_handle from URL search params
  const searchParams = new URLSearchParams(window.location.search)
  const twitter_handle = searchParams.get('twitter_handle')

  useEffect(() => {
    toast.success(`Twitter account @${twitter_handle || 'connected'} linked successfully!`)

    // Redirect to dashboard after 3 seconds
    const timer = setTimeout(() => {
      navigate({ to: '/' })
    }, 3000)

    return () => clearTimeout(timer)
  }, [twitter_handle, navigate])

  return (
    <div className='flex min-h-screen items-center justify-center bg-muted/40 p-4'>
      <Card className='w-full max-w-md border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900'>
            <CheckCircle2 className='h-8 w-8 text-green-600 dark:text-green-400' />
          </div>
          <CardTitle className='text-2xl text-green-900 dark:text-green-100'>
            Twitter Connected Successfully!
          </CardTitle>
          <CardDescription className='text-green-700 dark:text-green-300'>
            Your Twitter account has been linked to Repazoo
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {twitter_handle && (
            <div className='rounded-lg border border-green-300 bg-white dark:border-green-800 dark:bg-green-950/40 p-4'>
              <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-500'>
                  <Twitter className='h-5 w-5 text-white' />
                </div>
                <div>
                  <div className='font-medium text-green-900 dark:text-green-100'>
                    @{twitter_handle}
                  </div>
                  <div className='text-sm text-green-700 dark:text-green-300'>
                    Now connected
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className='flex items-center justify-center gap-2 text-sm text-green-700 dark:text-green-300'>
            <Loader2 className='h-4 w-4 animate-spin' />
            <span>Redirecting to dashboard...</span>
          </div>

          <Button
            onClick={() => navigate({ to: '/' })}
            className='w-full'
            variant='outline'
          >
            Go to Dashboard Now
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
