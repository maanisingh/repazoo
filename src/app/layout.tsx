import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RepaZoo - Personal Reputation Management',
  description: 'Monitor and manage your online reputation with AI-powered insights',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}