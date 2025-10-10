import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { Loader2, LogIn, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { IconFacebook, IconGithub } from '@/assets/brand-icons'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const formSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? 'Please enter your email' : undefined),
  }),
  password: z
    .string()
    .min(1, 'Please enter your password')
    .min(7, 'Password must be at least 7 characters long'),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { auth } = useAuthStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setErrorMessage(null) // Clear any previous errors

    try {
      // Import n8n client
      const { n8nClient } = await import('@/lib/api/n8n-client')

      // Call login API
      const response = await n8nClient.login({
        email: data.email,
        password: data.password,
      })

      if (response.success && response.token && response.user_id) {
        // Decode JWT to extract is_admin flag
        let isAdmin = false
        try {
          const tokenParts = response.token.split('.')
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]))
            isAdmin = payload.is_admin || false
          }
        } catch (e) {
          console.error('Failed to decode JWT:', e)
        }

        // Create user object
        const user = {
          accountNo: response.user_id,
          email: data.email,
          role: ['user'],
          exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
          isAdmin,
        }

        // Set user and access token (these will also update localStorage)
        auth.setUser(user)
        auth.setAccessToken(response.token)

        toast.success(`Welcome back, ${data.email}!`)

        // Use window.location for reliable redirect after state update
        // This ensures a fresh page load with the new auth state
        const targetPath = redirectTo || '/'
        window.location.href = targetPath
      } else {
        // Check if it's an invalid credentials error
        const message = response.message || 'Login failed'
        if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('not found')) {
          setErrorMessage("We couldn't find an account with these credentials. Don't have an account yet?")
        } else {
          setErrorMessage(message)
        }
        toast.error(message)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Login error:', error)
      setErrorMessage("We couldn't sign you in. Please check your email and password and try again.")
      toast.error('Login failed. Please check your credentials.')
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        {errorMessage && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>Unable to sign in</AlertTitle>
            <AlertDescription>
              {errorMessage}{' '}
              <Link
                to='/sign-up'
                className='font-medium underline underline-offset-4'
              >
                Create an account
              </Link>
            </AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder='name@example.com'
                  {...field}
                  onChange={(e) => {
                    field.onChange(e)
                    if (errorMessage) setErrorMessage(null)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder='********'
                  {...field}
                  onChange={(e) => {
                    field.onChange(e)
                    if (errorMessage) setErrorMessage(null)
                  }}
                />
              </FormControl>
              <FormMessage />
              <Link
                to='/forgot-password'
                className='text-muted-foreground absolute end-0 -top-0.5 text-sm font-medium hover:opacity-75'
              >
                Forgot password?
              </Link>
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          Sign in
        </Button>

        <div className='relative my-2'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t' />
          </div>
          <div className='relative flex justify-center text-xs uppercase'>
            <span className='bg-background text-muted-foreground px-2'>
              Or continue with
            </span>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-2'>
          <Button variant='outline' type='button' disabled={isLoading}>
            <IconGithub className='h-4 w-4' /> GitHub
          </Button>
          <Button variant='outline' type='button' disabled={isLoading}>
            <IconFacebook className='h-4 w-4' /> Facebook
          </Button>
        </div>
      </form>
    </Form>
  )
}
