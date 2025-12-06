'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { FileText, BarChart3, Zap } from 'lucide-react'
import PatentFlowDemo from '@/components/patentflow/PatentFlowDemo'

export default function Home() {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    // If user is logged in, redirect to dashboard
    if (session) {
      router.push('/dashboard')
    }
  }, [session, router])

  // Show loading or redirect to login
  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-r-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            PatentFlow Enterprise
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Premium Patent Drafting & Analysis Platform
          </p>
          <div className="flex justify-center gap-4">
            <a 
              href="/auth/signin" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Sign In
            </a>
            <a 
              href="#demo" 
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              View Demo
            </a>
          </div>
        </div>
        
        {/* Demo Section */}
        <div id="demo" className="max-w-4xl mx-auto">
          <PatentFlowDemo />
        </div>
      </div>
    </div>
  )
}