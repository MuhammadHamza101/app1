'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface UploadJobStatus {
  jobId: string
  state: string
  progress: number
  summary?: string
  result?: {
    patentsCreated: number
    filesProcessed: number
    languages: Record<string, number>
    errors: string[]
  }
  failedReason?: string | null
}

const SUPPORTED_TYPES = ['application/pdf', 'application/zip', 'text/csv']

export default function PatentUploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [jobStatus, setJobStatus] = useState<UploadJobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFiles = useCallback((incoming: FileList | File[]) => {
    setFiles((previous) => [...previous, ...Array.from(incoming)])
    setError(null)
  }, [])

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (event.dataTransfer.files?.length) {
      handleFiles(event.dataTransfer.files)
    }
  }, [handleFiles])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const clearAll = useCallback(() => {
    setFiles([])
    setJobStatus(null)
    setError(null)
  }, [])

  const submit = useCallback(async () => {
    if (!files.length) {
      setError('Please add at least one PDF, ZIP, or CSV file to ingest.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setJobStatus(null)

    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

    try {
      const response = await fetch('/api/patents/ingestion', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || 'Unable to queue ingestion job')
      }

      const body = await response.json()
      setJobStatus({
        jobId: body.jobId,
        state: 'queued',
        progress: 0,
      })
    } catch (uploadError) {
      setError((uploadError as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }, [files])

  useEffect(() => {
    if (!jobStatus?.jobId) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/patents/ingestion?jobId=${jobStatus.jobId}`)
        if (!response.ok) return
        const status = await response.json()
        const progressValue = typeof status.progress === 'number'
          ? status.progress
          : status.progress?.percent ?? 0

        const finished = ['completed', 'failed'].includes(status.state?.toLowerCase?.())
        setJobStatus({
          jobId: status.id,
          state: status.state,
          progress: progressValue,
          result: status.result,
          failedReason: status.failedReason,
        })

        if (finished) {
          clearInterval(interval)
        }
      } catch (pollError) {
        console.error('Failed to poll ingestion job', pollError)
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [jobStatus?.jobId])

  const progressValue = jobStatus?.progress ?? 0

  const statusBadge = useMemo(() => {
    if (!jobStatus) return null
    const normalized = jobStatus.state?.toLowerCase?.() || 'queued'
    const variant = normalized === 'failed' ? 'destructive' : normalized === 'completed' ? 'default' : 'secondary'
    const label = normalized.charAt(0).toUpperCase() + normalized.slice(1)
    return <Badge variant={variant}>{label}</Badge>
  }, [jobStatus])

  return (
    <div className="container mx-auto max-w-5xl py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Patent ingestion</h1>
        <p className="text-muted-foreground">
          Upload PDF, ZIP, or CSV files and process them in the background. We automatically extract text, detect language, and normalize the content into the patent datastore.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload files</CardTitle>
          <CardDescription>Drag and drop or browse for supported files.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed transition',
              isDragging ? 'border-primary bg-primary/5' : 'border-muted'
            )}
          >
            <input
              id="file-input"
              type="file"
              multiple
              className="hidden"
              accept={SUPPORTED_TYPES.join(',')}
              onChange={(event) => event.target.files && handleFiles(event.target.files)}
            />
            <Label htmlFor="file-input" className="text-center text-sm text-muted-foreground">
              Drop files here or <span className="text-primary">browse</span>
              <div className="mt-1 text-xs">Accepted: PDF, ZIP, CSV</div>
            </Label>
          </div>

          {!!files.length && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Selected files ({files.length})</p>
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  Clear all
                </Button>
              </div>
              <div className="grid gap-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-md border bg-card px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || 'Unknown type'}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Upload error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Background processing is powered by BullMQ + Redis. You can safely navigate away while ingestion runs.
            </div>
            <Button onClick={submit} disabled={isSubmitting}>
              {isSubmitting ? 'Queuing…' : 'Start ingestion'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {jobStatus && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Ingestion status</CardTitle>
                <CardDescription>Job ID: {jobStatus.jobId}</CardDescription>
              </div>
              {statusBadge}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{progressValue}%</span>
              </div>
              <Progress value={progressValue} />
            </div>

            {jobStatus.result && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-md border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Files processed</p>
                  <p className="text-lg font-semibold">{jobStatus.result.filesProcessed}</p>
                </div>
                <div className="rounded-md border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Patents created</p>
                  <p className="text-lg font-semibold">{jobStatus.result.patentsCreated}</p>
                </div>
                <div className="rounded-md border bg-card p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Languages detected</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(jobStatus.result.languages || {}).map(([language, count]) => (
                      <Badge key={language} variant="secondary">
                        {language} · {count}
                      </Badge>
                    ))}
                    {!Object.keys(jobStatus.result.languages || {}).length && (
                      <span className="text-xs text-muted-foreground">None detected</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!!jobStatus?.result?.errors?.length && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Warnings</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {jobStatus.result.errors.map((warning: string, index: number) => (
                    <div key={`${warning}-${index}`} className="rounded-md bg-muted px-3 py-2">
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {jobStatus.failedReason && (
              <Alert variant="destructive">
                <AlertTitle>Ingestion failed</AlertTitle>
                <AlertDescription>{jobStatus.failedReason}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
