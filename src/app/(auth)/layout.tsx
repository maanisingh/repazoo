export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-purple-700 p-12 flex-col justify-between">
          <div>
            <div className="flex items-center mb-8">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-4">
                <span className="text-blue-600 font-bold text-lg">RZ</span>
              </div>
              <h1 className="text-2xl font-bold text-white">RepaZoo</h1>
            </div>
            <div className="text-white">
              <h2 className="text-4xl font-bold mb-6">
                Monitor Your Web Reputation
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Track mentions across news sites, blogs, forums, and review platforms with AI-powered insights.
              </p>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-green-800" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-blue-100">Real-time web domain monitoring</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-green-800" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-blue-100">AI-powered sentiment analysis</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-green-800" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-blue-100">Email takedown recommendations</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-blue-100 text-sm">
            <p>&copy; 2025 RepaZoo. Protecting digital reputations worldwide.</p>
          </div>
        </div>

        {/* Right side - Auth forms */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}