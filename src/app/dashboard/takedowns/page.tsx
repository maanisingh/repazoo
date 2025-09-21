'use client'

import { useState } from 'react'

interface TakedownRequest {
  id: number
  mentionId: number
  platform: string
  content: string
  reason: string
  legalGround: string
  recipientEmail: string
  status: 'draft' | 'sent' | 'acknowledged' | 'approved' | 'rejected' | 'completed'
  submittedDate: string
  responseDate?: string
  notes?: string
}

export default function TakedownsPage() {
  const [takedownRequests] = useState<TakedownRequest[]>([
    {
      id: 1,
      mentionId: 3,
      platform: 'TechCrunch',
      content: 'This startup is likely to fail due to poor leadership and questionable business practices.',
      reason: 'Defamatory statements',
      legalGround: 'False and damaging statements affecting business reputation',
      recipientEmail: 'legal@techcrunch.com',
      status: 'sent',
      submittedDate: '2025-09-18T10:30:00Z',
      notes: 'DMCA takedown notice sent with evidence package'
    },
    {
      id: 2,
      mentionId: 5,
      platform: 'Industry Blog',
      content: 'Company engaged in fraudulent activities and should be avoided at all costs.',
      reason: 'False accusations of fraud',
      legalGround: 'Completely fabricated claims causing reputational damage',
      recipientEmail: 'editor@industryblog.com',
      status: 'draft',
      submittedDate: '2025-09-17T14:15:00Z',
      notes: 'Draft prepared, awaiting legal review before sending'
    },
    {
      id: 3,
      mentionId: 8,
      platform: 'Local News Site',
      content: 'Multiple complaints filed against this business for unethical practices.',
      reason: 'Unsubstantiated claims',
      legalGround: 'No evidence provided for claims of complaints or unethical practices',
      recipientEmail: 'news@localnews.com',
      status: 'approved',
      submittedDate: '2025-09-15T09:45:00Z',
      responseDate: '2025-09-16T12:00:00Z',
      notes: 'Publication agreed to remove article and issue correction'
    },
    {
      id: 4,
      mentionId: 12,
      platform: 'Review Website',
      content: 'Fake company with no real services - complete scam operation.',
      reason: 'False business claims',
      legalGround: 'Deliberate misinformation about business legitimacy',
      recipientEmail: 'support@reviewsite.com',
      status: 'completed',
      submittedDate: '2025-09-12T16:20:00Z',
      responseDate: '2025-09-14T10:30:00Z',
      notes: 'Review removed after verification of business legitimacy'
    }
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'sent': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'acknowledged': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'approved': return 'text-green-600 bg-green-50 border-green-200'
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200'
      case 'completed': return 'text-purple-600 bg-purple-50 border-purple-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'techcrunch': return '📰'
      case 'industry blog': return '📝'
      case 'local news site': return '📺'
      case 'review website': return '⭐'
      case 'news article': return '📰'
      case 'blog': return '📝'
      case 'forum': return '💬'
      default: return '🌐'
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Formal Takedown Requests</h1>
            <p className="text-gray-600 mt-1">Send and track formal email-based content removal requests</p>
          </div>
          <button className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-pink-700 transition-all duration-200 shadow-lg">
            <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New Takedown Request
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">1</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Draft</p>
              <p className="text-lg font-semibold text-gray-900">Pending Review</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">1</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Sent</p>
              <p className="text-lg font-semibold text-gray-900">Awaiting Response</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">2</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Successful</p>
              <p className="text-lg font-semibold text-gray-900">Takedowns</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">85%</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Success Rate</p>
              <p className="text-lg font-semibold text-gray-900">Overall</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Platform Type</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
              <option>All Platforms</option>
              <option>News Sites</option>
              <option>Blogs</option>
              <option>Review Sites</option>
              <option>Forums</option>
              <option>Publications</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
              <option>All Statuses</option>
              <option>Draft</option>
              <option>Sent</option>
              <option>Acknowledged</option>
              <option>Approved</option>
              <option>Rejected</option>
              <option>Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500">
              <option>Last 30 days</option>
              <option>Last 7 days</option>
              <option>Last 3 months</option>
              <option>All time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Takedown Requests Table */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Takedown Requests ({takedownRequests.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Legal Ground</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {takedownRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getPlatformIcon(request.platform)}</span>
                      <div className="text-sm font-medium text-gray-900">{request.platform}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <div className="text-sm text-gray-900 line-clamp-2">{request.content}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <div className="text-sm text-gray-900">{request.legalGround}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{request.recipientEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(request.submittedDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-3">
                      <button className="text-blue-600 hover:text-blue-800 transition-colors">
                        View Email
                      </button>
                      <button className="text-orange-600 hover:text-orange-800 transition-colors">
                        Resend
                      </button>
                      <button className="text-green-600 hover:text-green-800 transition-colors">
                        Track
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}