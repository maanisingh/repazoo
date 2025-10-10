import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

// Cookie and localStorage keys for authentication
const ACCESS_TOKEN_KEY = 'repazoo_auth_token'
const USER_ID_KEY = 'repazoo_user_id'
const USER_EMAIL_KEY = 'repazoo_user_email'
const USER_IS_ADMIN_KEY = 'repazoo_user_is_admin'

interface AuthUser {
  accountNo: string
  email: string
  role: string[]
  exp: number
  isAdmin: boolean
}

interface AuthState {
  auth: {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    accessToken: string
    setAccessToken: (accessToken: string) => void
    resetAccessToken: () => void
    reset: () => void
    isAuthenticated: () => boolean
    isAdmin: () => boolean
  }
}

export const useAuthStore = create<AuthState>()((set, get) => {
  // Initialize from localStorage/cookies
  const cookieState = getCookie(ACCESS_TOKEN_KEY)
  const initToken = cookieState ? JSON.parse(cookieState) : ''

  // Try to restore user from localStorage
  let initUser: AuthUser | null = null
  try {
    const userId = localStorage.getItem(USER_ID_KEY)
    const userEmail = localStorage.getItem(USER_EMAIL_KEY)
    const isAdminStr = localStorage.getItem(USER_IS_ADMIN_KEY)
    const isAdmin = isAdminStr === 'true'

    if (userId && userEmail && initToken) {
      initUser = {
        accountNo: userId,
        email: userEmail,
        role: ['user'],
        exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        isAdmin,
      }
    }
  } catch (e) {
    console.error('Failed to restore user from localStorage:', e)
  }

  return {
    auth: {
      user: initUser,
      setUser: (user) =>
        set((state) => {
          // Also persist to localStorage
          if (user) {
            localStorage.setItem(USER_ID_KEY, user.accountNo)
            localStorage.setItem(USER_EMAIL_KEY, user.email)
            localStorage.setItem(USER_IS_ADMIN_KEY, user.isAdmin ? 'true' : 'false')
          }
          return { ...state, auth: { ...state.auth, user } }
        }),
      accessToken: initToken,
      setAccessToken: (accessToken) =>
        set((state) => {
          setCookie(ACCESS_TOKEN_KEY, JSON.stringify(accessToken))
          localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
          return { ...state, auth: { ...state.auth, accessToken } }
        }),
      resetAccessToken: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN_KEY)
          localStorage.removeItem(ACCESS_TOKEN_KEY)
          return { ...state, auth: { ...state.auth, accessToken: '' } }
        }),
      reset: () =>
        set((state) => {
          // Clear all auth data from cookies and localStorage
          removeCookie(ACCESS_TOKEN_KEY)
          localStorage.removeItem(ACCESS_TOKEN_KEY)
          localStorage.removeItem(USER_ID_KEY)
          localStorage.removeItem(USER_EMAIL_KEY)
          localStorage.removeItem(USER_IS_ADMIN_KEY)
          return {
            ...state,
            auth: { ...state.auth, user: null, accessToken: '' },
          }
        }),
      isAuthenticated: () => {
        const state = get()
        return !!(state.auth.accessToken && state.auth.user)
      },
      isAdmin: () => {
        const state = get()
        return !!(state.auth.user?.isAdmin)
      },
    },
  }
})
