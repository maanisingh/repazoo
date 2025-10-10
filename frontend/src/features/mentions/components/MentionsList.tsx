/**
 * MentionsList Component
 * Displays a list of mentions with filtering and pagination
 */

import { MentionCard } from './MentionCard'
import type { Mention } from '../types/mention'

interface MentionsListProps {
  mentions: Mention[]
  loading?: boolean
  error?: string
  emptyMessage?: string
  className?: string
}

export function MentionsList({
  mentions,
  loading = false,
  error,
  emptyMessage = 'No mentions found',
  className = '',
}: MentionsListProps) {
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <MentionSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
          <svg
            className="w-8 h-8 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Error Loading Mentions
        </h3>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    )
  }

  if (!mentions || mentions.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Mentions Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {mentions.map((mention) => (
        <MentionCard key={mention.id} mention={mention} />
      ))}
    </div>
  )
}

function MentionSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/4" />
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-4/6" />
      </div>
      <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded mb-3" />
      <div className="flex gap-4">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16" />
      </div>
    </div>
  )
}

export default MentionsList
