'use client'

import { useState } from 'react'

interface Report {
  id: number
  name: string
  type: 'weekly' | 'monthly' | 'quarterly' | 'custom'
  status: 'scheduled' | 'generating' | 'completed' | 'failed'
  nextRun: string
  lastRun: string
  recipients: string[]
  format: 'pdf' | 'excel' | 'csv'
}

interface ReportTemplate {
  id: number
  name: string
  description: string
  metrics: string[]
  frequency: string
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('scheduled')

  const scheduledReports: Report[] = [
    {
      id: 1,
      name: 'Weekly Executive Summary',
      type: 'weekly',
      status: 'scheduled',
      nextRun: '2025-09-27T09:00:00Z',
      lastRun: '2025-09-20T09:00:00Z',
      recipients: ['ceo@company.com', 'marketing@company.com'],
      format: 'pdf'
    },
    {
      id: 2,
      name: 'Monthly Reputation Analysis',
      type: 'monthly',
      status: 'generating',
      nextRun: '2025-10-01T08:00:00Z',
      lastRun: '2025-09-01T08:00:00Z',
      recipients: ['team@company.com'],
      format: 'excel'
    },
    {
      id: 3,
      name: 'Quarterly Trend Report',
      type: 'quarterly',
      status: 'completed',
      nextRun: '2025-12-01T10:00:00Z',
      lastRun: '2025-09-01T10:00:00Z',
      recipients: ['board@company.com'],
      format: 'pdf'
    }
  ]

  const reportTemplates: ReportTemplate[] = [
    {
      id: 1,
      name: 'Executive Dashboard',
      description: 'High-level metrics and trends for leadership',
      metrics: ['Reputation Score', 'Sentiment Trends', 'Top Sources', 'Key Insights'],
      frequency: 'Weekly'
    },
    {
      id: 2,
      name: 'Detailed Analytics',
      description: 'Comprehensive analysis with all metrics',
      metrics: ['All Mentions', 'Platform Breakdown', 'Geographic Data', 'Competitor Analysis'],
      frequency: 'Monthly'
    },
    {
      id: 3,
      name: 'Incident Response',
      description: 'Focus on negative mentions and crisis management',
      metrics: ['Negative Mentions', 'Crisis Timeline', 'Response Actions', 'Recovery Metrics'],
      frequency: 'As Needed'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'generating': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'failed': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const tabs = [
    { id: 'scheduled', name: 'Scheduled Reports', icon: '📅' },
    { id: 'templates', name: 'Templates', icon: '📄' },
    { id: 'builder', name: 'Report Builder', icon: '🔧' },
    { id: 'history', name: 'History', icon: '📊' }
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Automated Reports</h1>
            <p className="text-gray-600 mt-1">Schedule and manage automated reputation reports</p>
          </div>
          <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg">
            <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create New Report
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <nav className="flex space-x-8 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'scheduled' && (
        <div className="space-y-6">
          {/* Scheduled Reports */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Scheduled Reports</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Run</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipients</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scheduledReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{report.name}</div>
                            <div className="text-sm text-gray-500">Format: {report.format.toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="capitalize text-sm text-gray-900">{report.type}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(report.nextRun).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{report.recipients.length} recipients</div>
                        <div className="text-sm text-gray-500">{report.recipients[0]}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-800">Edit</button>
                          <button className="text-green-600 hover:text-green-800">Run Now</button>
                          <button className="text-red-600 hover:text-red-800">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportTemplates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                <span className="text-sm text-gray-500">{template.frequency}</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>
              <div className="space-y-2 mb-6">
                <h4 className="text-sm font-medium text-gray-900">Included Metrics:</h4>
                <div className="flex flex-wrap gap-2">
                  {template.metrics.map((metric, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {metric}
                    </span>
                  ))}
                </div>
              </div>
              <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Use Template
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'builder' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Custom Report Builder</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Report Configuration</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Report Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter report name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Weekly</option>
                    <option>Monthly</option>
                    <option>Quarterly</option>
                    <option>Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>PDF</option>
                    <option>Excel</option>
                    <option>CSV</option>
                    <option>PowerPoint</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Include Metrics</h4>
              <div className="space-y-2">
                {['Reputation Score', 'Total Mentions', 'Sentiment Analysis', 'Top Sources', 'Geographic Data', 'Trending Topics', 'Competitor Analysis', 'Crisis Alerts'].map((metric) => (
                  <label key={metric} className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="ml-2 text-sm text-gray-700">{metric}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Save as Template
            </button>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Schedule Report
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Report Generation History</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Weekly Executive Summary</div>
                  <div className="text-sm text-gray-500">Generated on Sep 20, 2025 at 9:00 AM</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">2.3 MB</span>
                <button className="text-blue-600 hover:text-blue-800 text-sm">Download</button>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Monthly Reputation Analysis</div>
                  <div className="text-sm text-gray-500">Generated on Sep 1, 2025 at 8:00 AM</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">5.7 MB</span>
                <button className="text-blue-600 hover:text-blue-800 text-sm">Download</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}