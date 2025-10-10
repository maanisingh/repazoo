import { createFileRoute, redirect } from '@tanstack/react-router'
import { SignUp } from '@/features/auth/sign-up'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/(auth)/sign-up')({
  beforeLoad: () => {
    const { auth } = useAuthStore.getState()

    // If already authenticated, redirect to dashboard
    if (auth.isAuthenticated()) {
      throw redirect({ to: '/', replace: true })
    }
  },
  component: SignUp,
})
