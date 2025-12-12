'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface JobRow {
  id: string
  status: string
  files: Array<{ name: string; size?: number }>
  totalSize?: number
  createdAt: string
  updatedAt: string
  result?: {
    patentsCreated: number
    filesProcessed: number
    errors?: string[]
  }
  progress?: { percent?: number; processed?: number; total?: number; currentFile?: string }
}

function formatBytes(bytes?: number) {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

export default function UploadQueuePage() {
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const response = await fetch('/api/patents/ingestion?list=true')
    if (!response.ok) return
    const data = await response.json()
    setJobs(data.jobs || [])
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 4000)
    return () => clearInterval(timer)
  }, [])

  const handleAction = async (jobId: string, action: 'retry' | 'cancel') => {
    await fetch('/api/patents/ingestion', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, action }),
    })
    refresh()
  }

  const badges = useMemo(
    () => ({
      QUEUED: 'secondary',
      PROCESSING: 'default',
      COMPLETED: 'success',
      FAILED: 'destructive',
      CANCELLED: 'outline',
    }),
    []
  ) as Record<string, any>

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Upload queue</h1>
          <p className="text-muted-foreground">
            Monitor queued patent ingestion jobs, view extracted metadata, and retry or cancel as needed.
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Job {job.id.slice(0, 8)}</CardTitle>
                <CardDescription>
                  {job.files?.length || 0} file(s) • {formatBytes(job.totalSize)} • Updated{' '}
                  {new Date(job.updatedAt).toLocaleTimeString()}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={badges[job.status] || 'secondary'}>{job.status}</Badge>
                {job.result?.errors?.length ? (
                  <Badge variant="destructive">Errors</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {job.progress?.percent !== undefined ? (
                <Progress value={job.progress.percent} />
              ) : (
                <Progress value={job.status === 'COMPLETED' ? 100 : 10} />
              )}

              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {job.files?.map((file) => (
                  <Badge key={file.name} variant="outline">
                    {file.name} • {formatBytes(file.size)}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                  Created: {new Date(job.createdAt).toLocaleString()} • Updated{' '}
                  {new Date(job.updatedAt).toLocaleString()}
                </span>
                {job.result ? (
                  <span>
                    Parsed {job.result.filesProcessed} file(s); {job.result.patentsCreated} patent(s) created
                  </span>
                ) : null}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(job.id, 'retry')}
                  disabled={job.status === 'PROCESSING' || job.status === 'QUEUED'}
                >
                  Retry
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction(job.id, 'cancel')}
                  disabled={job.status === 'COMPLETED' || job.status === 'CANCELLED'}
                >
                  Cancel
                </Button>
              </div>

              {job.result?.errors?.length ? (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {job.result.errors.join('; ')}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}

        {!jobs.length && !loading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No ingestion jobs yet. Upload a PDF, DOCX, or ZIP to see live status.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
