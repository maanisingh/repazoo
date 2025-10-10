/**
 * Supabase Client Configuration
 * Zero-Code Architecture - Direct PostgreSQL access via PostgREST
 *
 * This replaces all custom backend API code with auto-generated REST endpoints
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Environment variables - configured in .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24ifQ.placeholder'

// Create Supabase client with auto-generated types
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'repazoo-dashboard'
    }
  }
})

/**
 * Type helpers for database operations
 */

// Table row types (SELECT)
export type TwitterMention = Database['public']['Tables']['twitter_mentions']['Row']
export type TweetMedia = Database['public']['Tables']['tweet_media']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type TwitterAccount = Database['public']['Tables']['twitter_accounts']['Row']
export type MentionsScanHistory = Database['public']['Tables']['mentions_scan_history']['Row']

// Insert types (INSERT)
export type TwitterMentionInsert = Database['public']['Tables']['twitter_mentions']['Insert']
export type TweetMediaInsert = Database['public']['Tables']['tweet_media']['Insert']

// Update types (UPDATE)
export type TwitterMentionUpdate = Database['public']['Tables']['twitter_mentions']['Update']

// View types
export type RecentMention = Database['public']['Views']['v_recent_mentions']['Row']
export type HighRiskMention = Database['public']['Views']['v_high_risk_mentions']['Row']

// Function return types
export type UserMentionStats = Database['public']['Functions']['get_user_mention_stats']['Returns'][0]
export type TrendingMention = Database['public']['Functions']['get_trending_mentions']['Returns'][0]
export type MentionWithMedia = Database['public']['Functions']['get_user_mentions_with_media']['Returns'][0]

/**
 * Helper function to get authenticated user ID from Clerk
 * This can be extended to integrate with Clerk's user session
 */
export function getUserId(): string | null {
  // For now, we'll get it from localStorage (set by Clerk integration)
  // In production, this should be tied to Clerk's useUser() hook
  return localStorage.getItem('repazoo_user_id')
}

/**
 * Helper function to set user context for RLS policies
 * This sets the user_id in the database session for Row-Level Security
 *
 * Note: set_user_context function needs to be registered in the database types
 * For now, we handle RLS via query filters
 */
export async function setUserContext(userId: string) {
  // Store user ID for RLS filtering
  // In production, this would call a database function
  // For now, we use client-side filtering with user_id in queries
  localStorage.setItem('repazoo_user_id', userId)
}

/**
 * Real-time subscription helper
 * Subscribe to database changes for live updates
 */
export function createRealtimeChannel(channelName: string) {
  return supabase.channel(channelName)
}

/**
 * Export singleton instance
 */
export default supabase
