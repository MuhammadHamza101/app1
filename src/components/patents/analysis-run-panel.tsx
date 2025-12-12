'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ClaimTree, ClaimNode } from './claim-tree'

interface AnalysisOutputs {
  patentSummary?: string
  claims?: Array<{ claimNumber: string; text: string; summary: string; novelty: string; risk?: { score?: number; rationale?: string } }>
}

interface RunRecord {
  id: string
  status: string
  outputs?: AnalysisOutputs
  steps?: Array<{ stage: string; status: string; detail?: string }>
  provider?: string
  modelName?: string
  completedAt?: string
}

function buildClaimNodes(claimsText?: string | null): ClaimNode[] {
  if (!claimsText) return []
  const entries = claimsText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\.?\s*(.*)$/)
      if (match) return { number: match[1], text: match[2] || line }
      return null
    })
    .filter(Boolean) as Array<{ number: string; text: string }>

  const nodes: Record<string, ClaimNode> = {}
  entries.forEach((entry) => {
    nodes[entry.number] = { number: entry.number, text: entry.text, children: [] }
  })
  entries.forEach((entry) => {
    const dependency = entry.text.match(/claim\s+(\d+)/i)?.[1]
    if (dependency && nodes[dependency]) {
      nodes[entry.number].parent = dependency
      nodes[dependency].children.push(nodes[entry.number])
    }
  })
  return Object.values(nodes).filter((node) => !node.parent)
}

export function AnalysisRunPanel({ patentId, claimsText }: { patentId: string; claimsText?: string | null }) {
  const [run, setRun] = useState<RunRecord | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const claimNodes = useMemo(() => buildClaimNodes(claimsText), [claimsText])

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/analysis-runs?patentId=${patentId}`)
      const data = await res.json()
      setRun(data.runs?.[0] || null)
    }
    load()
  }, [patentId])

  useEffect(() => {
    if (!run?.id) return
    const eventSource = new EventSource(`/api/analysis-runs/${run.id}/events`)
    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data)
      if (payload?.status) {
        setRun((current) => ({ ...(current || run), ...payload }))
        if (payload.status === 'COMPLETED') {
          setIsRunning(false)
        }
      }
    }
    return () => eventSource.close()
  }, [run?.id])

  const startRun = async () => {
    setIsRunning(true)
    const response = await fetch('/api/analysis-runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patentId, type: 'FULL_PIPELINE' }),
    })
    const data = await response.json()
    setRun(data.run)
  }

  const downloadReport = async (format: 'pdf' | 'docx') => {
    if (!run?.id) return
    const res = await fetch(`/api/analysis-runs/${run.id}/report?format=${format}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analysis-${run.id}.${format}`
    link.click()
    URL.revokeObjectURL(url)
  }

  const progress = run?.steps?.length ? Math.min(100, (run.steps.length / 10) * 100) : 10

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>AI-assisted claim review</CardTitle>
          <CardDescription>Summaries, novelty cues, and risk scoring with per-claim coverage.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button onClick={startRun} disabled={isRunning} size="sm">
            {isRunning ? 'Running…' : 'Start analysis'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadReport('pdf')} disabled={!run}>
            Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadReport('docx')} disabled={!run}>
            Download Word
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {run ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{run.status}</Badge>
              {run.modelName && <span>{run.modelName}</span>}
              {run.provider && <span>via {run.provider}</span>}
            </div>
            <Progress value={progress} />
            {run.outputs?.patentSummary && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <div className="font-semibold">Patent summary</div>
                <p className="text-muted-foreground whitespace-pre-wrap">{run.outputs.patentSummary}</p>
              </div>
            )}
            {run.outputs?.claims?.map((claim) => (
              <div key={claim.claimNumber} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="font-semibold">Claim {claim.claimNumber}</div>
                  {claim.risk?.score && <Badge variant="secondary">Risk {claim.risk.score}/5</Badge>}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{claim.summary}</p>
                <p className="text-sm">Novelty cues: {claim.novelty}</p>
                {claim.risk?.rationale && <p className="text-xs text-muted-foreground">{claim.risk.rationale}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No analysis runs yet. Kick off an AI review to populate insights.</p>
        )}

        <Separator />
        <div className="space-y-2">
          <div className="font-semibold">Claim structure</div>
          <ClaimTree claims={claimNodes} />
        </div>
      </CardContent>
    </Card>
  )
}
