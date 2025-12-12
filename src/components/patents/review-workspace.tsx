'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useRealtimeRoom } from '@/hooks/use-realtime-room'

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

interface Annotation {
  id: string
  targetLabel?: string | null
  startOffset: number
  endOffset: number
  body: string
  status: string
  createdAt: string
  author: { id: string; name: string | null; email: string }
  assignee?: { id: string; name: string | null; email: string } | null
}

interface PriorArtLink {
  id: string
  externalTitle?: string | null
  externalUrl?: string | null
  linkedPatentId?: string | null
  reasoning: string
  createdAt: string
  creator: { id: string; name: string | null; email: string }
}

interface PatentApproval {
  id: string
  status: string
  notes?: string | null
  updatedAt: string
  reviewer: { id: string; name: string | null; email: string; role: string }
}

interface Assignment {
  id: string
  status: string
  role: string
  dueDate?: string | null
  assignee: { id: string; name: string | null; email: string; role: string }
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
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [annotationDraft, setAnnotationDraft] = useState({
    targetLabel: defaultThread || '',
    startOffset: 0,
    endOffset: 0,
    body: '',
    assigneeId: '',
  })
  const [priorArt, setPriorArt] = useState<PriorArtLink[]>([])
  const [priorArtDraft, setPriorArtDraft] = useState({
    externalTitle: '',
    externalUrl: '',
    reasoning: '',
  })
  const [approvals, setApprovals] = useState<PatentApproval[]>([])
  const [approvalNotes, setApprovalNotes] = useState('')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [dueDate, setDueDate] = useState('')
  const [connected, setConnected] = useState(false)

  const roleTag = session?.user?.role || 'REVIEWER'
  const room = `patent-${patentId}`

  const grouped = useMemo(() => {
    return comments.reduce<Record<string, Comment[]>>((acc, comment) => {
      const key = comment.threadKey || 'general'
      acc[key] = acc[key] ? [...acc[key], comment] : [comment]
      return acc
    }, {})
  }, [comments])

  const fetchWorkspaceData = useCallback(async () => {
    try {
      const [commentsRes, annotationsRes, approvalsRes, priorArtRes, assignmentsRes] = await Promise.all([
        fetch(`/api/patents/${patentId}/comments`),
        fetch(`/api/patents/${patentId}/annotations`),
        fetch(`/api/patents/${patentId}/approvals`),
        fetch(`/api/patents/${patentId}/prior-art`),
        fetch(`/api/patents/${patentId}/assignments`),
      ])

      const [commentsPayload, annotationsPayload, approvalsPayload, priorArtPayload, assignmentsPayload] = await Promise.all([
        commentsRes.json(),
        annotationsRes.json(),
        approvalsRes.json(),
        priorArtRes.json(),
        assignmentsRes.json(),
      ])

      setComments(commentsPayload.comments || [])
      setAnnotations(annotationsPayload.annotations || [])
      setApprovals(approvalsPayload.approvals || [])
      setPriorArt(priorArtPayload.links || [])
      setAssignments(assignmentsPayload.assignments || [])
    } catch (error) {
      console.error(error)
      toast.error('Unable to load collaboration data')
    }
  }, [patentId])

  useEffect(() => {
    fetchWorkspaceData()
  }, [fetchWorkspaceData])

  const handleRealtime = useCallback(
    (event: { type: string; payload?: any }) => {
      if (event.type === 'ready') {
        setConnected(true)
        return
      }

      switch (event.type) {
        case 'comment.created':
          event.payload && setComments((prev) => [event.payload, ...prev])
          break
        case 'annotation.created':
          event.payload && setAnnotations((prev) => [event.payload, ...prev])
          break
        case 'prior-art.created':
          event.payload && setPriorArt((prev) => [event.payload, ...prev])
          break
        case 'approval.updated':
          event.payload &&
            setApprovals((prev) => {
              const filtered = prev.filter((item) => item.id !== event.payload.id)
              return [event.payload, ...filtered]
            })
          break
        case 'assignment.created':
          event.payload && setAssignments((prev) => [event.payload, ...prev])
          break
        default:
          break
      }
    },
    []
  )

