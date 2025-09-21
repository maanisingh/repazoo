'use client'

import { useState, useEffect } from 'react'

interface AnalyticsData {
  totalMentions: number
  mentionsInPeriod: number
  reputationScore: number
  sentiment: {
    breakdown: Array<{ _count: { id: number }, sentiment: string }>
    positive: number
    negative: number
    neutral: number
  }
  sources: {
    breakdown: Array<{ _count: { id: number }, sourceId: string, sourceName: string, sourceType: string }>
    total: number
  }
  riskLevels: {
    breakdown: Array<{ _count: { id: number }, riskLevel: string }>
    high: number
  }
  keywords: Array<{ keyword: string, count: number }>
  trends: Array<{
    date: string
    total: number
    positive: number
    negative: number
    neutral: number
  }>
  timeframe: string
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [timeframe])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics?type=overview&timeframe=${timeframe}`)
      if (response.ok) {
        const data = await response.json()
        // Handle the wrapped response structure
        if (data.success && data.analytics) {
          // Create compatible data structure for the UI
          const compatibleData = {
            totalMentions: data.analytics.totalMentions,
            mentionsInPeriod: data.analytics.mentionsInPeriod,
            reputationScore: data.analytics.reputationScore,
            sentiment: {
              positive: data.analytics.sentiment.positive,
              negative: data.analytics.sentiment.negative,
              neutral: data.analytics.sentiment.neutral,
              breakdown: [
                { _count: { id: data.analytics.sentiment.positive }, sentiment: 'POSITIVE' },
                { _count: { id: data.analytics.sentiment.negative }, sentiment: 'NEGATIVE' },
                { _count: { id: data.analytics.sentiment.neutral }, sentiment: 'NEUTRAL' }
              ].filter(item => item._count.id > 0)
            },
            sources: {
              breakdown: [],
              total: 1
            },
            riskLevels: {
              breakdown: [],
              high: 0
            },
            keywords: [],
            trends: [],
            timeframe: data.analytics.timeframe
          }
          setAnalytics(compatibleData)
        } else {
          console.error('Invalid analytics data structure')
        }
      } else {
        console.error('Failed to fetch analytics')
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'text-green-600 bg-green-100'
      case 'negative': return 'text-red-600 bg-red-100'
      case 'neutral': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Failed to load analytics data</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Detailed reputation analytics and insights</p>
        </div>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 3 months</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">{analytics.reputationScore}</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Reputation Score</p>
              <p className="text-lg font-semibold text-gray-900">{analytics.reputationScore}/100</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">{analytics.totalMentions}</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Mentions</p>
              <p className="text-lg font-semibold text-gray-900">{analytics.totalMentions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">{analytics.sentiment.positive}</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Positive Mentions</p>
              <p className="text-lg font-semibold text-gray-900">{analytics.sentiment.positive}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">{analytics.sentiment.negative}</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Negative Mentions</p>
              <p className="text-lg font-semibold text-gray-900">{analytics.sentiment.negative}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sentiment Distribution</h3>
          <div className="space-y-4">
            {analytics.sentiment.breakdown.map((item) => {
              const percentage = analytics.totalMentions > 0 ? ((item._count.id / analytics.totalMentions) * 100).toFixed(1) : '0.0'
              return (
                <div key={item.sentiment} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(item.sentiment)}`}>
                      {item.sentiment}
                    </span>
                    <span className="ml-3 text-sm text-gray-600">{item._count.id} mentions</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{percentage}%</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-100">
                  Total Mentions
                </span>
                <span className="ml-3 text-sm text-gray-600">All time</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{analytics.totalMentions}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-purple-600 bg-purple-100">
                  Period Mentions
                </span>
                <span className="ml-3 text-sm text-gray-600">Last {analytics.timeframe}</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{analytics.mentionsInPeriod}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-orange-600 bg-orange-100">
                  Reputation Score
                </span>
                <span className="ml-3 text-sm text-gray-600">Out of 100</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{analytics.reputationScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{analytics.mentionsInPeriod}</div>
            <div className="text-sm text-gray-600">Mentions in {timeframe}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{analytics.sentiment.positive}</div>
            <div className="text-sm text-gray-600">Positive mentions</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{analytics.sentiment.negative}</div>
            <div className="text-sm text-gray-600">Negative mentions</div>
          </div>
        </div>
      </div>
    </div>
  )
}