'use client'

import { useState, useEffect } from 'react'

interface EmailReport {
  id: string
  type: 'TAKEDOWN_RECOMMENDATION' | 'WEEKLY_SUMMARY' | 'URGENT_ALERT' | 'MONTHLY_REPORT'
  title: string
  content: string
  status: 'DRAFT' | 'SENT' | 'SCHEDULED' | 'FAILED'
  recipientEmail: string
  scheduledFor?: string
  createdAt: string
  mentions: Array<{
    mention: {
      id: string
      title: string
      sentiment: string
      url: string
      source: {
        name: string
      }
    }
  }>
}

export default function EmailReportsPage() {
  const [selectedTab, setSelectedTab] = useState<'all' | 'takedown' | 'summary' | 'alerts'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [reports, setReports] = useState<EmailReport[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSent: 0,
    scheduled: 0,
    urgentActions: 0,
    successRate: 0
  })

  useEffect(() => {
    fetchEmailReports()
  }, [])

  const fetchEmailReports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/email-reports?limit=20')
      if (response.ok) {
        const data = await response.json()
        setReports(data.emailReports || [])

        // Calculate dynamic stats
        const reports = data.emailReports || []
        const totalSent = reports.filter((r: EmailReport) => r.status === 'SENT').length
        const scheduled = reports.filter((r: EmailReport) => r.status === 'SCHEDULED').length
        const urgentActions = reports.filter((r: EmailReport) => r.type === 'URGENT_ALERT').length
        const successRate = reports.length > 0 ? Math.round((totalSent / reports.length) * 100) : 0

        setStats({
          totalSent,
          scheduled,
          urgentActions,
          successRate
        })
      } else {
        console.error('Failed to fetch email reports')
      }
    } catch (error) {
      console.error('Error fetching email reports:', error)
    } finally {
      setLoading(false)
    }
  }


  const getStatusColor = (status: string) => {
    const stat = status?.toLowerCase() || 'draft'
    switch (stat) {
      case 'sent': return 'text-green-600 bg-green-50 border-green-200'
      case 'scheduled': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'draft': return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'failed': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    const typeKey = type?.toLowerCase().replace('_', '_') || ''
    switch (typeKey) {
      case 'takedown_recommendation': return '⚖️'
      case 'weekly_summary': return '📊'
      case 'urgent_alert': return '🚨'
      case 'monthly_report': return '📧'
      default: return '📄'
    }
  }

  const filteredReports = reports.filter(report => {
    if (selectedTab === 'all') return true
    if (selectedTab === 'takedown') return report.type === 'TAKEDOWN_RECOMMENDATION'
    if (selectedTab === 'summary') return report.type === 'WEEKLY_SUMMARY'
    if (selectedTab === 'alerts') return report.type === 'URGENT_ALERT'
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Email Reports & Takedown Recommendations</h1>
              <p className="text-gray-600 mt-2">Automated email reports with legal recommendations and reputation insights</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
              >
                <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Report
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Reports Sent</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSent}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Urgent Actions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.urgentActions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.successRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { key: 'all', label: 'All Reports', count: reports.length },
                { key: 'takedown', label: 'Takedown Recommendations', count: reports.filter(r => r.type === 'takedown_recommendation').length },
                { key: 'summary', label: 'Weekly Summaries', count: reports.filter(r => r.type === 'weekly_summary').length },
                { key: 'alerts', label: 'Urgent Alerts', count: reports.filter(r => r.type === 'urgent_alert').length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedTab(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">Email Reports ({filteredReports.length})</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Report</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Type</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Priority</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Mentions</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 py-3">
                      <div className="flex items-center">
                        <span className="text-sm mr-1">{getTypeIcon(report.type)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-gray-900 truncate">{report.title}</div>
                          <div className="text-xs text-gray-500 truncate">{report.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap hidden md:table-cell">
                      <span className="capitalize text-xs text-gray-600">
                        {report.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-1 py-1 rounded text-xs font-medium ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap hidden sm:table-cell">
                      <span className={`inline-flex items-center px-1 py-1 rounded text-xs font-medium ${getPriorityColor(report.priority)}`}>
                        {report.priority}
                      </span>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900 hidden lg:table-cell">
                      {report.mentions}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900">
                        {new Date(report.createdDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-xs font-medium">
                      <div className="flex flex-col space-y-1">
                        <button className="text-blue-600 hover:text-blue-800 transition-colors text-xs">
                          View
                        </button>
                        <button
                          onClick={() => alert('Email sending functionality would be implemented here with proper email service integration')}
                          className="text-green-600 hover:text-green-800 transition-colors text-xs"
                        >
                          Send
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Report Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create New Report</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Takedown Recommendation</option>
                    <option>Weekly Summary</option>
                    <option>Urgent Alert</option>
                    <option>Custom Report</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Email</label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      alert('Email report creation would be implemented here. This would call the /api/email-reports endpoint to create a new report.');
                      setShowCreateModal(false);
                    }}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                  >
                    Create Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}