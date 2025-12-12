'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

interface ReviewWorkspaceProps {
  patentId: string
  defaultThread?: string
}

interface Comment {
  id: string
  content: string
  createdAt: string
  threadKey?: string | null
  role: string
  user: { id: string; name: string | null; email: string; role: string }
}

interface AssistantState {
  summary?: string
  novelty?: string
  risk?: string
  provider?: string
}

export function ReviewWorkspace({ patentId, defaultThread }: ReviewWorkspaceProps) {
  const { data: session } = useSession()
  const [comments, setComments] = useState<Comment[]>([])
  const [message, setMessage] = useState('')
  const [threadKey, setThreadKey] = useState(defaultThread || '')
  const [isSaving, setIsSaving] = useState(false)
  const [assistant, setAssistant] = useState<AssistantState>({})
  const [reportTemplate, setReportTemplate] = useState<'executive' | 'novelty' | 'risk'>('executive')
  const [reportFormat, setReportFormat] = useState<'pdf' | 'word'>('pdf')
  const [isExporting, setIsExporting] = useState(false)

  const roleTag = session?.user?.role || 'REVIEWER'

  const grouped = useMemo(() => {
    return comments.reduce<Record<string, Comment[]>>((acc, comment) => {
      const key = comment.threadKey || 'general'
      acc[key] = acc[key] ? [...acc[key], comment] : [comment]
      return acc
    }, {})
  }, [comments])

  useEffect(() => {
    fetch(`/api/patents/${patentId}/comments`)
      .then((res) => res.json())
      .then((payload) => setComments(payload.comments || []))
      .catch(() => toast.error('Unable to load comments'))
  }, [patentId])

  const submitComment = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/patents/${patentId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: message, threadKey: threadKey || undefined }),
      })
      if (!res.ok) {
        throw new Error('Request failed')
      }
      const payload = await res.json()
      setComments((prev) => [payload.comment, ...prev])
      setMessage('')
      toast.success('Comment posted')
    } catch (error) {
      console.error(error)
      toast.error('Could not post comment')
    } finally {
      setIsSaving(false)
    }
  }

  const callAssistant = async (mode: 'summary' | 'novelty' | 'risk') => {
    try {
      const res = await fetch(`/api/patents/${patentId}/assistants`, {
        method: 'POST',
        body: JSON.stringify({ mode }),
      })
      if (!res.ok) {
        throw new Error('Assistant request failed')
      }
      const payload = await res.json()
      setAssistant((prev) => ({ ...prev, [mode]: payload.response, provider: payload.provider }))
      toast.success(`Assistant ${mode} ready`)
    } catch (error) {
      console.error(error)
      toast.error('Assistant call failed')
    }
  }

  const exportReport = async () => {
    setIsExporting(true)
    try {
      const res = await fetch(`/api/patents/${patentId}/reports`, {
        method: 'POST',
        body: JSON.stringify({ template: reportTemplate, format: reportFormat }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${reportTemplate}-report.${reportFormat === 'pdf' ? 'pdf' : 'docx'}`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Report exported')
    } catch (error) {
      console.error(error)
      toast.error('Report export failed')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Tabs defaultValue="comments" className="space-y-4">
      <TabsList>
        <TabsTrigger value="comments">Comments</TabsTrigger>
        <TabsTrigger value="assistants">AI Assistants</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>

      <TabsContent value="comments" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Comment threads</CardTitle>
            <CardDescription>Role-tagged discussion tied to claim branches.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr,200px] md:items-center">
              <div className="space-y-2">
                <Label htmlFor="message">New comment</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={`Share feedback as ${roleTag}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thread">Thread anchor</Label>
                <InputSelect value={threadKey} onValueChange={setThreadKey} />
                <Button disabled={isSaving || !message} onClick={submitComment} className="w-full">
                  {isSaving ? 'Posting…' : 'Post comment'}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(grouped).map(([key, list]) => (
                <div key={key} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Badge variant="outline">{key === 'general' ? 'General' : `Branch ${key}`}</Badge>
                    <span className="text-muted-foreground">{list.length} notes</span>
                  </div>
                  <div className="space-y-3">
                    {list.map((comment) => (
                      <div key={comment.id} className="rounded border bg-muted/40 p-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-2">
                            <Badge variant="secondary">{comment.role}</Badge>
                            {comment.user.name || comment.user.email}
                          </span>
                          <time dateTime={comment.createdAt}>
                            {new Date(comment.createdAt).toLocaleString()}
                          </time>
                        </div>
                        <p className="mt-2 text-sm whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="assistants" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>AI assistants</CardTitle>
            <CardDescription>Summaries, novelty checks, and risk scoring with audit logging.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => callAssistant('summary')}>
                Summarize claims
              </Button>
              <Button variant="secondary" onClick={() => callAssistant('novelty')}>
                Novelty scan
              </Button>
              <Button variant="secondary" onClick={() => callAssistant('risk')}>
                Risk score
              </Button>
              {assistant.provider && <Badge variant="outline">Provider: {assistant.provider}</Badge>}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <AssistantPanel title="Summary" body={assistant.summary} />
              <AssistantPanel title="Novelty" body={assistant.novelty} />
              <AssistantPanel title="Risk" body={assistant.risk} />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reports" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Export reports</CardTitle>
            <CardDescription>Download PDF/Word work product from configurable templates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={reportTemplate} onValueChange={(value) => setReportTemplate(value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executive">Executive summary</SelectItem>
                    <SelectItem value="novelty">Novelty deck</SelectItem>
                    <SelectItem value="risk">Risk memo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={reportFormat} onValueChange={(value) => setReportFormat(value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="word">Word</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={exportReport} disabled={isExporting}>
                  {isExporting ? 'Exporting…' : 'Export report'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

function AssistantPanel({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
        {body || 'Run the assistant to populate this section.'}
      </p>
    </div>
  )
}

function InputSelect({ value, onValueChange }: { value: string; onValueChange: (val: string) => void }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Claim or branch" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">General</SelectItem>
        <SelectItem value="1">Claim 1</SelectItem>
        <SelectItem value="independent">Independent claims</SelectItem>
        <SelectItem value="dependent">Dependent claims</SelectItem>
      </SelectContent>
    </Select>
  )
}
