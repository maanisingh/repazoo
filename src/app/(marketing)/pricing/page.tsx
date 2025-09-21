export default function PricingPage() {
  const plans = [
    {
      name: 'Basic',
      price: 29,
      description: 'Perfect for individuals starting to monitor their reputation',
      features: [
        '100 mentions tracked per month',
        'Basic sentiment analysis',
        'Email alerts',
        'Manual takedown templates',
        'Community support'
      ],
      popular: false
    },
    {
      name: 'Pro',
      price: 99,
      description: 'For professionals who need comprehensive monitoring',
      features: [
        '1,000 mentions tracked per month',
        'Advanced AI sentiment analysis',
        'Real-time alerts',
        'Social media integration',
        'Automated takedown requests',
        'Priority support'
      ],
      popular: true
    },
    {
      name: 'Enterprise',
      price: 299,
      description: 'Complete reputation management for public figures',
      features: [
        'Unlimited mentions tracking',
        'Premium AI analysis (GPT-4)',
        'Instant alerts',
        'Full social media management',
        'Legal assistance for takedowns',
        'Dedicated account manager',
        'Custom reporting'
      ],
      popular: false
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your Reputation Protection Plan
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Select the plan that best fits your needs. All plans include our core monitoring features.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl ${
              plan.popular
                ? 'border-2 border-blue-600 shadow-xl'
                : 'border border-gray-200 shadow-lg'
            } p-8`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
              <p className="text-gray-600 mt-2">{plan.description}</p>
              <div className="mt-6">
                <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-gray-600">/month</span>
              </div>
            </div>

            <ul className="mt-8 space-y-4">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <button
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                  plan.popular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
              >
                Get Started
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">All Plans Include</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900">24/7 Monitoring</h4>
            <p className="text-gray-600 text-sm mt-2">Continuous scanning across the web</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900">Secure & Private</h4>
            <p className="text-gray-600 text-sm mt-2">Your data is encrypted and protected</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900">Instant Setup</h4>
            <p className="text-gray-600 text-sm mt-2">Get started in under 5 minutes</p>
          </div>
        </div>
      </div>
    </div>
  )
}