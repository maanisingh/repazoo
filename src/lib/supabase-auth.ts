import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

// Admin client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Client for browser operations
export const supabase = createClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export class SupabaseAuthService {

  // Sign up a new user
  static async signUp(email: string, password: string, metadata: any = {}) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata
      })

      if (error) throw error
      return { user: data.user, error: null }
    } catch (error) {
      console.error('Supabase signup error:', error)
      return { user: null, error }
    }
  }

  // Sign in user
  static async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error
      return { user: data.user, session: data.session, error: null }
    } catch (error) {
      console.error('Supabase signin error:', error)
      return { user: null, session: null, error }
    }
  }

  // Get user from JWT token
  static async getUserFromToken(token: string) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token)

      if (error) throw error
      return { user: data.user, error: null }
    } catch (error) {
      console.error('Supabase get user error:', error)
      return { user: null, error }
    }
  }

  // Sign out user
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Supabase signout error:', error)
      return { error }
    }
  }

  // Get current session
  static async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      return { session: data.session, error: null }
    } catch (error) {
      console.error('Supabase get session error:', error)
      return { session: null, error }
    }
  }

  // Refresh session
  static async refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      return { session: data.session, error: null }
    } catch (error) {
      console.error('Supabase refresh session error:', error)
      return { session: null, error }
    }
  }

  // Extract user from request (middleware compatible)
  static async getUserFromRequest(request: NextRequest) {
    try {
      // Try to get token from Authorization header
      const authHeader = request.headers.get('authorization')
      let token = authHeader?.replace('Bearer ', '')

      // If no Authorization header, try cookie
      if (!token) {
        token = request.cookies.get('supabase-auth-token')?.value
      }

      if (!token) {
        return { user: null, error: 'No token found' }
      }

      return await this.getUserFromToken(token)
    } catch (error) {
      console.error('Error extracting user from request:', error)
      return { user: null, error }
    }
  }

  // Update user metadata
  static async updateUserMetadata(userId: string, metadata: any) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { user_metadata: metadata }
      )

      if (error) throw error
      return { user: data.user, error: null }
    } catch (error) {
      console.error('Supabase update user error:', error)
      return { user: null, error }
    }
  }

  // Delete user
  static async deleteUser(userId: string) {
    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Supabase delete user error:', error)
      return { error }
    }
  }

  // List users (admin only)
  static async listUsers(page = 1, perPage = 50) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      })

      if (error) throw error
      return { users: data.users, error: null }
    } catch (error) {
      console.error('Supabase list users error:', error)
      return { users: [], error }
    }
  }
}

// Type definitions for Supabase user
export interface SupabaseUser {
  id: string
  email: string
  user_metadata: {
    firstName?: string
    lastName?: string
    plan?: string
    isAdmin?: boolean
  }
  app_metadata: Record<string, any>
  created_at: string
  updated_at: string
  email_confirmed_at?: string
  phone_confirmed_at?: string
}