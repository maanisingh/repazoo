'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Mention {
  id: string
  title: string
  content: string
  url: string
  source: string
  source_type: string
  sentiment: string
  person_name: string
  company: string
  created_at: string
  status: string
}

interface ScrapingJob {
  id: string
  person_name: string
  company: string
  status: string
  mentions_found: number
  created_at: string
  started_at: string
  completed_at: string
}

export default function DataViewerPage() {
  const [mentions, setMentions] = useState<Mention[]>([])
  const [scrapingJobs, setScrapingJobs] = useState<ScrapingJob[]>([])
  const [monitoringSources, setMonitoringSources] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'mentions' | 'jobs' | 'sources'>('mentions')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch mentions
  const fetchMentions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('mentions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setMentions(data || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching mentions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch scraping jobs
  const fetchScrapingJobs = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('scraping_jobs')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setScrapingJobs(data || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching jobs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch monitoring sources
  const fetchMonitoringSources = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('monitoring_sources')
        .select('*')
        .order('name')

      if (error) throw error
      setMonitoringSources(data || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching sources:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Trigger a new scraping job
  const triggerScraping = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('scraping_jobs')
        .insert([
          {
            person_name: 'Andrew Chatterley',
            company: 'Musso',
            job_title: 'CEO',
            search_queries: [
              '"Andrew Chatterley" Musso',
              '"Andrew Chatterley" CEO',
              'Musso CEO',
              'Andrew Chatterley technology'
            ],
            status: 'PENDING'
          }
        ])
        .select()

      if (error) throw error

      // Trigger n8n webhook
      try {
        const response = await fetch('http://localhost:5678/webhook/scrape-mentions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: data[0].id,
            person_name: 'Andrew Chatterley',
            company: 'Musso',
            job_title: 'CEO'
          })
        })

        if (!response.ok) {
          console.warn('n8n webhook not available - manual trigger required')
        }
      } catch (err) {
        console.warn('n8n not running - start n8n to enable automated scraping')
      }

      fetchScrapingJobs()
      alert('Scraping job created! Check n8n workflows to process.')
    } catch (err: any) {
      setError(err.message)
      console.error('Error triggering scraping:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'mentions') fetchMentions()
    else if (activeTab === 'jobs') fetchScrapingJobs()
    else if (activeTab === 'sources') fetchMonitoringSources()
  }, [activeTab])

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'POSITIVE': return 'text-green-600 bg-green-100'
      case 'NEGATIVE': return 'text-red-600 bg-red-100'
      case 'NEUTRAL': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-500 bg-gray-50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-100'
      case 'RUNNING': return 'text-blue-600 bg-blue-100'
      case 'FAILED': return 'text-red-600 bg-red-100'
      case 'PENDING': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-500 bg-gray-50'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Data Viewer</h1>
              <p className="text-gray-600 mt-2">Monitor scraped data from Supabase</p>
            </div>
            <button
              onClick={triggerScraping}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Trigger Scraping'}
            </button>
          </div>

          {/* Connection Status */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span>Supabase Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>n8n: http://localhost:5678</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('mentions')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'mentions'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mentions ({mentions.length})
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'jobs'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Scraping Jobs ({scrapingJobs.length})
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'sources'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monitoring Sources ({monitoringSources.length})
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Mentions Tab */}
              {activeTab === 'mentions' && (
                <div className="overflow-x-auto">
                  {mentions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No mentions found. Trigger a scraping job to fetch data.
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Title</th>
                          <th className="text-left py-3 px-4">Source</th>
                          <th className="text-left py-3 px-4">Sentiment</th>
                          <th className="text-left py-3 px-4">Person</th>
                          <th className="text-left py-3 px-4">Status</th>
                          <th className="text-left py-3 px-4">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mentions.map((mention) => (
                          <tr key={mention.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <a
                                href={mention.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {mention.title.slice(0, 50)}...
                              </a>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-gray-600">{mention.source}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getSentimentColor(mention.sentiment)}`}>
                                {mention.sentiment || 'UNKNOWN'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium">{mention.person_name}</div>
                                {mention.company && (
                                  <div className="text-sm text-gray-500">{mention.company}</div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-gray-600">{mention.status}</span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              {new Date(mention.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Scraping Jobs Tab */}
              {activeTab === 'jobs' && (
                <div className="overflow-x-auto">
                  {scrapingJobs.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No scraping jobs found. Click "Trigger Scraping" to create one.
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Person</th>
                          <th className="text-left py-3 px-4">Company</th>
                          <th className="text-left py-3 px-4">Status</th>
                          <th className="text-left py-3 px-4">Mentions Found</th>
                          <th className="text-left py-3 px-4">Started</th>
                          <th className="text-left py-3 px-4">Completed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scrapingJobs.map((job) => (
                          <tr key={job.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{job.person_name}</td>
                            <td className="py-3 px-4">{job.company || '-'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(job.status)}`}>
                                {job.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">{job.mentions_found}</td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              {job.started_at ? new Date(job.started_at).toLocaleString() : '-'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-500">
                              {job.completed_at ? new Date(job.completed_at).toLocaleString() : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Monitoring Sources Tab */}
              {activeTab === 'sources' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {monitoringSources.map((source) => (
                    <div key={source.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">{source.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          source.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {source.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{source.type}</p>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-sm hover:underline break-all"
                      >
                        {source.url}
                      </a>
                      <div className="mt-2 text-xs text-gray-500">
                        Frequency: {source.scrape_frequency}
                        {source.last_scraped_at && (
                          <span className="ml-2">
                            • Last: {new Date(source.last_scraped_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Create a Supabase project at supabase.com</li>
            <li>Run the SQL schema in supabase-schema.sql</li>
            <li>Add Supabase credentials to .env file</li>
            <li>Start n8n: docker-compose -f docker-compose.n8n.yml up -d</li>
            <li>Access n8n at http://localhost:5678 (admin/repazoo123)</li>
            <li>Import n8n workflows from n8n-workflows.json</li>
            <li>Click "Trigger Scraping" to start collecting data</li>
          </ol>
        </div>
      </div>
    </div>
  )
}