  useRealtimeRoom(room, handleRealtime)

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

  const submitAnnotation = async () => {
    try {
      const res = await fetch(`/api/patents/${patentId}/annotations`, {
        method: 'POST',
        body: JSON.stringify({
          ...annotationDraft,
          startOffset: Number(annotationDraft.startOffset),
          endOffset: Number(annotationDraft.endOffset),
          assigneeId: annotationDraft.assigneeId || undefined,
        }),
      })
      if (!res.ok) throw new Error('failed')
      const payload = await res.json()
      setAnnotations((prev) => [payload.annotation, ...prev])
      setAnnotationDraft({ targetLabel: defaultThread || '', startOffset: 0, endOffset: 0, body: '', assigneeId: '' })
      toast.success('Annotation captured')
    } catch (error) {
      console.error(error)
      toast.error('Unable to save annotation')
    }
  }

  const submitPriorArt = async () => {
    try {
      const res = await fetch(`/api/patents/${patentId}/prior-art`, {
        method: 'POST',
        body: JSON.stringify(priorArtDraft),
      })
      if (!res.ok) throw new Error('failed')
      const payload = await res.json()
      setPriorArt((prev) => [payload.link, ...prev])
      setPriorArtDraft({ externalTitle: '', externalUrl: '', reasoning: '' })
      toast.success('Prior art linked')
    } catch (error) {
      console.error(error)
      toast.error('Could not link prior art')
    }
  }

