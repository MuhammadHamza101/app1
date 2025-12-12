'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

type PatentInsight = {
  summary: string
  riskScore?: number | null
  tags?: string | null
}

type PatentIngestion = {
  sourceType: string
  status: string
  createdAt: string
}

type PatentRecord = {
  id: string
  title: string
  number?: string | null
  abstract?: string | null
  jurisdiction?: string | null
  assignee?: string | null
  technology?: string | null
  keywords?: string | null
  status: string
  updatedAt: string
  insights: PatentInsight[]
  ingestions: PatentIngestion[]
}

export default function PatentsPage() {
  const [query, setQuery] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [technology, setTechnology] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patents, setPatents] = useState<PatentRecord[]>([])

  const fetchPatents = useCallback(
    async (
      override?: Partial<{
        query: string
        jurisdiction: string
        technology: string
      }>
    ) => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    const effectiveQuery = override?.query ?? query
    const effectiveJurisdiction = override?.jurisdiction ?? jurisdiction
    const effectiveTechnology = override?.technology ?? technology

    if (effectiveQuery) params.set('q', effectiveQuery)
    if (effectiveJurisdiction) params.set('jurisdiction', effectiveJurisdiction)
    if (effectiveTechnology) params.set('technology', effectiveTechnology)

    const response = await fetch(`/api/patents?${params.toString()}`)

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data?.error || 'Failed to load patents')
    }

    const data = await response.json()
    setPatents(data?.patents || [])
    setLoading(false)
    },
    [jurisdiction, query, technology]
  )

  useEffect(() => {
    fetchPatents().catch((err) => {
      console.error(err)
      setError((err as Error).message)
      setLoading(false)
    })
  }, [fetchPatents])

  const activeFilters = useMemo(() => [jurisdiction, technology].filter(Boolean), [jurisdiction, technology])

  const riskTone = (score?: number | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (typeof score !== 'number') return 'outline'
    if (score >= 70) return 'destructive'
    if (score >= 40) return 'secondary'
    return 'default'
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Patent workspace</h1>
          <p className="text-muted-foreground">
            Centralize ingested applications, validate coverage, and triage risk before filing.
          </p>
          {activeFilters.length > 0 && (
            <div className="flex gap-2">
              {activeFilters.map((value) => (
                <Badge key={value} variant="outline">{value}</Badge>
              ))}
            </div>
          )}
        </div>
        <Button asChild>
          <Link href="/patents/upload">Ingest a patent</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Search and filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2 space-y-1">
            <Label htmlFor="search">Keyword search</Label>
            <Input
              id="search"
              placeholder="Title, abstract, keywords, assignee"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="jurisdiction">Jurisdiction</Label>
            <Input
              id="jurisdiction"
              placeholder="US, EP, WO"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="technology">Tech domain</Label>
            <Input
              id="technology"
              placeholder="AI, biotech, fintech"
              value={technology}
              onChange={(e) => setTechnology(e.target.value)}
            />
          </div>
          <div className="md:col-span-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setQuery('')
                setJurisdiction('')
                setTechnology('')
                fetchPatents({ query: '', jurisdiction: '', technology: '' }).catch(() => {})
              }}
            >
              Reset
            </Button>
            <Button
              onClick={() =>
                fetchPatents({ query, jurisdiction, technology }).catch((err) =>
                  setError((err as Error).message)
                )
              }
            >
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map((item) => (
            <Card key={item}>
              <CardContent className="space-y-3 p-4">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : patents.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            No patents found. Try adjusting filters or ingesting a record.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {patents.map((patent) => {
            const latestInsight = patent.insights[0]
            const latestIngestion = patent.ingestions[0]

            return (
              <Card key={patent.id} className="h-full">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-xl">{patent.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{patent.number || 'Unnumbered draft'}</p>
                    </div>
                    <Badge>{patent.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {patent.jurisdiction && <Badge variant="outline">{patent.jurisdiction}</Badge>}
                    {patent.assignee && <Badge variant="secondary">{patent.assignee}</Badge>}
                    {patent.technology && <Badge variant="outline">{patent.technology}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {patent.abstract && <p className="text-sm text-muted-foreground line-clamp-3">{patent.abstract}</p>}
                  {latestInsight && (
                    <div className="space-y-1 rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Insight</p>
                        <Badge variant={riskTone(latestInsight.riskScore)}>
                          Risk {latestInsight.riskScore ?? 'n/a'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{latestInsight.summary}</p>
                      {latestInsight.tags && (
                        <div className="flex flex-wrap gap-2">
                          {latestInsight.tags.split(',').map((tag) => (
                            <Badge key={tag} variant="outline">{tag.trim()}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {latestIngestion && (
                    <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                      Ingestion: {latestIngestion.sourceType} • {latestIngestion.status} •{' '}
                      {new Date(latestIngestion.createdAt).toLocaleDateString()}
                    </div>
                  )}
                  <Separator />
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {patent.keywords?.split(',').map((keyword) => (
                      <Badge key={keyword} variant="outline">
                        {keyword.trim()}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
