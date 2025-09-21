'use client'

import { useState, useEffect } from 'react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('settings')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      sms: false,
      desktop: true,
      newMentions: true,
      weeklyReports: true,
      takedownUpdates: true
    },
    monitoring: {
      autoScan: true,
      scanFrequency: 'daily',
      includeSocialMedia: true,
      includeNewsArticles: true,
      includeReviews: true,
      includeForums: true
    },
    ai: {
      sentimentThreshold: 0.3,
      autoTakedown: false,
      aiModel: 'standard'
    },
    account: {
      name: '',
      email: '',
      plan: '',
      apiKey: ''
    },
    profile: {
      // Basic Identity
      firstName: '',
      lastName: '',
      middleName: '',
      dateOfBirth: '',
      phoneNumber: '',

      // Known Aliases & Variations
      aliases: [],
      maidenName: '',
      formerNames: [],
      nicknames: [],

      // Geographic Information
      currentAddress: {
        street: '123 Main Street',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'United States'
      },
      previousAddresses: [],
      hometown: 'Portland, OR',

      // Professional Information
      profession: 'Software Engineer',
      jobTitle: 'Senior Full Stack Developer',
      company: 'Tech Corp',
      industry: 'Technology',
      workLocation: 'San Francisco, CA',
      yearsOfExperience: 10,
      specializations: ['React', 'Node.js', 'TypeScript'],

      // Education
      education: [
        {
          institution: 'University of California, Berkeley',
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          graduationYear: 2012
        }
      ],
      certifications: ['AWS Certified Developer', 'Google Cloud Professional'],

      // Online Presence
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      twitterHandle: '@johndoe',
      facebookUrl: '',
      instagramHandle: '',
      githubUsername: 'johndoe',
      website: 'https://johndoe.com',
      personalBlog: '',
      professionalProfiles: [],

      // Content & Publications
      publications: [],
      speaking: [],
      awards: [],
      patents: [],

      // Family & Associates
      spouseName: '',
      familyMembers: [],
      businessPartners: [],
      frequentContacts: [],

      // Verification Status
      identityVerified: false,
      emailVerified: true,
      phoneVerified: false,
      addressVerified: false,
      employmentVerified: false,
      educationVerified: false,

      // Professional Bio
      bio: 'Experienced software engineer with 10 years in full-stack development.',
      verificationDocuments: [],

      // Monitoring Preferences
      monitorVariations: true,
      includeFamily: false,
      alertThreshold: 'medium',
      sensitiveKeywords: ['lawsuit', 'fraud', 'fired', 'scandal']
    }
  })

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        })
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)

          // Update settings with real user data
          setSettings(prev => ({
            ...prev,
            account: {
              name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
              email: userData.email || '',
              plan: userData.plan?.charAt(0) + userData.plan?.slice(1).toLowerCase() || 'Basic',
              apiKey: 'rz_sk_***************' // Keep masked for security
            },
            profile: {
              ...prev.profile,
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              // Fill other profile fields from userData.profile if available
              ...(userData.profile || {})
            }
          }))
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [])

  const tabs = [
    { id: 'settings', name: 'Settings', icon: '⚙️' },
    { id: 'profile', name: 'Profile Building', icon: '👤' },
    { id: 'subscriptions', name: 'Subscriptions', icon: '💳' },
    { id: 'legal', name: 'Legal/Policies', icon: '📋' }
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
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
      <div className="space-y-8">
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <>
            {/* Account Information */}
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={settings.account.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={settings.account.email}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={settings.account.apiKey}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      readOnly
                    />
                    <button className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm">
                      Regenerate
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                    <p className="text-sm text-gray-500">Receive notifications via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.notifications.email} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">New Mentions</h4>
                    <p className="text-sm text-gray-500">Get notified when new mentions are found</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.notifications.newMentions} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* AI Settings */}
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">AI & Automation</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">AI Model</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="basic">Basic (Local Processing)</option>
                    <option value="standard" selected>Standard (HuggingFace)</option>
                    <option value="premium">Premium (GPT-4)</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Profile Building Tab */}
        {activeTab === 'profile' && (
          <>
            {/* Basic Identity Information */}
            <div className="bg-white shadow-lg rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Basic Identity Information</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  settings.profile.identityVerified
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {settings.profile.identityVerified ? 'Verified' : 'Pending Verification'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                  <input
                    type="text"
                    value={settings.profile.firstName}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
                  <input
                    type="text"
                    value={settings.profile.middleName}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={settings.profile.lastName}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={settings.profile.dateOfBirth}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={settings.profile.phoneNumber}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hometown</label>
                  <input
                    type="text"
                    value={settings.profile.hometown}
                    placeholder="e.g., Portland, OR"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Known Aliases & Name Variations */}
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Known Aliases & Name Variations</h3>
              <p className="text-sm text-gray-600 mb-4">Help us monitor all variations of your name to prevent false negatives in reputation tracking.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Common Aliases</label>
                  <div className="space-y-2">
                    {settings.profile.aliases.map((alias, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={alias}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Johnny Doe, J. Doe"
                        />
                        <button className="text-red-600 hover:text-red-800">×</button>
                      </div>
                    ))}
                    <button className="text-sm text-blue-600 hover:text-blue-800">+ Add Alias</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nicknames</label>
                  <div className="space-y-2">
                    {settings.profile.nicknames.map((nickname, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={nickname}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Johnny, JD"
                        />
                        <button className="text-red-600 hover:text-red-800">×</button>
                      </div>
                    ))}
                    <button className="text-sm text-blue-600 hover:text-blue-800">+ Add Nickname</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maiden Name</label>
                  <input
                    type="text"
                    value={settings.profile.maidenName}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="If applicable"
                  />
                </div>
              </div>
            </div>

            {/* Current Address */}
            <div className="bg-white shadow-lg rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Current Address</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  settings.profile.addressVerified
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {settings.profile.addressVerified ? 'Verified' : 'Pending'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                  <input
                    type="text"
                    value={settings.profile.currentAddress.street}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={settings.profile.currentAddress.city}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                  <input
                    type="text"
                    value={settings.profile.currentAddress.state}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP/Postal Code</label>
                  <input
                    type="text"
                    value={settings.profile.currentAddress.zipCode}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={settings.profile.currentAddress.country}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="bg-white shadow-lg rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Professional Information</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  settings.profile.employmentVerified
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {settings.profile.employmentVerified ? 'Verified' : 'Pending'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                  <input
                    type="text"
                    value={settings.profile.jobTitle}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                  <input
                    type="text"
                    value={settings.profile.company}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                  <input
                    type="text"
                    value={settings.profile.industry}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Work Location</label>
                  <input
                    type="text"
                    value={settings.profile.workLocation}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                  <input
                    type="number"
                    value={settings.profile.yearsOfExperience}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Professional Bio</label>
                  <textarea
                    rows={3}
                    value={settings.profile.bio}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe your professional background..."
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Specializations/Skills</label>
                <div className="flex flex-wrap gap-2">
                  {settings.profile.specializations.map((skill, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
                      {skill}
                      <button className="ml-2 text-blue-600 hover:text-blue-800">×</button>
                    </span>
                  ))}
                  <button className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm hover:bg-gray-200">
                    + Add Skill
                  </button>
                </div>
              </div>
            </div>

            {/* Education & Certifications */}
            <div className="bg-white shadow-lg rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Education & Certifications</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  settings.profile.educationVerified
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {settings.profile.educationVerified ? 'Verified' : 'Pending'}
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Education</h4>
                  {settings.profile.education.map((edu, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-200 rounded-lg mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Institution</label>
                        <input
                          type="text"
                          value={edu.institution}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Degree</label>
                        <input
                          type="text"
                          value={edu.degree}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Field of Study</label>
                        <input
                          type="text"
                          value={edu.field}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Graduation Year</label>
                        <input
                          type="number"
                          value={edu.graduationYear}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                  <button className="text-sm text-blue-600 hover:text-blue-800">+ Add Education</button>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Certifications</h4>
                  <div className="flex flex-wrap gap-2">
                    {settings.profile.certifications.map((cert, index) => (
                      <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center">
                        {cert}
                        <button className="ml-2 text-green-600 hover:text-green-800">×</button>
                      </span>
                    ))}
                    <button className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm hover:bg-gray-200">
                      + Add Certification
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Online Presence */}
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Online Presence & Social Profiles</h3>
              <p className="text-sm text-gray-600 mb-4">Add your social media profiles to ensure comprehensive monitoring and avoid false positives.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn URL</label>
                  <input
                    type="url"
                    value={settings.profile.linkedinUrl}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Twitter Handle</label>
                  <input
                    type="text"
                    value={settings.profile.twitterHandle}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GitHub Username</label>
                  <input
                    type="text"
                    value={settings.profile.githubUsername}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Personal Website</label>
                  <input
                    type="url"
                    value={settings.profile.website}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Facebook URL</label>
                  <input
                    type="url"
                    value={settings.profile.facebookUrl}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Instagram Handle</label>
                  <input
                    type="text"
                    value={settings.profile.instagramHandle}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="@username"
                  />
                </div>
              </div>
            </div>

            {/* Monitoring Preferences */}
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Monitoring Preferences</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Monitor Name Variations</h4>
                    <p className="text-sm text-gray-500">Include aliases and nicknames in monitoring</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.profile.monitorVariations} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alert Threshold</label>
                  <select
                    value={settings.profile.alertThreshold}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low - Alert on all mentions</option>
                    <option value="medium">Medium - Alert on negative sentiment</option>
                    <option value="high">High - Alert only on severe issues</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sensitive Keywords</label>
                  <p className="text-sm text-gray-500 mb-2">Keywords that should trigger immediate alerts</p>
                  <div className="flex flex-wrap gap-2">
                    {settings.profile.sensitiveKeywords.map((keyword, index) => (
                      <span key={index} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm flex items-center">
                        {keyword}
                        <button className="ml-2 text-red-600 hover:text-red-800">×</button>
                      </span>
                    ))}
                    <button className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm hover:bg-gray-200">
                      + Add Keyword
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Identity Verification Documents */}
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Identity Verification Documents</h3>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="mt-4">
                    <label className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload verification documents
                      </span>
                      <input type="file" className="sr-only" multiple accept=".pdf,.jpg,.jpeg,.png" />
                    </label>
                    <p className="mt-2 text-xs text-gray-500">
                      Upload government ID, professional certificates, employment verification, or other identity documents
                    </p>
                  </div>
                </div>

                {/* Verification Status Overview */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                  <div className="text-center p-3 rounded-lg bg-gray-50">
                    <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${settings.profile.emailVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <div className="text-xs text-gray-600">Email</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gray-50">
                    <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${settings.profile.phoneVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <div className="text-xs text-gray-600">Phone</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gray-50">
                    <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${settings.profile.addressVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <div className="text-xs text-gray-600">Address</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gray-50">
                    <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${settings.profile.employmentVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <div className="text-xs text-gray-600">Employment</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gray-50">
                    <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${settings.profile.educationVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <div className="text-xs text-gray-600">Education</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gray-50">
                    <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${settings.profile.identityVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <div className="text-xs text-gray-600">Identity</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <>
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Current Subscription</h3>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Pro Plan</h4>
                  <p className="text-sm text-gray-600">$99/month • Advanced monitoring and AI features</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">$99</div>
                  <div className="text-sm text-gray-500">per month</div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Upgrade to Enterprise
                </button>
                <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  Change Plan
                </button>
              </div>
            </div>

            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Billing History</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Pro Plan - September 2025</div>
                    <div className="text-sm text-gray-500">Paid on Sep 1, 2025</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">$99.00</div>
                    <div className="text-sm text-green-600">Paid</div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Pro Plan - August 2025</div>
                    <div className="text-sm text-gray-500">Paid on Aug 1, 2025</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">$99.00</div>
                    <div className="text-sm text-green-600">Paid</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Legal/Policies Tab */}
        {activeTab === 'legal' && (
          <>
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Legal Documents & Policies</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Terms of Service</h4>
                    <p className="text-sm text-gray-500">Last updated: September 1, 2025</p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Document
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Privacy Policy</h4>
                    <p className="text-sm text-gray-500">Last updated: September 1, 2025</p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Document
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Data Processing Agreement</h4>
                    <p className="text-sm text-gray-500">Last updated: September 1, 2025</p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Document
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Data & Privacy Controls</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Data Retention</h4>
                    <p className="text-sm text-gray-500">Control how long your data is stored</p>
                  </div>
                  <select className="px-3 py-1 border border-gray-300 rounded-md text-sm">
                    <option>1 year</option>
                    <option>2 years</option>
                    <option>5 years</option>
                    <option>Indefinite</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Data Export</h4>
                    <p className="text-sm text-gray-500">Download all your data</p>
                  </div>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                    Request Export
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Account Deletion</h4>
                    <p className="text-sm text-gray-500">Permanently delete your account</p>
                  </div>
                  <button className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}