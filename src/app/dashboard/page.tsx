'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  FileText,
  Users,
  BarChart3,
  Settings,
  Shield,
  Clock,
  CheckCircle,
  Plus,
  Mail,
  KeyRound,
  PlayCircle,
  Database,
  History,
} from 'lucide-react'
import PatentFlowDemo from '@/components/patentflow/PatentFlowDemo'
import { demoSession } from '@/lib/demo-session'

export default function DashboardPage() {
  const session = demoSession
  const [reviewQueue, setReviewQueue] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/reviews')
      .then((res) => res.json())
      .then((payload) => setReviewQueue(payload.assignments || []))
      .catch(() => setReviewQueue([]))
  }, [])

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
              {/* User Info */}
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{session.user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{session.user?.email}</p>
                </div>
                <Badge className={getRoleColor(session.user?.role || '')}>{session.user?.role}</Badge>
              </div>

              {/* Firm Info */}
              {session.user?.firm && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {typeof session.user.firm === 'object' ? session.user.firm.name : session.user.firm}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {typeof session.user.firm === 'object' ? session.user.firm.domain : 'N/A'}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
                <Badge variant="outline" className="text-xs">No login needed</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
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
                  <CardDescription>Assignments routed from the patent workspace.</CardDescription>
                </div>
                <Badge variant="outline">{reviewQueue.length || 0} open</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {reviewQueue.length === 0 && <p className="text-sm text-muted-foreground">No active review assignments yet.</p>}
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

          <TabsContent value="documents">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>Upload, review, and encrypt your drafts</CardDescription>
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Document
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Securely manage all firm documents. Content is encrypted at rest and only decrypted for authorized analysis.
                </p>
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

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team</CardTitle>
                <CardDescription>Invite collaborators and assign roles</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {['Alex Morgan', 'Jamie Lee', 'Taylor Brooks', 'Jordan Smith'].map((member) => (
                  <Card key={member} className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{member}</CardTitle>
                      <CardDescription>Attorney</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center space-x-2">
                      <Badge>Draft Access</Badge>
                      <Badge variant="outline">Analysis</Badge>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="onboarding">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Guided Walkthroughs</CardTitle>
                  <CardDescription>Coach first-time users through core workflows.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[{ title: 'Upload & Classify', steps: ['Import a sample draft', 'Apply firm taxonomy', 'Assign responsible attorney'] }, { title: 'Run First Analysis', steps: ['Select claim set', 'Run AI review', 'Export remediation checklist'] }, { title: 'Share for Review', steps: ['Route to reviewer', 'Track comments', 'Lock version for filing'] }].map((flow) => (
                    <div key={flow.title} className="p-3 rounded-lg border bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <PlayCircle className="w-4 h-4 text-blue-600" />
                          <p className="text-sm font-semibold">{flow.title}</p>
                        </div>
                        <Button size="sm" variant="outline">
                          Start
                        </Button>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        {flow.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sample Datasets</CardTitle>
                  <CardDescription>Provision curated patent sets to explore the platform.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[{ name: 'Biomedical Devices Starter', size: '18 patents, 6 IDS files', focus: 'stents, implantables' }, { name: 'Cloud Computing Portfolio', size: '24 patents, 3 continuations', focus: 'distributed storage, security' }, { name: 'GreenTech Filings', size: '15 patents, 2 provisionals', focus: 'EV charging, recycling' }].map((dataset) => (
                    <div key={dataset.name} className="p-3 rounded-lg border flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{dataset.name}</p>
                        <p className="text-xs text-muted-foreground">{dataset.size}</p>
                        <p className="text-xs text-muted-foreground">Focus: {dataset.focus}</p>
                      </div>
                      <Button size="sm" variant="secondary">
                        Load
                      </Button>
                    </div>
                  ))}
                  <div className="p-3 rounded-lg bg-muted border border-dashed">
                    <p className="text-sm font-medium">Need something specific?</p>
                    <p className="text-xs text-muted-foreground">Request a custom onboarding dataset scoped to your practice area.</p>
                    <Button className="mt-3" variant="outline" size="sm">
                      Request dataset
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Audit Trails</CardTitle>
                <CardDescription>Track sensitive actions across all patents and roles.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 text-xs font-semibold text-muted-foreground">
                  <span>User</span>
                  <span>Action</span>
                  <span>Patent</span>
                  <span>Timestamp</span>
                </div>
                {[{ user: 'Alex Morgan (Admin)', action: 'Reset password for Taylor Brooks', patent: 'Portfolio-wide', time: 'Today, 09:20' }, { user: 'Jamie Lee (Reviewer)', action: 'Exported claim audit log', patent: 'Cloud Storage Redundancy', time: 'Today, 08:10' }, { user: 'Jordan Smith (Attorney)', action: 'Accepted AI remediation on claim 12', patent: 'Rotary Shaft Assembly', time: 'Yesterday, 17:45' }, { user: 'Taylor Brooks (Paralegal)', action: 'Uploaded IDS package', patent: 'GreenTech Filings', time: 'Yesterday, 11:05' }].map((entry) => (
                  <div key={`${entry.user}-${entry.time}`} className="grid grid-cols-4 items-center p-3 rounded-lg border bg-muted/40 text-sm">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-blue-600" />
                      <span>{entry.user}</span>
                    </div>
                    <span>{entry.action}</span>
                    <span className="text-muted-foreground">{entry.patent}</span>
                    <span className="text-xs text-muted-foreground">{entry.time}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted">
                  <div>
                    <p className="text-sm font-medium">Retention & export</p>
                    <p className="text-xs text-muted-foreground">Audit trails are immutable and exportable as CSV for outside counsel.</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Download log
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Invite User</CardTitle>
                  <CardDescription>Send secure invitations with firm and role assignment.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">User email</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <Input id="invite-email" type="email" placeholder="paralegal@firm.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Role</Label>
                      <Select defaultValue="PARALEGAL">
                        <SelectTrigger id="invite-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="ATTORNEY">Attorney</SelectItem>
                          <SelectItem value="PARALEGAL">Paralegal</SelectItem>
                          <SelectItem value="REVIEWER">Reviewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-firm">Firm</Label>
                      <Select defaultValue="acme">
                        <SelectTrigger id="invite-firm">
                          <SelectValue placeholder="Select firm" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="acme">Acme IP Group</SelectItem>
                          <SelectItem value="northern">Northern Patent LLP</SelectItem>
                          <SelectItem value="sterling">Sterling & Co.</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Password policy</Label>
                    <p className="text-xs text-muted-foreground">Invitations expire in 48 hours and require MFA on first login.</p>
                  </div>
                  <Button className="w-full">Send invitation</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Role & Firm Assignment</CardTitle>
                  <CardDescription>Adjust permissions and membership with audit-ready controls.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[{ name: 'Taylor Brooks', email: 'tbrooks@acmeip.com', role: 'PARALEGAL', firm: 'Acme IP Group' }, { name: 'Jamie Lee', email: 'jlee@northernpatent.com', role: 'REVIEWER', firm: 'Northern Patent LLP' }].map((member) => (
                    <div key={member.email} className="p-3 rounded-lg border space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <Badge variant="secondary">{member.firm}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Role</Label>
                          <Select defaultValue={member.role}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="ATTORNEY">Attorney</SelectItem>
                              <SelectItem value="PARALEGAL">Paralegal</SelectItem>
                              <SelectItem value="REVIEWER">Reviewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Firm</Label>
                          <Select defaultValue={member.firm}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Acme IP Group">Acme IP Group</SelectItem>
                              <SelectItem value="Northern Patent LLP">Northern Patent LLP</SelectItem>
                              <SelectItem value="Sterling & Co.">Sterling & Co.</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Shield className="w-4 h-4" />
                          <span>Granular permissions logged to audit trail</span>
                        </div>
                        <Button size="sm" variant="outline">
                          Save changes
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Password Resets</CardTitle>
                  <CardDescription>Force rotations or send secure reset links.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[{ name: 'Alex Morgan', email: 'amorgan@sterlingco.com', status: 'MFA enforced' }, { name: 'Jordan Smith', email: 'jsmith@acmeip.com', status: 'Pending reset' }].map((user) => (
                    <div key={user.email} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-semibold">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{user.status}</Badge>
                        <Button variant="secondary" size="sm">
                          <KeyRound className="w-4 h-4 mr-2" />
                          Reset password
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Database className="w-4 h-4" />
                    <span>All reset actions are versioned and tied to patent access logs.</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Configure integrations, retention, and compliance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="text-sm font-medium">Encryption</p>
                    <p className="text-xs text-muted-foreground">Rotate keys and enforce client-side signing</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Shield className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="text-sm font-medium">Notifications</p>
                    <p className="text-xs text-muted-foreground">Control alerts for findings and reviews</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
