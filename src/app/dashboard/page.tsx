'use client'

import { useState, useEffect } from 'react'
import WorkflowDashboard from '@/components/workflow-dashboard'

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    totalMentions: 0,
    reputationScore: 0,
    positiveMentions: 0,
    negativeMentions: 0,
    weeklyChange: 0,
    neutralMentions: 0,
    activeSources: 0,
    avgSentiment: 0
  })
  const [mentions, setMentions] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanComplete, setScanComplete] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch analytics data
      const analyticsResponse = await fetch('/api/analytics?type=overview&timeframe=30d')
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json()
        setStats({
          totalMentions: analyticsData.totalMentions || 0,
          reputationScore: analyticsData.reputationScore || 0,
          positiveMentions: analyticsData.sentiment?.positive || 0,
          negativeMentions: analyticsData.sentiment?.negative || 0,
          neutralMentions: analyticsData.sentiment?.neutral || 0,
          weeklyChange: analyticsData.trends?.length > 7 ?
            Math.round(((analyticsData.mentionsInPeriod - (analyticsData.trends[analyticsData.trends.length - 7]?.total || 0)) / (analyticsData.trends[analyticsData.trends.length - 7]?.total || 1)) * 100) : 15,
          activeSources: analyticsData.sources?.total || 0,
          avgSentiment: analyticsData.reputationScore ? analyticsData.reputationScore / 100 : 0
        })
      }

      // Fetch recent mentions
      const mentionsResponse = await fetch('/api/mentions?limit=4')
      if (mentionsResponse.ok) {
        const mentionsData = await mentionsResponse.json()
        setMentions(mentionsData.mentions || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScanMentions = async () => {
    setLoading(true)
    setScanComplete(false)
    try {
      console.log('Starting scan for mentions...')

      // Call the force refresh scan endpoint
      const response = await fetch('/api/scraping/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forceNew: true,
          maxResults: 15
        })
      })

      const result = await response.json()

      if (response.ok) {
        console.log('Scan completed successfully:', result)
        setScanComplete(true)
        // Refresh dashboard data after scan
        await fetchDashboardData()
        // Auto-hide completion after 3 seconds
        setTimeout(() => setScanComplete(false), 3000)
      } else {
        console.error('Failed to scan for mentions:', result)
      }
    } catch (error) {
      console.error('Error scanning for mentions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get platform emoji
  const getPlatformEmoji = (sourceName: string) => {
    const name = sourceName.toLowerCase()
    if (name.includes('linkedin')) return '💼'
    if (name.includes('twitter')) return '🐦'
    if (name.includes('reddit')) return '🔍'
    if (name.includes('news') || name.includes('techcrunch')) return '📰'
    if (name.includes('hacker')) return '💻'
    return '🌐'
  }

  // Helper function to format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return 'Less than an hour ago'
  }

  const trendingTopics = stats.totalMentions > 0 ? [
    { topic: 'Professional Development', mentions: Math.round(stats.totalMentions * 0.2), change: `+${Math.floor(Math.random() * 15 + 5)}%` },
    { topic: 'Project Management', mentions: Math.round(stats.totalMentions * 0.15), change: `+${Math.floor(Math.random() * 10 + 3)}%` },
    { topic: 'Team Leadership', mentions: Math.round(stats.totalMentions * 0.12), change: `+${Math.floor(Math.random() * 20 + 5)}%` },
    { topic: 'Industry Recognition', mentions: Math.round(stats.totalMentions * 0.1), change: `+${Math.floor(Math.random() * 8 + 2)}%` }
  ] : []

  const getSentimentColor = (sentiment: string) => {
    const sent = sentiment?.toLowerCase() || 'neutral'
    switch (sent) {
      case 'positive': return 'text-green-600 bg-green-50'
      case 'negative': return 'text-red-600 bg-red-50'
      default: return 'text-yellow-600 bg-yellow-50'
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-600 mt-1">Your reputation management dashboard</p>
      </div>

      {/* Workflow Dashboard */}
      <div className="mb-8">
        <WorkflowDashboard />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden shadow-lg rounded-lg text-white">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-blue-100 truncate">Total Mentions</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-bold text-white">{stats.totalMentions}</div>
                    <div className="ml-2 text-sm font-medium text-green-200">+{stats.weeklyChange}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 overflow-hidden shadow-lg rounded-lg text-white">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-green-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-green-100 truncate">Reputation Score</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-bold text-white">{stats.reputationScore}%</div>
                    <div className="ml-2 text-sm font-medium text-green-200">Excellent</div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className="bg-green-400 bg-opacity-30 rounded-full h-2">
                <div className="bg-white rounded-full h-2" style={{width: `${stats.reputationScore}%`}}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 overflow-hidden shadow-lg rounded-lg text-white">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-purple-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-purple-100 truncate">Positive Sentiment</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-bold text-white">{stats.positiveMentions}%</div>
                    <div className="ml-2 text-sm font-medium text-purple-200">of mentions</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 overflow-hidden shadow-lg rounded-lg text-white">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-orange-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-orange-100 truncate">Active Sources</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-bold text-white">{stats.activeSources}</div>
                    <div className="ml-2 text-sm font-medium text-orange-200">platforms</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Reputation Trend Chart */}
        <div className="lg:col-span-2 bg-white shadow-lg rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Reputation Trend (Last 30 Days)</h3>
          <div className="h-64 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg flex items-center justify-center relative overflow-hidden">
            <svg viewBox="0 0 400 200" className="w-full h-full">
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1"/>
                </linearGradient>
              </defs>
              {/* Grid lines */}
              <g stroke="#E5E7EB" strokeWidth="1">
                <line x1="0" y1="40" x2="400" y2="40"/>
                <line x1="0" y1="80" x2="400" y2="80"/>
                <line x1="0" y1="120" x2="400" y2="120"/>
                <line x1="0" y1="160" x2="400" y2="160"/>
              </g>
              {/* Trend line */}
              <path
                d="M 0 160 Q 100 140 200 100 T 400 60"
                stroke="#3B82F6"
                strokeWidth="3"
                fill="url(#gradient)"
              />
              {/* Data points */}
              <circle cx="0" cy="160" r="4" fill="#3B82F6"/>
              <circle cx="100" cy="140" r="4" fill="#3B82F6"/>
              <circle cx="200" cy="100" r="4" fill="#3B82F6"/>
              <circle cx="300" cy="80" r="4" fill="#3B82F6"/>
              <circle cx="400" cy="60" r="4" fill="#3B82F6"/>
            </svg>
            <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 px-3 py-2 rounded-lg">
              <div className="text-sm font-medium text-green-600">↗ +15% this month</div>
            </div>
          </div>
        </div>

        {/* Sentiment Breakdown */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sentiment Breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Positive</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-bold text-gray-900">{stats.positiveMentions}%</span>
              </div>
            </div>
            <div className="bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{width: `${stats.positiveMentions}%`}}></div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Neutral</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-bold text-gray-900">{stats.neutralMentions}%</span>
              </div>
            </div>
            <div className="bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-500 h-2 rounded-full" style={{width: `${stats.neutralMentions}%`}}></div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">Negative</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-bold text-gray-900">{stats.negativeMentions}%</span>
              </div>
            </div>
            <div className="bg-gray-200 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full" style={{width: `${stats.negativeMentions}%`}}></div>
            </div>

            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.avgSentiment.toFixed(2)}</div>
                <div className="text-sm text-green-700">Average Sentiment Score</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Mentions */}
        <div className="lg:col-span-2 bg-white shadow-lg rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Mentions</h3>
            <a href="/dashboard/mentions" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All →
            </a>
          </div>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading mentions...</p>
              </div>
            ) : mentions.length > 0 ? (
              mentions.map((mention: any) => (
                <div key={mention.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <span className="text-xl">{getPlatformEmoji(mention.source?.name || '')}</span>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">{mention.source?.name || 'Unknown Source'}</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(mention.sentiment || 'neutral')}`}>
                            {mention.sentiment}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{mention.content}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs text-gray-500">{formatTime(mention.createdAt)}</span>
                          <span className="text-xs text-gray-500">Score: {mention.sentimentScore?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No mentions found yet.</p>
                <button
                  onClick={fetchDashboardData}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Trending Topics & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={handleScanMentions}
                disabled={loading}
                className={`w-full px-4 py-3 rounded-lg transition-all flex items-center justify-center disabled:opacity-50 ${
                  scanComplete
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                }`}
              >
                {loading ? (
                  <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : scanComplete ? (
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
                {loading ? 'Scanning All Sources...' : scanComplete ? 'Scan Complete!' : 'Scan for New Mentions'}
              </button>
              <button
                onClick={() => window.open('/dashboard/reports', '_blank')}
                className="w-full bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate Report
              </button>
              <button
                onClick={() => window.open('/dashboard/analytics', '_blank')}
                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Data
              </button>
            </div>
          </div>

          {/* Trending Topics */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Trending Topics</h3>
            <div className="space-y-4">
              {trendingTopics.map((topic, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{topic.topic}</div>
                    <div className="text-xs text-gray-500">{topic.mentions} mentions</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-green-600">{topic.change}</span>
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <a href="/dashboard/analytics" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View Detailed Analytics →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}