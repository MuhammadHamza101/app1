'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Users, BarChart3, Shield, Clock, CheckCircle } from 'lucide-react'
import PatentFlowDemo from '@/components/patentflow/PatentFlowDemo'
import { demoSession } from '@/lib/demo-session'

export default function DashboardPage() {
  const session = demoSession
  const reviewQueue = [
    {
      id: 'assignment-1',
      patent: { title: 'Rotary Shaft Assembly', applicationNumber: 'US-2024-012345' },
      role: 'Reviewer',
      dueDate: new Date().toISOString(),
    },
    {
      id: 'assignment-2',
      patent: { title: 'Nonwoven Fabric System', applicationNumber: 'US-2023-098765' },
      role: 'Attorney',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    },
  ]

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800'
      case 'ATTORNEY':
        return 'bg-blue-100 text-blue-800'
      case 'PARALEGAL':
        return 'bg-green-100 text-green-800'
      case 'REVIEWER':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">PatentFlow Enterprise</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Patent Drafting & Analysis Platform</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{session.user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{session.user?.email}</p>
                </div>
                <Badge className={getRoleColor(session.user?.role || '')}>{session.user?.role}</Badge>
              </div>
              <Badge variant="outline" className="text-xs">No login needed</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">+3 this week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Analyses Run</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">47</div>
                  <p className="text-xs text-muted-foreground">+8 this week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Findings Fixed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">156</div>
                  <p className="text-xs text-muted-foreground">+24 this week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8</div>
                  <p className="text-xs text-muted-foreground">2 active now</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                <div>
                  <CardTitle>My reviews</CardTitle>
                  <CardDescription>Assignments available in the demo.</CardDescription>
                </div>
                <Badge variant="outline">{reviewQueue.length} open</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {reviewQueue.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-semibold text-sm">{assignment.patent?.title || 'Unlabeled patent'}</p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.patent?.applicationNumber || assignment.patent?.publicationNumber || assignment.patent?.id}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground space-y-1">
                      <Badge variant="secondary">{assignment.role}</Badge>
                      <div>{assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Analysis completed</p>
                      <p className="text-xs text-muted-foreground">Rotary Shaft Assembly - 8 findings resolved</p>
                    </div>
                    <div className="text-xs text-muted-foreground">2 hours ago</div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New document uploaded</p>
                      <p className="text-xs text-muted-foreground">Nonwoven Fabric System - awaiting analysis</p>
                    </div>
                    <div className="text-xs text-muted-foreground">5 hours ago</div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Review needed</p>
                      <p className="text-xs text-muted-foreground">Claim set flagged for antecedent basis check</p>
                    </div>
                    <div className="text-xs text-muted-foreground">Yesterday</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance & Security</CardTitle>
                <CardDescription>Encryption and audit posture</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Data encrypted</p>
                      <p className="text-xs text-muted-foreground">AES-256-GCM at rest & in transit</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Healthy
                  </Badge>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">Recent audit</p>
                    <p className="text-xs text-muted-foreground">Completed 3 days ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle>PatentFlow Analysis</CardTitle>
                <CardDescription>Run AI-assisted reviews on your encrypted drafts</CardDescription>
              </CardHeader>
              <CardContent>
                <PatentFlowDemo />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