  const updateApproval = async (status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/patents/${patentId}/approvals`, {
        method: 'POST',
        body: JSON.stringify({ status, notes: approvalNotes || undefined }),
      })
      if (!res.ok) throw new Error('failed')
      const payload = await res.json()
      setApprovals((prev) => {
        const filtered = prev.filter((item) => item.id !== payload.approval.id)
        return [payload.approval, ...filtered]
      })
      toast.success('Approval updated')
    } catch (error) {
      console.error(error)
      toast.error('Unable to update approval')
    }
  }

  const createAssignment = async () => {
    if (!session?.user?.id) return toast.error('User missing')
    try {
      const res = await fetch(`/api/patents/${patentId}/assignments`, {
        method: 'POST',
        body: JSON.stringify({ assigneeId: session.user.id, dueDate: dueDate || undefined }),
      })
      if (!res.ok) throw new Error('failed')
      const payload = await res.json()
      setAssignments((prev) => [payload.assignment, ...prev])
      setDueDate('')
      toast.success('Assignment created')
    } catch (error) {
      console.error(error)
      toast.error('Could not create assignment')
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
    <div className="grid gap-4 lg:grid-cols-[280px,1fr,320px]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Room status</CardTitle>
            <CardDescription>Real-time collaboration health.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span>{connected ? 'Connected to collaboration room' : 'Connecting…'}</span>
            </div>
            <p className="text-muted-foreground">Annotations, approvals, and comments broadcast instantly.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>Push into your review queue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              <Button className="w-full" onClick={createAssignment} disabled={!session?.user?.id}>
                Assign to me
              </Button>
            </div>
            <div className="space-y-2">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="rounded border p-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{assignment.assignee.name || assignment.assignee.email}</span>
                    <Badge variant="outline">{assignment.role}</Badge>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="font-semibold">{assignment.status}</span>
                    <span>{assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Tabs defaultValue="comments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="annotations">Annotations</TabsTrigger>
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
                <div className="grid gap-3 md:grid-cols-[1fr,220px] md:items-center">
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

          <TabsContent value="annotations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inline annotations</CardTitle>
                <CardDescription>Capture ranges, status, and routing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Target label</Label>
                    <Input
                      value={annotationDraft.targetLabel}
                      onChange={(event) => setAnnotationDraft((prev) => ({ ...prev, targetLabel: event.target.value }))}
                      placeholder="Claim number or section"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Start offset</Label>
                      <Input
                        type="number"
                        value={annotationDraft.startOffset}
                        onChange={(event) =>
                          setAnnotationDraft((prev) => ({ ...prev, startOffset: Number(event.target.value) }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End offset</Label>
                      <Input
                        type="number"
                        value={annotationDraft.endOffset}
                        onChange={(event) =>
                          setAnnotationDraft((prev) => ({ ...prev, endOffset: Number(event.target.value) }))
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-[1fr,220px] md:items-start">
                  <div className="space-y-2">
                    <Label>Annotation body</Label>
                    <Textarea
                      value={annotationDraft.body}
                      onChange={(event) => setAnnotationDraft((prev) => ({ ...prev, body: event.target.value }))}
                      placeholder="Markdown-supported feedback"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Input
                      value={annotationDraft.assigneeId}
                      onChange={(event) => setAnnotationDraft((prev) => ({ ...prev, assigneeId: event.target.value }))}
                      placeholder="User id (defaults to unassigned)"
                    />
                    <Button onClick={submitAnnotation} disabled={!annotationDraft.body} className="w-full">
                      Save annotation
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {annotations.map((annotation) => (
                    <div key={annotation.id} className="rounded border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{annotation.targetLabel || 'General'}</Badge>
                          <Badge variant="secondary">{annotation.status}</Badge>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {annotation.startOffset}–{annotation.endOffset}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap">{annotation.body}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>By {annotation.author.name || annotation.author.email}</span>
                        {annotation.assignee && <Badge variant="outline">Assigned to {annotation.assignee.name || annotation.assignee.email}</Badge>}
                        <time dateTime={annotation.createdAt}>{new Date(annotation.createdAt).toLocaleString()}</time>
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
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Approval workflow</CardTitle>
            <CardDescription>Status and audit trail.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => updateApproval('PENDING')}>Mark pending</Button>
              <Button variant="outline" onClick={() => updateApproval('APPROVED')}>Approve</Button>
              <Button variant="outline" onClick={() => updateApproval('REJECTED')}>Reject</Button>
            </div>
            <Label>Notes</Label>
            <Textarea value={approvalNotes} onChange={(event) => setApprovalNotes(event.target.value)} placeholder="Decision notes" />
            <div className="space-y-2">
              {approvals.map((approval) => (
                <div key={approval.id} className="rounded border p-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{approval.reviewer.name || approval.reviewer.email}</span>
                    <Badge variant="outline">{approval.status}</Badge>
                  </div>
                  <p className="text-sm">{approval.notes || '—'}</p>
                  <time className="text-xs text-muted-foreground" dateTime={approval.updatedAt}>
                    {new Date(approval.updatedAt).toLocaleString()}
                  </time>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prior art links</CardTitle>
            <CardDescription>Bidirectional context with reasoning.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-2">
              <Label>External title</Label>
              <Input
                value={priorArtDraft.externalTitle}
                onChange={(event) => setPriorArtDraft((prev) => ({ ...prev, externalTitle: event.target.value }))}
                placeholder="Related patent or document"
              />
              <Label>URL</Label>
              <Input
                value={priorArtDraft.externalUrl}
                onChange={(event) => setPriorArtDraft((prev) => ({ ...prev, externalUrl: event.target.value }))}
                placeholder="https://"
              />
              <Label>Reasoning</Label>
              <Textarea
                value={priorArtDraft.reasoning}
                onChange={(event) => setPriorArtDraft((prev) => ({ ...prev, reasoning: event.target.value }))}
                placeholder="Explain why this prior art matters"
              />
              <Button className="w-full" onClick={submitPriorArt} disabled={!priorArtDraft.reasoning}>
                Link prior art
              </Button>
            </div>

            <div className="space-y-2">
              {priorArt.map((link) => (
                <div key={link.id} className="rounded border p-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{link.creator.name || link.creator.email}</span>
                    <time dateTime={link.createdAt}>{new Date(link.createdAt).toLocaleDateString()}</time>
                  </div>
                  <p className="font-medium">{link.externalTitle || link.linkedPatentId || 'Unlabeled link'}</p>
                  {link.externalUrl && (
                    <a className="text-primary text-xs" href={link.externalUrl} target="_blank" rel="noreferrer">
                      {link.externalUrl}
                    </a>
                  )}
                  <p className="text-sm text-muted-foreground">{link.reasoning}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
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
