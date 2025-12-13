'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { demoSession } from '@/lib/demo-session'

export default function SimpleDashboard() {
  const session = demoSession

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle>PatentFlow Enterprise Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold">Welcome to PatentFlow Enterprise!</h1>
            <p className="text-gray-600">
              You are successfully logged in as {session.user?.email ?? 'user'}.
            </p>
            <div className="rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
              Your account is active and the dashboard is ready for use.
            </div>
            <div className="mt-6">
              <Button asChild>
                <a href="/dashboard">Return to main dashboard</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
