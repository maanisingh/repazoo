/**
 * React Query hooks for Twitter Mentions API
 * Zero-Code Architecture - Direct Supabase queries (no custom backend code)
 *
 * This file has been migrated to use Supabase SDK instead of custom API client
 * All types are auto-generated from the database schema
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import {
  getMentions,
  getMention,
  getMentionsStats,
  scanMentions,
  subscribeToMentions,
  subscribeToMentionUpdates,
  type MentionFilters
} from './supabase-mentions'
import type {
  Mention,
  MentionsResponse,
  MentionsStatsResponse,
  ScanMentionsRequest,
  ScanMentionsResponse,
  MentionDetailResponse,
  MentionsError
} from '../types/mention'

// ============================================================================
// Query Keys Factory
// ============================================================================

export const mentionsKeys = {
  all: (userId: string) => ['mentions', userId] as const,
  lists: (userId: string) => [...mentionsKeys.all(userId), 'list'] as const,
  list: (userId: string, filters: MentionFilters) => [...mentionsKeys.lists(userId), filters] as const,
  details: (userId: string) => [...mentionsKeys.all(userId), 'detail'] as const,
  detail: (userId: string, id: string) => [...mentionsKeys.details(userId), id] as const,
  stats: (userId: string) => [...mentionsKeys.all(userId), 'stats'] as const,
  scanHistory: (userId: string) => [...mentionsKeys.all(userId), 'scan-history'] as const
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch mentions list with filters
 */
export function useMentions(
  userId: string,
  filters: MentionFilters = {},
  options?: Omit<UseQueryOptions<MentionsResponse, MentionsError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<MentionsResponse, MentionsError>({
    queryKey: mentionsKeys.list(userId, filters),
    queryFn: () => getMentions(userId, filters),
    enabled: !!userId,
    staleTime: 30_000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60_000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    ...options
  })
}

/**
 * Fetch mentions with auto-refresh
 */
export function useMentionsWithRefresh(
  userId: string,
  filters: MentionFilters = {},
  autoRefresh: boolean = false
) {
  return useMentions(userId, filters, {
    refetchInterval: autoRefresh ? 30_000 : false, // Refetch every 30s if enabled
    refetchIntervalInBackground: false // Don't refetch when tab is hidden
  })
}

/**
 * Fetch mention statistics
 */
export function useMentionsStats(
  userId: string,
  options?: Omit<UseQueryOptions<MentionsStatsResponse, MentionsError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<MentionsStatsResponse, MentionsError>({
    queryKey: mentionsKeys.stats(userId),
    queryFn: () => getMentionsStats(userId),
    enabled: !!userId,
    staleTime: 60_000, // Consider data fresh for 1 minute
    gcTime: 10 * 60_000, // Keep in cache for 10 minutes
    ...options
  })
}

/**
 * Fetch single mention detail
 */
