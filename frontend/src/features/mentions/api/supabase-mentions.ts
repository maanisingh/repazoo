/**
 * Supabase-Based Mentions API
 * Zero-Code Architecture - Direct database queries with auto-generated types
 *
 * This file replaces ALL custom backend API code with configuration-based queries
 * NO manual type definitions needed - everything is auto-generated from the database schema
 */

import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

// Auto-generated types from database
type Mention = Database['public']['Tables']['twitter_mentions']['Row']
type Media = Database['public']['Tables']['tweet_media']['Row']
type MentionWithMedia = Database['public']['Functions']['get_user_mentions_with_media']['Returns'][0]
type UserStats = Database['public']['Functions']['get_user_mention_stats']['Returns'][0]
type TrendingMention = Database['public']['Functions']['get_trending_mentions']['Returns'][0]

/**
 * Filters for querying mentions
 * Supports sentiment, risk level, media filtering, and sorting
 */
export interface MentionFilters {
  sentiment?: string[]
  risk_level?: string[]
  has_media?: boolean
  sort_by?: 'newest' | 'oldest' | 'engagement' | 'risk'
  limit?: number
  offset?: number
  date_from?: string
  date_to?: string
  search?: string
}

/**
 * Get mentions with optional filters
 * Uses Supabase's auto-generated REST API - no backend code needed!
 */
export async function getMentions(userId: string, filters: MentionFilters = {}): Promise<any> {
  try {
    let query = supabase
      .from('twitter_mentions')
      .select(`
        *,
        media:tweet_media(*)
      `)
      .eq('user_id', userId)

    // Apply sentiment filter
    if (filters.sentiment && filters.sentiment.length > 0) {
      query = query.in('sentiment', filters.sentiment)
    }

    // Apply risk level filter
    if (filters.risk_level && filters.risk_level.length > 0) {
      query = query.in('risk_level', filters.risk_level)
    }

    // Apply media filter
    if (filters.has_media !== undefined) {
      query = query.eq('has_media', filters.has_media)
    }

    // Apply date range filters
    if (filters.date_from) {
      query = query.gte('tweet_created_at', filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte('tweet_created_at', filters.date_to)
    }

    // Apply search filter (full-text search on tweet text)
    if (filters.search) {
      query = query.ilike('tweet_text', `%${filters.search}%`)
    }

    // Apply sorting
    switch (filters.sort_by) {
      case 'newest':
        query = query.order('tweet_created_at', { ascending: false })
        break
      case 'oldest':
        query = query.order('tweet_created_at', { ascending: true })
        break
      case 'engagement':
        query = query.order('engagement_score', { ascending: false, nullsFirst: false })
        break
      case 'risk':
        query = query.order('risk_score', { ascending: false, nullsFirst: false })
        break
      default:
        query = query.order('tweet_created_at', { ascending: false })
    }

    // Apply pagination
    const limit = filters.limit || 20
    const offset = filters.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return {
      mentions: data || [],
      total: count || 0,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit
    }
  } catch (error) {
    console.error('Error fetching mentions:', error)
    throw error
  }
}

/**
 * Get mentions using optimized database function
 * This uses the pre-defined PostgreSQL function for better performance
 */
export async function getMentionsOptimized(userId: string, filters: MentionFilters = {}): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_user_mentions_with_media', {
      p_user_id: userId,
      p_sentiment: filters.sentiment?.[0] || undefined,
      p_risk_level: filters.risk_level?.[0] || undefined,
      p_has_media: filters.has_media ?? undefined,
      p_limit: filters.limit || 20,
      p_offset: filters.offset || 0
    })

    if (error) throw error

    return {
      mentions: data || [],
      total: data?.length || 0,
      page: Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1,
      pageSize: filters.limit || 20
    }
  } catch (error) {
    console.error('Error fetching mentions (optimized):', error)
    throw error
  }
}

/**
 * Get single mention with details
 * Includes related media and conversation thread
 */
export async function getMention(userId: string, mentionId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('twitter_mentions')
      .select(`
        *,
        media:tweet_media(*)
      `)
      .eq('user_id', userId)
      .eq('id', mentionId)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error fetching mention:', error)
    throw error
  }
}

/**
 * Get mention statistics using database function
 * Returns aggregated stats: sentiment breakdown, risk breakdown, engagement metrics
 */
