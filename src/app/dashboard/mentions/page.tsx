'use client'

import { useState, useEffect } from 'react'

interface Mention {
  id: string
  source: any
  title: string
  content: string
  url: string
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  sentimentScore: number
  createdAt: string
  status: string
  author?: string
}

export default function MentionsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState({
    source: 'all',
    sentiment: 'all',
    status: 'all',
    dateRange: 'last30days'
  })
  const [sortBy, setSortBy] = useState('date')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [mentions, setMentions] = useState<Mention[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchMentions()
    }, 300) // 300ms debounce

    return () => clearTimeout(delayedSearch)
  }, [selectedFilters, searchTerm])

  const fetchMentions = async () => {
    try {
      setLoading(true)

      // Build query parameters based on filters
      const params = new URLSearchParams()
      params.append('limit', '50')

      if (selectedFilters.sentiment !== 'all') {
        params.append('sentiment', selectedFilters.sentiment)
      }
      if (selectedFilters.status !== 'all') {
        params.append('status', selectedFilters.status)
      }
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/mentions?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setMentions(data.mentions || [])
      } else {
        console.error('Failed to fetch mentions')
      }
    } catch (error) {
      console.error('Error fetching mentions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScanMentions = async () => {
    setScanning(true)
    try {
      console.log('Starting force scan for new mentions...')
      const response = await fetch('/api/scraping/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forceNew: true,
          maxResults: 20
        })
      })

      const result = await response.json()

      if (response.ok) {
        console.log('Scan completed:', result)
        // Refresh mentions after scan
        await fetchMentions()
      } else {
        console.error('Scan failed:', result)
      }
    } catch (error) {
      console.error('Error during scan:', error)
    } finally {
      setScanning(false)
    }
  }

  // Remove the hardcoded mentions array - we'll use real data from API

  const getSentimentColor = (sentiment: string) => {
    const sent = sentiment?.toLowerCase() || 'neutral'
    switch (sent) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200'
      case 'negative': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    }
  }

  const getStatusColor = (status: string) => {
    const stat = status?.toLowerCase() || 'active'
    switch (stat) {
      case 'active': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'needs_action': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'email_recommended': return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'reviewed': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getSourceIcon = (sourceName: string) => {
    const name = sourceName?.toLowerCase() || ''
    if (name.includes('linkedin')) return '💼'
    if (name.includes('twitter')) return '🐦'
    if (name.includes('reddit')) return '🔍'
    if (name.includes('news') || name.includes('techcrunch')) return '📰'
    if (name.includes('hacker')) return '💻'
    if (name.includes('google')) return '🔍'
    return '🌐'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Web Domain Mentions</h1>
              <p className="text-gray-600 mt-2">Monitor mentions across news sites, blogs, forums, review platforms, and public web sources</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleScanMentions}
                disabled={scanning}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center disabled:opacity-50"
              >
                {scanning ? (
                  <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
                {scanning ? 'Scanning...' : 'Scan Now'}
              </button>
              <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Search Bar */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-4 lg:space-y-0">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search web mentions by content, domain, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Sort by Date</option>
                <option value="sentiment">Sort by Sentiment</option>
                <option value="score">Sort by Score</option>
                <option value="source">Sort by Source</option>
              </select>
              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
              <select
                value={selectedFilters.source}
                onChange={(e) => setSelectedFilters({...selectedFilters, source: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sources</option>
                <option value="linkedin">LinkedIn</option>
                <option value="twitter">Twitter</option>
                <option value="reddit">Reddit</option>
                <option value="google">Google News</option>
                <option value="techcrunch">TechCrunch</option>
                <option value="hackernews">Hacker News</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sentiment</label>
              <select
                value={selectedFilters.sentiment}
                onChange={(e) => setSelectedFilters({...selectedFilters, sentiment: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sentiments</option>
                <option value="POSITIVE">Positive</option>
                <option value="NEGATIVE">Negative</option>
                <option value="NEUTRAL">Neutral</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={selectedFilters.status}
                onChange={(e) => setSelectedFilters({...selectedFilters, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
                <option value="EMAIL_RECOMMENDED">Email Recommended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={selectedFilters.dateRange}
                onChange={(e) => setSelectedFilters({...selectedFilters, dateRange: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="last30days">Last 30 days</option>
                <option value="last7days">Last 7 days</option>
                <option value="last3months">Last 3 months</option>
                <option value="alltime">All time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mentions Table */}
        <div className="bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">All Mentions ({mentions.length})</h3>
              <div className="flex items-center space-x-3">
                <select className="px-3 py-1 border border-gray-300 rounded-md text-sm">
                  <option>Bulk Actions</option>
                  <option>Mark as Read</option>
                  <option>Generate Email Reports</option>
                  <option>Request Takedown Recommendations</option>
                  <option>Export Selected</option>
                  <option>Archive Selected</option>
                </select>
                <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                  Apply
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sentiment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-6 h-6 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="text-gray-500">Loading mentions...</span>
                      </div>
                    </td>
                  </tr>
                ) : mentions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center">
                      <div className="text-gray-500">
                        <p>No mentions found yet.</p>
                        <button
                          onClick={handleScanMentions}
                          className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Scan for mentions
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : mentions.map((mention) => (
                  <tr key={mention.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getSourceIcon(mention.source?.name || '')}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate max-w-24">{mention.source?.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">Score: {mention.sentimentScore?.toFixed(2) || '0.00'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-xs">
                        <div className="text-sm font-medium text-gray-900 mb-1 truncate">{mention.title}</div>
                        <div className="text-xs text-gray-600 truncate">{mention.content}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSentimentColor(mention.sentiment)}`}>
                        {mention.sentiment}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(mention.status)}`}>
                        {mention.status?.replace('_', ' ').toUpperCase() || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(mention.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-1">
                        <a
                          href={mention.url.split('?refresh=')[0].split('&source=')[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 transition-colors text-xs"
                        >
                          View
                        </a>
                        <button className="text-purple-600 hover:text-purple-800 transition-colors text-xs">
                          Email
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">1</span> to <span className="font-medium">{mentions.length}</span> of{' '}
                  <span className="font-medium">{mentions.length}</span> results
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm text-gray-500 border border-gray-300 rounded-md hover:bg-gray-50">
                  Previous
                </button>
                <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">
                  1
                </button>
                <button className="px-3 py-1 text-sm text-gray-500 border border-gray-300 rounded-md hover:bg-gray-50">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}