export function useMention(
  userId: string,
  id: string,
  options?: Omit<UseQueryOptions<MentionDetailResponse, MentionsError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<MentionDetailResponse, MentionsError>({
    queryKey: mentionsKeys.detail(userId, id),
    queryFn: () => getMention(userId, id),
    enabled: !!userId && !!id, // Only fetch if both userId and ID exist
    staleTime: 5 * 60_000, // Consider data fresh for 5 minutes
    ...options
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Trigger new mentions scan
 */
export function useScanMentions(userId: string) {
  const queryClient = useQueryClient()

  return useMutation<
    ScanMentionsResponse,
    MentionsError,
    ScanMentionsRequest,
    { previousStats?: MentionsStatsResponse }
  >({
    mutationFn: (request) => scanMentions(userId, request),
    onMutate: async () => {
      // Optimistically update scan status
      await queryClient.cancelQueries({ queryKey: mentionsKeys.stats(userId) })

      const previousStats = queryClient.getQueryData<MentionsStatsResponse>(
        mentionsKeys.stats(userId)
      )

      if (previousStats) {
        queryClient.setQueryData<MentionsStatsResponse>(mentionsKeys.stats(userId), {
          ...previousStats,
          scan_in_progress: true
        })
      }

      return { previousStats }
    },
    onSuccess: (data) => {
      // Invalidate and refetch mentions data
      queryClient.invalidateQueries({ queryKey: mentionsKeys.lists(userId) })
      queryClient.invalidateQueries({ queryKey: mentionsKeys.stats(userId) })

      toast.success('Mention scan started!', {
        description: data.message || 'Your mentions are being analyzed.'
      })
    },
    onError: (error, _variables, context) => {
      // Rollback optimistic update
      if (context?.previousStats) {
        queryClient.setQueryData(mentionsKeys.stats(userId), context.previousStats)
      }

      toast.error('Scan failed', {
        description: error.message || 'Unable to start mention scan. Please try again.'
      })
    },
    onSettled: () => {
      // Always refetch stats after mutation
      queryClient.invalidateQueries({ queryKey: mentionsKeys.stats(userId) })
    }
  })
}

/**
 * Delete mention (placeholder - backend endpoint not yet implemented)
 */
export function useDeleteMention(userId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, MentionsError, string>({
    mutationFn: async (id) => {
      // Backend endpoint not yet implemented
      console.log('Delete mention (placeholder):', id)
      return Promise.resolve()
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: mentionsKeys.lists(userId) })

      // Optimistically remove mention from all list queries
      queryClient.setQueriesData<MentionsResponse>(
        { queryKey: mentionsKeys.lists(userId) },
        (old) => {
          if (!old) return old
          return {
            ...old,
            mentions: old.mentions.filter((m) => m.id !== id),
            total: old.total - 1
          }
        }
      )
    },
    onSuccess: () => {
      toast.success('Mention deleted')
      queryClient.invalidateQueries({ queryKey: mentionsKeys.lists(userId) })
      queryClient.invalidateQueries({ queryKey: mentionsKeys.stats(userId) })
    },
    onError: (error) => {
      toast.error('Delete failed', {
        description: error.message
      })
      // Refetch to get accurate data
      queryClient.invalidateQueries({ queryKey: mentionsKeys.lists(userId) })
    }
  })
}

/**
 * Mark mention as reviewed (placeholder - backend endpoint not yet implemented)
 */
export function useMarkMentionReviewed(userId: string) {
  const queryClient = useQueryClient()

  return useMutation<Mention, MentionsError, string>({
    mutationFn: async (id) => {
      // Backend endpoint not yet implemented - fetch current mention as placeholder
      console.log('Mark reviewed (placeholder):', id)
      const mention = await getMention(userId, id)
      return mention
    },
    onSuccess: (updatedMention) => {
      // Update mention in all relevant queries
      queryClient.setQueryData(
        mentionsKeys.detail(userId, updatedMention.id),
        updatedMention
      )

      // Update in list queries
      queryClient.setQueriesData<MentionsResponse>(
        { queryKey: mentionsKeys.lists(userId) },
        (old) => {
          if (!old) return old
          return {
            ...old,
            mentions: old.mentions.map((m) =>
              m.id === updatedMention.id ? updatedMention : m
            )
          }
        }
      )

      toast.success('Mention marked as reviewed')
    },
    onError: (error) => {
      toast.error('Update failed', {
        description: error.message
      })
    }
  })
}

/**
 * Real-time mentions subscription hook
 * Automatically updates UI when new mentions arrive
 */
export function useMentionsRealtime(userId: string, enabled = true) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId || !enabled) return

    const channel = subscribeToMentions(userId, (newMention) => {
      // Auto-update mentions queries
      queryClient.invalidateQueries({ queryKey: mentionsKeys.lists(userId) })
      queryClient.invalidateQueries({ queryKey: mentionsKeys.stats(userId) })

      // Show toast notification
      toast.info('New mention received!', {
        description: `From @${newMention.author_username}`
      })
    })

    return () => {
      channel.unsubscribe()
    }
  }, [userId, enabled, queryClient])
}

/**
 * Real-time mention updates subscription hook
 * Updates UI when sentiment/risk analysis completes
 */
export function useMentionUpdatesRealtime(userId: string, enabled = true) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId || !enabled) return

    const channel = subscribeToMentionUpdates(userId, (updatedMention) => {
      // Update the specific mention in cache
      queryClient.setQueryData(
        mentionsKeys.detail(userId, updatedMention.id),
        updatedMention
      )

      // Invalidate list queries to reflect updated data
      queryClient.invalidateQueries({ queryKey: mentionsKeys.lists(userId) })
      queryClient.invalidateQueries({ queryKey: mentionsKeys.stats(userId) })
    })

    return () => {
      channel.unsubscribe()
    }
  }, [userId, enabled, queryClient])
}

// ============================================================================
// Prefetch Helpers
// ============================================================================

/**
 * Prefetch mentions for faster navigation
 */
export function usePrefetchMentions(userId: string) {
  const queryClient = useQueryClient()

  return (filters: MentionFilters) => {
    queryClient.prefetchQuery({
      queryKey: mentionsKeys.list(userId, filters),
      queryFn: () => getMentions(userId, filters),
      staleTime: 30_000
    })
  }
}

/**
 * Prefetch mention detail
 */
export function usePrefetchMention(userId: string) {
  const queryClient = useQueryClient()

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: mentionsKeys.detail(userId, id),
      queryFn: () => getMention(userId, id),
      staleTime: 5 * 60_000
    })
  }
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Check if any mention query is loading
 */
export function useIsMentionsLoading(userId: string) {
  const queryClient = useQueryClient()
  const queries = queryClient.getQueriesData<MentionsResponse>({
    queryKey: mentionsKeys.lists(userId)
  })

  return queries.some(([_key, data]) => data === undefined)
}

/**
 * Get cached mentions count
 */
export function useCachedMentionsCount(userId: string) {
  const queryClient = useQueryClient()
  const stats = queryClient.getQueryData<MentionsStatsResponse>(
    mentionsKeys.stats(userId)
  )

  return stats?.total_mentions ?? 0
}

/**
 * Invalidate all mentions queries
 */
export function useInvalidateMentions(userId: string) {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: mentionsKeys.all(userId) })
    toast.info('Refreshing mentions...')
  }
}
