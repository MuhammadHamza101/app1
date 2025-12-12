'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const defaultStatusMessage = 'Provide a few details and we will ingest the patent for analysis.'

export default function PatentUploadPage() {
  const router = useRouter()
  const [status, setStatus] = useState<string>(defaultStatusMessage)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    number: '',
    abstract: '',
    claimsText: '',
    jurisdiction: 'US',
    assignee: 'PatentFlow Labs',
    technology: '',
    keywords: '',
    sourceType: 'MANUAL_ENTRY',
    status: 'IN_REVIEW',
  })

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setStatus('Submitting patent and creating ingestion record...')

    try {
      const response = await fetch('/api/patents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data?.error || 'Failed to create patent')
      }

      setStatus('✅ Patent ingested. Redirecting to portfolio...')
      router.push('/patents')
    } catch (error) {
      console.error(error)
      setStatus('❌ ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Ingest a patent</h1>
        <p className="text-muted-foreground">
          Seed the workspace with a real application or upload a draft. We capture ingestion metadata and
          automatically attach baseline insights.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Core details</CardTitle>
            <CardDescription>Title, identifiers, and ownership</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                required
                placeholder="System and method for..."
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Application / Publication No.</Label>
              <Input
                id="number"
                placeholder="US2024xxxx"
                value={form.number}
                onChange={(e) => handleChange('number', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <Input
                id="jurisdiction"
                value={form.jurisdiction}
                onChange={(e) => handleChange('jurisdiction', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee / Client</Label>
              <Input
                id="assignee"
                value={form.assignee}
                onChange={(e) => handleChange('assignee', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Technical context</CardTitle>
            <CardDescription>Abstract, claims, tech domain, and keywords</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="abstract">Abstract</Label>
              <Textarea
                id="abstract"
                value={form.abstract}
                onChange={(e) => handleChange('abstract', e.target.value)}
                placeholder="Summarize the invention in a few sentences."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="claimsText">Claims (optional)</Label>
              <Textarea
                id="claimsText"
                value={form.claimsText}
                onChange={(e) => handleChange('claimsText', e.target.value)}
                placeholder="Paste representative claims for downstream analysis."
                rows={4}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="technology">Technology domain</Label>
                <Input
                  id="technology"
                  placeholder="AI, biotech, fintech..."
                  value={form.technology}
                  onChange={(e) => handleChange('technology', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords</Label>
                <Input
                  id="keywords"
                  placeholder="vector search; embeddings; prior art"
                  value={form.keywords}
                  onChange={(e) => handleChange('keywords', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Workflow status</Label>
                <Select value={form.status} onValueChange={(value) => handleChange('status', value)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="READY">Ready</SelectItem>
                    <SelectItem value="IN_REVIEW">In review</SelectItem>
                    <SelectItem value="FLAGGED">Flagged</SelectItem>
                    <SelectItem value="COMPLETE">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingestion metadata</CardTitle>
            <CardDescription>Track how the record entered the workspace</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sourceType">Source type</Label>
              <Select value={form.sourceType} onValueChange={(value) => handleChange('sourceType', value)}>
                <SelectTrigger id="sourceType">
                  <SelectValue placeholder="Choose a source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL_ENTRY">Manual entry</SelectItem>
                  <SelectItem value="PDF">PDF upload</SelectItem>
                  <SelectItem value="DOCX">DOCX upload</SelectItem>
                  <SelectItem value="USPTO">USPTO</SelectItem>
                  <SelectItem value="EPO">EPO</SelectItem>
                  <SelectItem value="WIPO">WIPO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Quick status</Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">AI-ready</Badge>
                <Badge variant="outline">Checks: similarity, conflicts, deadlines</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">{status}</p>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Working...' : 'Ingest patent'}
          </Button>
        </div>
      </form>
    </div>
  )
}
