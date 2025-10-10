/**
 * Mentions Filters Store
 * Global state management for Twitter Mentions filters using Zustand
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { subDays } from 'date-fns'
import type {
  MentionsFiltersState,
  Sentiment,
  RiskLevel,
  MentionType,
  SortOption
} from '@/features/mentions/types/mention'

const DEFAULT_DATE_RANGE = {
  from: subDays(new Date(), 30), // Last 30 days
  to: new Date()
}

const DEFAULT_STATE = {
  dateRange: DEFAULT_DATE_RANGE,
  sentiments: [] as Sentiment[],
  riskLevels: [] as RiskLevel[],
  mentionTypes: [] as MentionType[],
  sortBy: 'newest' as SortOption,
  viewMode: 'grid' as const,
  autoRefresh: false,
  searchQuery: ''
}

export const useMentionsFilters = create<MentionsFiltersState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setDateRange: (range) => set({ dateRange: range }),

      setSentiments: (sentiments) => set({ sentiments }),

      setRiskLevels: (riskLevels) => set({ riskLevels }),

      setMentionTypes: (mentionTypes) => set({ mentionTypes }),

      setSortBy: (sortBy) => set({ sortBy }),

      setViewMode: (viewMode) => set({ viewMode }),

      setAutoRefresh: (autoRefresh) => set({ autoRefresh }),

      setSearchQuery: (searchQuery) => set({ searchQuery }),

      clearFilters: () =>
        set({
          sentiments: [],
          riskLevels: [],
          mentionTypes: [],
          searchQuery: ''
        }),

      resetToDefaults: () => set(DEFAULT_STATE)
    }),
    {
      name: 'mentions-filters-storage',
      // Only persist certain fields
      partialize: (state) => ({
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        autoRefresh: state.autoRefresh
        // Don't persist filters - they should reset on reload
      })
    }
  )
)

// Selector hooks for optimized re-renders
export const useDateRange = () => useMentionsFilters((state) => state.dateRange)
export const useSentiments = () => useMentionsFilters((state) => state.sentiments)
export const useRiskLevels = () => useMentionsFilters((state) => state.riskLevels)
export const useMentionTypes = () => useMentionsFilters((state) => state.mentionTypes)
export const useSortBy = () => useMentionsFilters((state) => state.sortBy)
export const useViewMode = () => useMentionsFilters((state) => state.viewMode)
export const useAutoRefresh = () => useMentionsFilters((state) => state.autoRefresh)
export const useSearchQuery = () => useMentionsFilters((state) => state.searchQuery)

// Computed selectors
export const useActiveFilterCount = () =>
  useMentionsFilters((state) => {
    let count = 0
    if (state.sentiments.length > 0) count++
    if (state.riskLevels.length > 0) count++
    if (state.mentionTypes.length > 0) count++
    if (state.searchQuery.trim() !== '') count++
    return count
  })

export const useHasActiveFilters = () =>
  useMentionsFilters((state) =>
    state.sentiments.length > 0 ||
    state.riskLevels.length > 0 ||
    state.mentionTypes.length > 0 ||
    state.searchQuery.trim() !== ''
  )

// Helper function to convert store state to API filters
export const useApiFilters = () =>
  useMentionsFilters((state) => ({
    dateFrom: state.dateRange.from.toISOString(),
    dateTo: state.dateRange.to.toISOString(),
    sentiments: state.sentiments.length > 0 ? state.sentiments : undefined,
    riskLevels: state.riskLevels.length > 0 ? state.riskLevels : undefined,
    mentionTypes: state.mentionTypes.length > 0 ? state.mentionTypes : undefined,
    sortBy: state.sortBy,
    search: state.searchQuery.trim() || undefined
  }))
