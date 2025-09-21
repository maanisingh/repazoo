export default function FeaturesPage() {
  const features = [
    {
      icon: '🔍',
      title: 'Real-Time Monitoring',
      description: 'Monitor mentions across social media, news sites, blogs, and review platforms in real-time.',
      details: ['24/7 automated scanning', 'Instant notifications', '12+ platform coverage', 'Custom keyword tracking']
    },
    {
      icon: '🤖',
      title: 'AI-Powered Sentiment Analysis',
      description: 'Advanced AI analyzes sentiment with confidence scores and keyword detection.',
      details: ['95% accuracy rate', 'Confidence scoring', 'Keyword detection', 'Context analysis']
    },
    {
      icon: '📊',
      title: 'Advanced Analytics',
      description: 'Comprehensive dashboards with charts, trends, and actionable insights.',
      details: ['Interactive charts', 'Trend analysis', 'Platform breakdown', 'Geographic data']
    },
    {
      icon: '📧',
      title: 'Automated Takedown Requests',
      description: 'Generate and send professional takedown requests for negative content.',
      details: ['Legal templates', 'Email automation', 'Response tracking', 'Success metrics']
    },
    {
      icon: '📱',
      title: 'Social Media Integration',
      description: 'Connect your social accounts to manage your own content directly.',
      details: ['OAuth integration', 'Direct content deletion', 'Privacy controls', 'Bulk actions']
    },
    {
      icon: '📈',
      title: 'Automated Reporting',
      description: 'Scheduled reports delivered to stakeholders with custom metrics.',
      details: ['Multiple formats', 'Scheduled delivery', 'Custom templates', 'Executive summaries']
    },
    {
      icon: '👥',
      title: 'Team Collaboration',
      description: 'Assign mentions, add comments, and collaborate with team members.',
      details: ['Role-based access', 'Assignment workflows', 'Internal comments', 'Approval processes']
    },
    {
      icon: '🔒',
      title: 'Enterprise Security',
      description: 'SOC 2 compliant with enterprise-grade security features.',
      details: ['2FA authentication', 'IP whitelisting', 'Audit logs', 'GDPR compliance']
    },
    {
      icon: '🎯',
      title: 'Crisis Management',
      description: 'Rapid response tools for reputation crises with escalation workflows.',
      details: ['Crisis detection', 'Emergency alerts', 'Response templates', 'Recovery tracking']
    }
  ]

  const useCases = [
    {
      title: 'Executives & Professionals',
      description: 'Protect your personal brand and career reputation',
      benefits: ['Career advancement', 'Personal branding', 'Crisis prevention', 'Professional credibility']
    },
    {
      title: 'Small Businesses',
      description: 'Monitor customer feedback and manage online reputation',
      benefits: ['Customer insights', 'Review management', 'Local SEO boost', 'Competitive advantage']
    },
    {
      title: 'Agencies & Consultants',
      description: 'Manage multiple client reputations from one platform',
      benefits: ['White-label reports', 'Client dashboards', 'Scalable workflows', 'Revenue growth']
    },
    {
      title: 'Enterprise Companies',
      description: 'Corporate reputation management with team collaboration',
      benefits: ['Brand protection', 'Team workflows', 'Compliance tracking', 'Executive reporting']
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-purple-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Powerful Features for
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"> Complete Reputation Control</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Everything you need to monitor, analyze, and protect your online reputation with enterprise-grade tools and AI-powered insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/dashboard" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 px-8 py-4 rounded-lg font-semibold hover:from-yellow-300 hover:to-orange-400 transition-all duration-200 shadow-lg">
                Start Free Trial
              </a>
              <a href="/pricing" className="bg-white bg-opacity-10 text-white px-8 py-4 rounded-lg font-semibold hover:bg-opacity-20 transition-all duration-200 border border-white border-opacity-20">
                View Pricing
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Complete Reputation Management Suite
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From monitoring to takedown requests, our platform provides all the tools you need to protect and enhance your online reputation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 mb-6">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-700">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Perfect for Every Use Case
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Whether you're an individual professional or an enterprise team, RepaZoo adapts to your reputation management needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {useCases.map((useCase, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-8 border border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{useCase.title}</h3>
                <p className="text-gray-600 mb-6">{useCase.description}</p>
                <div className="grid grid-cols-2 gap-4">
                  {useCase.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center">
                      <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Integration Section */}
      <div className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Comprehensive Platform Coverage
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Monitor your reputation across all major platforms and sources where your audience is active.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {['Twitter', 'LinkedIn', 'Facebook', 'Instagram', 'Google Reviews', 'Yelp', 'TrustPilot', 'Reddit', 'YouTube', 'TikTok', 'News Sites', 'Blogs'].map((platform) => (
              <div key={platform} className="text-center">
                <div className="bg-white bg-opacity-10 rounded-lg p-6 mb-3 hover:bg-opacity-20 transition-colors">
                  <div className="text-2xl mb-2">
                    {platform === 'Twitter' && '🐦'}
                    {platform === 'LinkedIn' && '💼'}
                    {platform === 'Facebook' && '📘'}
                    {platform === 'Instagram' && '📷'}
                    {platform === 'Google Reviews' && '🔍'}
                    {platform === 'Yelp' && '⭐'}
                    {platform === 'TrustPilot' && '🛡️'}
                    {platform === 'Reddit' && '🤖'}
                    {platform === 'YouTube' && '📺'}
                    {platform === 'TikTok' && '🎵'}
                    {platform === 'News Sites' && '📰'}
                    {platform === 'Blogs' && '📝'}
                  </div>
                </div>
                <span className="text-sm text-gray-300">{platform}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Take Control of Your Reputation?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of professionals and businesses protecting their online reputation with RepaZoo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/dashboard" className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg">
              Start Free Trial
            </a>
            <a href="/pricing" className="bg-transparent text-white px-8 py-4 rounded-lg font-semibold border-2 border-white hover:bg-white hover:text-blue-600 transition-colors">
              View Pricing Plans
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}