import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { XCircle, Twitter, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export const Route = createFileRoute('/(auth)/twitter-error' as any)({
  component: TwitterError,
})

function TwitterError() {
  const navigate = useNavigate()

  // Get error from URL search params
  const searchParams = new URLSearchParams(window.location.search)
  const error = searchParams.get('error')

  const errorMessage = error
    ? decodeURIComponent(error)
    : 'Failed to connect Twitter account'

  return (
    <div className='flex min-h-screen items-center justify-center bg-muted/40 p-4'>
      <Card className='w-full max-w-md border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900'>
            <XCircle className='h-8 w-8 text-red-600 dark:text-red-400' />
          </div>
          <CardTitle className='text-2xl text-red-900 dark:text-red-100'>
            Twitter Connection Failed
          </CardTitle>
          <CardDescription className='text-red-700 dark:text-red-300'>
            We couldn't connect your Twitter account
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Alert variant='destructive'>
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>

          <div className='rounded-lg border border-red-300 bg-white dark:border-red-800 dark:bg-red-950/40 p-4'>
            <h3 className='font-medium text-red-900 dark:text-red-100 mb-2'>
              Common Issues:
            </h3>
            <ul className='space-y-1 text-sm text-red-700 dark:text-red-300'>
              <li>• You may have denied permission on Twitter</li>
              <li>• The authorization may have expired</li>
              <li>• Network connection issues</li>
              <li>• Twitter API temporary issue</li>
            </ul>
          </div>

          <div className='space-y-2'>
            <Button
              onClick={() => navigate({ to: '/' })}
              className='w-full'
            >
              <Twitter className='mr-2 h-4 w-4' />
              Try Again
            </Button>

            <Button
              onClick={() => navigate({ to: '/' })}
              variant='outline'
              className='w-full'
            >
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
