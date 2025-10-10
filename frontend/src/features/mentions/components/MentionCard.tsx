/**
 * MentionCard Component
 * Displays a single Twitter mention with media, engagement, and analysis
 */

import { formatDistanceToNow } from 'date-fns'
import type { Mention } from '../types/mention'
import { MentionMediaGallery } from './MentionMediaGallery'
import {
  SENTIMENT_COLORS,
  RISK_COLORS,
  SENTIMENT_LABELS,
  RISK_LEVEL_LABELS,
} from '../types/mention'

interface MentionCardProps {
  mention: Mention
  className?: string
}

export function MentionCard({ mention, className = '' }: MentionCardProps) {
  const sentimentColor = mention.sentiment
    ? SENTIMENT_COLORS[mention.sentiment]
    : '#6b7280'
  const riskColor = mention.risk_level ? RISK_COLORS[mention.risk_level] : '#6b7280'

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-4 ${className}`}
    >
      {/* Author Header */}
      <div className="flex items-start gap-3 mb-3">
        {mention.author.profile_image_url && (
          <img
            src={mention.author.profile_image_url}
            alt={mention.author.username}
            className="w-12 h-12 rounded-full"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white truncate">
              {mention.author.display_name || mention.author.username}
            </span>
            {mention.author.verified && (
              <svg
                className="w-5 h-5 text-blue-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>@{mention.author.username}</span>
            <span>•</span>
            <time dateTime={mention.tweet_created_at}>
              {formatDistanceToNow(new Date(mention.tweet_created_at), {
                addSuffix: true,
              })}
            </time>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-col gap-1 items-end">
          {mention.sentiment && (
            <span
              className="px-2 py-1 rounded text-xs font-medium text-white"
              style={{ backgroundColor: sentimentColor }}
            >
              {SENTIMENT_LABELS[mention.sentiment]}
            </span>
          )}
          {mention.risk_level && (
            <span
              className="px-2 py-1 rounded text-xs font-medium text-white"
              style={{ backgroundColor: riskColor }}
            >
              {RISK_LEVEL_LABELS[mention.risk_level]}
            </span>
          )}
        </div>
      </div>

      {/* Tweet Text */}
      <div className="mb-3">
        <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
          {mention.text}
        </p>
      </div>

      {/* Media Gallery */}
      {mention.media && mention.media.length > 0 && (
        <MentionMediaGallery media={mention.media} className="mb-3" />
      )}

      {/* Engagement Metrics */}
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
        <div className="flex items-center gap-1" title="Likes">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <span>{mention.engagement.likes.toLocaleString()}</span>
        </div>

        <div className="flex items-center gap-1" title="Retweets">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
          </svg>
          <span>{mention.engagement.retweets.toLocaleString()}</span>
        </div>

        <div className="flex items-center gap-1" title="Replies">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z" />
          </svg>
          <span>{mention.engagement.replies.toLocaleString()}</span>
        </div>

        {mention.engagement.views > 0 && (
          <div className="flex items-center gap-1" title="Views">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
            </svg>
            <span>{mention.engagement.views.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <a
          href={mention.tweet_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
        >
          View on Twitter →
        </a>

        {/* Metadata Badges */}
        <div className="flex gap-2">
          {mention.is_retweet && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
              RT
            </span>
          )}
          {mention.is_quote && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
              Quote
            </span>
          )}
          {mention.has_media && (
            <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-2 py-1 rounded">
              {mention.media.length} {mention.media.length === 1 ? 'Media' : 'Media'}
            </span>
          )}
        </div>
      </div>

      {/* Risk Factors (if any) */}
      {mention.risk_factors && mention.risk_factors.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
            Risk Factors:
          </p>
          <ul className="text-sm text-red-700 dark:text-red-400 list-disc list-inside">
            {mention.risk_factors.map((factor, i) => (
              <li key={i}>{factor}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default MentionCard
