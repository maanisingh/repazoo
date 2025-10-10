/**
 * Twitter Mentions Type Definitions
 * Repazoo Social Reputation Intelligence Platform
 */

export type Sentiment = 'positive' | 'neutral' | 'negative'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type MentionType = 'direct' | 'reply' | 'quote' | 'retweet'
export type SortOption = 'newest' | 'oldest' | 'most_engagement' | 'highest_risk' | 'sentiment'

export interface MentionAuthor {
  username: string
  name?: string
  display_name?: string
  avatar?: string
  profile_image_url?: string
  verified?: boolean
  id?: string
}

export interface MentionEngagement {
  views: number
  likes: number
  retweets: number
  replies: number
  quotes: number
  bookmarks: number
}

export interface MediaItem {
  id: string
  type: 'photo' | 'video' | 'animated_gif'
  url: string
  preview_url?: string
  width?: number
  height?: number
  alt_text?: string
  display_order: number
}

export interface MentionMetadata {
  impact_score?: number
  reach?: number
  influence_score?: number
  virality_coefficient?: number
  [key: string]: unknown
}

export interface Mention {
  id: string
  tweet_id: string
  user_id: string
  platform?: string
  author: MentionAuthor
  text: string
  mention_type?: MentionType
  sentiment?: Sentiment
  sentiment_score?: number
  sentiment_confidence?: number
  risk_level?: RiskLevel
  risk_score?: number
  risk_factors?: string[]
  engagement: MentionEngagement
  created_at: string // ISO 8601
  tweet_created_at: string // ISO 8601
  fetched_at?: string // ISO 8601
  tweet_url: string
  metadata?: MentionMetadata
  media: MediaItem[]
  has_media: boolean
  conversation_id?: string
  is_retweet: boolean
  is_quote: boolean
}

export interface MentionFilters {
  dateFrom?: string // ISO 8601
  dateTo?: string // ISO 8601
  sentiments?: Sentiment[]
  riskLevels?: RiskLevel[]
  mentionTypes?: MentionType[]
  sortBy?: SortOption
  page?: number
  pageSize?: number
}

export interface MentionsResponse {
  mentions: Mention[]
  total: number
  page: number
  pageSize: number
}

export interface SentimentBreakdown {
  positive: number
  neutral: number
  negative: number
}

export interface RiskBreakdown {
  low: number
  medium: number
  high: number
  critical: number
}

export interface TopMentioner {
  username: string
  count: number
  avatar?: string
  verified?: boolean
}

export interface MentionsStatsResponse {
  total_mentions: number
  sentiment_breakdown: SentimentBreakdown
  risk_breakdown: RiskBreakdown
  average_engagement: number
  top_mentioners: TopMentioner[]
  last_scan_at?: string // ISO 8601
  scan_in_progress?: boolean
}

export interface ScanMentionsRequest {
  force_refresh?: boolean
  max_results?: number
}

export interface ScanMentionsResponse {
  status: 'started' | 'completed' | 'failed'
  message: string
  scan_id: string
  estimated_completion?: string // ISO 8601
}

export interface MentionDetailResponse extends Mention {
  related_mentions?: Mention[]
  conversation_thread?: Mention[]
  sentiment_history?: Array<{
    timestamp: string
    sentiment: Sentiment
    confidence: number
  }>
}

// Filter state for Zustand store
export interface MentionsFiltersState {
  dateRange: { from: Date; to: Date }
  sentiments: Sentiment[]
  riskLevels: RiskLevel[]
  mentionTypes: MentionType[]
  sortBy: SortOption
  viewMode: 'grid' | 'list'
  autoRefresh: boolean
  searchQuery: string

  // Actions
  setDateRange: (range: { from: Date; to: Date }) => void
  setSentiments: (sentiments: Sentiment[]) => void
  setRiskLevels: (levels: RiskLevel[]) => void
  setMentionTypes: (types: MentionType[]) => void
  setSortBy: (option: SortOption) => void
  setViewMode: (mode: 'grid' | 'list') => void
  setAutoRefresh: (enabled: boolean) => void
  setSearchQuery: (query: string) => void
  clearFilters: () => void
  resetToDefaults: () => void
}

// Helper type for pagination
export interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// Helper type for component props
export interface BaseMentionComponentProps {
  className?: string
  'aria-label'?: string
}

// Error types
export interface MentionsError {
  message: string
  code?: string
  status?: number
  details?: Record<string, unknown>
}

// Loading state type
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

// Chart data for visualizations
export interface SentimentChartData {
  name: Sentiment
  value: number
  percentage: number
  color: string
}

export interface RiskChartData {
  name: RiskLevel
  value: number
  percentage: number
  color: string
}

export interface EngagementTrendData {
  date: string
  views: number
  likes: number
  retweets: number
  replies: number
}

// Constants
export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative'
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
  critical: 'Critical Risk'
}

export const MENTION_TYPE_LABELS: Record<MentionType, string> = {
  direct: 'Direct Mention',
  reply: 'Reply',
  quote: 'Quote Tweet',
  retweet: 'Retweet'
}

export const SORT_OPTION_LABELS: Record<SortOption, string> = {
  newest: 'Newest First',
  oldest: 'Oldest First',
  most_engagement: 'Most Engagement',
  highest_risk: 'Highest Risk',
  sentiment: 'By Sentiment'
}

// Color mappings
export const SENTIMENT_COLORS: Record<Sentiment, string> = {
  positive: '#10b981', // green-500
  neutral: '#3b82f6',  // blue-500
  negative: '#ef4444'  // red-500
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#10b981',     // emerald-500
  medium: '#f59e0b',  // amber-500
  high: '#f97316',    // orange-500
  critical: '#dc2626' // red-600
}

// Default values
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
export const AUTO_REFRESH_INTERVAL = 30000 // 30 seconds
export const SCAN_COOLDOWN = 60000 // 1 minute

// Validation schemas (for use with Zod)
export const MENTION_FILTERS_SCHEMA = {
  page: 'number().int().min(1)',
  pageSize: 'number().int().min(1).max(100)',
  dateFrom: 'string().datetime().optional()',
  dateTo: 'string().datetime().optional()',
  sentiments: 'array(enum([positive, neutral, negative])).optional()',
  riskLevels: 'array(enum([low, medium, high, critical])).optional()',
  mentionTypes: 'array(enum([direct, reply, quote, retweet])).optional()',
  sortBy: 'enum([newest, oldest, most_engagement, highest_risk, sentiment]).optional()'
}
