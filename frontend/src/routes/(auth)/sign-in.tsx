import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { SignIn } from '@/features/auth/sign-in'
import { useAuthStore } from '@/stores/auth-store'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/sign-in')({
  beforeLoad: ({ search }) => {
    const { auth } = useAuthStore.getState()

    // If already authenticated, redirect to dashboard or specified redirect
    if (auth.isAuthenticated()) {
      throw redirect({ to: search.redirect || '/', replace: true })
    }
  },
  component: SignIn,
  validateSearch: searchSchema,
})
