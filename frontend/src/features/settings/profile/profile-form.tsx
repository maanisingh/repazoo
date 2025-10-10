import { z } from 'zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { n8nClient } from '@/lib/api/n8n-client'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

const profileFormSchema = z.object({
  username: z
    .string('Please enter your username.')
    .min(2, 'Username must be at least 2 characters.')
    .max(30, 'Username must not be longer than 30 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  twitterHandle: z.string().optional(),
  subscriptionTier: z.string().optional(),
  bio: z.string().max(160).optional(),
  urls: z
    .array(
      z.object({
        value: z.string().url('Please enter a valid URL.').or(z.literal('')),
      })
    )
    .optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export function ProfileForm() {
  const { auth } = useAuthStore()
  const userId = auth.user?.accountNo || ''
  const userEmail = auth.user?.email || ''

  // Get user's Twitter status
  const { data: twitterData } = useQuery({
    queryKey: ['twitter-status', userId],
    queryFn: () => n8nClient.getUserTwitterStatus(userId),
    enabled: !!userId,
  })

  // Default values from auth store and API
  const defaultValues: ProfileFormValues = {
    username: userEmail.split('@')[0] || 'User',
    email: userEmail,
    twitterHandle: twitterData?.twitter_handle || '',
    subscriptionTier: 'Free',
    bio: 'Monitoring my online reputation',
    urls: [],
  }

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: 'onChange',
  })

  const { fields, append } = useFieldArray({
    name: 'urls',
    control: form.control,
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => showSubmittedData(data))}
        className='space-y-8'
      >
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder='Your name' {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name used throughout the application.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input {...field} disabled />
              </FormControl>
              <FormDescription>
                Your registered email address. Contact support to change this.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='twitterHandle'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Twitter Handle</FormLabel>
              <FormControl>
                <div className='flex items-center gap-2'>
                  <Input {...field} disabled placeholder='Not connected' />
                  {twitterData?.connected && (
                    <Badge variant='outline' className='bg-green-50 dark:bg-green-900/30'>
                      Connected
                    </Badge>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Your connected Twitter account. Manage connection from the dashboard.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='subscriptionTier'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subscription Tier</FormLabel>
              <FormControl>
                <div className='flex items-center gap-2'>
                  <Input {...field} disabled />
                  <Button variant='outline' size='sm' asChild>
                    <Link to='/'>Upgrade</Link>
                  </Button>
                </div>
              </FormControl>
              <FormDescription>
                Your current subscription plan.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='bio'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='Tell us a little bit about yourself'
                  className='resize-none'
                  {...field}
                />
              </FormControl>
              <FormDescription>
                You can <span>@mention</span> other users and organizations to
                link to them.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          {fields.map((field, index) => (
            <FormField
              control={form.control}
              key={field.id}
              name={`urls.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(index !== 0 && 'sr-only')}>
                    URLs
                  </FormLabel>
                  <FormDescription className={cn(index !== 0 && 'sr-only')}>
                    Add links to your website, blog, or social media profiles.
                  </FormDescription>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='mt-2'
            onClick={() => append({ value: '' })}
          >
            Add URL
          </Button>
        </div>
        <Button type='submit'>Update profile</Button>
      </form>
    </Form>
  )
}