export async function getMentionsStats(userId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_mention_stats', { p_user_id: userId })

    if (error) throw error

    // Transform the data into the expected format
    const stats = data?.[0]
    if (!stats) {
      return {
        total_mentions: 0,
        sentiment_breakdown: { positive: 0, neutral: 0, negative: 0 },
        risk_breakdown: { low: 0, medium: 0, high: 0, critical: 0 },
        average_engagement: 0,
        top_mentioners: [],
        last_scan_at: undefined
      }
    }

    return {
      total_mentions: stats.total_mentions || 0,
      sentiment_breakdown: {
        positive: stats.sentiment_positive || 0,
        neutral: stats.sentiment_neutral || 0,
        negative: stats.sentiment_negative || 0
      },
      risk_breakdown: {
        low: stats.risk_low || 0,
        medium: stats.risk_medium || 0,
        high: stats.risk_high || 0,
        critical: stats.risk_critical || 0
      },
      average_engagement: stats.avg_engagement_score || 0,
      total_engagement: stats.total_engagement || 0,
      viral_mentions: stats.viral_mentions || 0,
      most_recent_mention: stats.most_recent_mention || undefined,
      top_mentioners: [] // Can be fetched separately if needed
    }
  } catch (error) {
    console.error('Error fetching mention stats:', error)
    throw error
  }
}

/**
 * Get trending mentions
 * Uses database function to get mentions with high engagement
 */
export async function getTrendingMentions(userId: string, limit = 10) {
  try {
    const { data, error } = await supabase
      .rpc('get_trending_mentions', {
        p_user_id: userId,
        p_limit: limit
      })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching trending mentions:', error)
    throw error
  }
}

/**
 * Trigger mentions scan via backend API
 * Fetches Twitter user ID from database and calls backend scan endpoint
 */
export async function scanMentions(userId: string, options: { force_refresh?: boolean; max_results?: number } = {}): Promise<any> {
  try {
    // Get Twitter credentials to obtain twitter_user_id
    const { data: credentials, error: credError } = await supabase
      .from('twitter_credentials')
      .select('twitter_user_id, twitter_username')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (credError || !credentials) {
      throw new Error('Twitter account not connected. Please connect your Twitter account first.')
    }

    // Get auth token from localStorage (stored as plain string, not JSON)
    let authToken = localStorage.getItem('repazoo_auth_token')

    // If token is JSON-wrapped (from cookie), unwrap it
    if (authToken && authToken.startsWith('"')) {
      try {
        authToken = JSON.parse(authToken)
      } catch (e) {
        // Token is already plain string
      }
    }

    if (!authToken) {
      throw new Error('Not authenticated. Please log in again.')
    }

    // Call backend API
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://cfy.repazoo.com/api'
    const response = await fetch(`${apiUrl}/mentions/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        twitter_user_id: credentials.twitter_user_id,
        max_results: options.max_results || 100,
        force_refresh: options.force_refresh || false
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Failed to trigger scan: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return {
      status: 'success' as const,
      message: data.message || 'Mention scan started successfully',
      scan_id: data.scan_id || 'unknown',
      mentions_fetched: data.mentions_fetched || 0,
      mentions_with_media: data.mentions_with_media || 0,
      total_media_items: data.total_media_items || 0
    }
  } catch (error) {
    console.error('Error triggering scan:', error)
    throw error
  }
}

/**
 * Get scan history
 */
export async function getScanHistory(userId: string, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('mentions_scan_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching scan history:', error)
    throw error
  }
}

/**
 * Real-time subscription to new mentions
 * Subscribe to database changes for live UI updates
 */
export function subscribeToMentions(userId: string, callback: (mention: Mention) => void) {
  const channel = supabase
    .channel(`mentions:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'twitter_mentions',
        filter: `user_id=eq.${userId}`
      },
      (payload: any) => {
        callback(payload.new as Mention)
      }
    )
    .subscribe()

  return channel
}

/**
 * Real-time subscription to mention updates
 * Subscribe to changes in sentiment/risk analysis
 */
export function subscribeToMentionUpdates(userId: string, callback: (mention: Mention) => void) {
  const channel = supabase
    .channel(`mention-updates:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'twitter_mentions',
        filter: `user_id=eq.${userId}`
      },
      (payload: any) => {
        callback(payload.new as Mention)
      }
    )
    .subscribe()

  return channel
}

/**
 * Unsubscribe from real-time channel
 */
export async function unsubscribeFromMentions(channelName: string) {
  await supabase.channel(channelName).unsubscribe()
}

/**
 * Export types for use in components
 */
export type { Mention, Media, MentionWithMedia, UserStats, TrendingMention }
