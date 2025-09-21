export default function AboutPage() {

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-purple-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              About
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"> RepaZoo</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Protecting your digital reputation with AI-powered monitoring and automated response tools.
            </p>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                The Problem We Solve
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Your online reputation directly impacts career opportunities, business success, and personal relationships. Negative content can spread faster than you can track it, and most people don't know when damaging information appears online about them.
              </p>
              <p className="text-lg text-gray-600 mb-6">
                RepaZoo provides 24/7 monitoring across the internet, AI-powered sentiment analysis, and automated tools to help you maintain control over your digital reputation.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Real-Time Monitoring</h3>
                    <p className="text-sm text-gray-600">Track mentions across social media, news, and review sites</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Automated Response</h3>
                    <p className="text-sm text-gray-600">Generate takedown requests and manage social content</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-blue-600">10M+</div>
                  <div className="text-sm text-gray-600">Mentions Monitored</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-600">1,000+</div>
                  <div className="text-sm text-gray-600">Active Customers</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600">95%</div>
                  <div className="text-sm text-gray-600">Customer Satisfaction</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-orange-600">24/7</div>
                  <div className="text-sm text-gray-600">Monitoring Coverage</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How RepaZoo Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI-powered system continuously monitors the internet for mentions of your name or business.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                🔍
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Monitor</h3>
              <p className="text-gray-600">Scan social media, news sites, review platforms, and blogs 24/7 for mentions of your name or brand.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                🤖
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Analyze</h3>
              <p className="text-gray-600">AI analyzes sentiment, context, and impact of each mention with detailed confidence scores.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                ⚡
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Respond</h3>
              <p className="text-gray-600">Generate takedown requests, manage social content, and track your reputation score over time.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Technology Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powered by Advanced AI
            </h2>
            <p className="text-xl text-gray-600">
              Three-tier AI system for comprehensive reputation analysis.
            </p>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3">1</div>
                <h3 className="text-lg font-bold text-gray-900">Local Sentiment Analysis</h3>
              </div>
              <p className="text-gray-600">Fast initial sentiment scoring for immediate alerts on negative content.</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">2</div>
                <h3 className="text-lg font-bold text-gray-900">HuggingFace Models</h3>
              </div>
              <p className="text-gray-600">Advanced context analysis for nuanced understanding of mention significance.</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold mr-3">3</div>
                <h3 className="text-lg font-bold text-gray-900">GPT-4 Analysis</h3>
              </div>
              <p className="text-gray-600">Sophisticated response generation and crisis management recommendations.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose RepaZoo
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              The core principles that make RepaZoo the most effective reputation management platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                🛡️
              </div>
              <h3 className="text-xl font-bold mb-3">Comprehensive Coverage</h3>
              <p className="text-gray-300">Monitor 12+ platforms including social media, news sites, and review platforms for complete visibility.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                ⚡
              </div>
              <h3 className="text-xl font-bold mb-3">Instant Response</h3>
              <p className="text-gray-300">Real-time alerts and automated takedown generation mean you can respond to threats immediately.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                🤝
              </div>
              <h3 className="text-xl font-bold mb-3">Proven Results</h3>
              <p className="text-gray-300">95% accuracy in sentiment analysis and 24/7 monitoring ensure nothing slips through the cracks.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Take Control of Your Digital Reputation
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Start monitoring your online reputation today with our comprehensive AI-powered platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/dashboard" className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg">
              Start Free Trial
            </a>
            <a href="/pricing" className="bg-transparent text-white px-8 py-4 rounded-lg font-semibold border-2 border-white hover:bg-white hover:text-blue-600 transition-colors">
              View Pricing
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}