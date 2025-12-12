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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

function parseList(input: string) {
  return input
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

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

type PatentTag = {
  tag: string
}

type PatentRecord = {
  id: string
  title: string
  number?: string | null
  abstract?: string | null
  claimsText?: string | null
  jurisdiction?: string | null
  assignee?: string | null
  technology?: string | null
  keywords?: string | null
  status: string
  updatedAt: string
  ipcClasses?: string | null
  cpcClasses?: string | null
  filingDate?: string | null
  publicationDate?: string | null
  tags?: PatentTag[]
  insights: PatentInsight[]
  ingestions: PatentIngestion[]
}

type Highlight = {
  title?: string
  abstract?: string
  claims?: string
  classifications?: string
}

type PatentSearchResult = {
  patent: PatentRecord
  highlights: Highlight
  lexicalScore: number
  semanticScore: number
  score: number
}

type SearchMeta = {
  total: number
  provider: string
  page: number
  pageSize: number
}

export default function PatentsPage() {
  const [query, setQuery] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [technology, setTechnology] = useState('')
  const [assignee, setAssignee] = useState('')
  const [ipc, setIpc] = useState('')
  const [cpc, setCpc] = useState('')
  const [tags, setTags] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [semantic, setSemantic] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 6

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<PatentSearchResult[]>([])
  const [meta, setMeta] = useState<SearchMeta | null>(null)

  const fetchPatents = useCallback(
    async (
      override?: Partial<{
        query: string
        jurisdiction: string
        technology: string
        assignee: string
        ipc: string
        cpc: string
        tags: string
        fromDate: string
        toDate: string
        semantic: boolean
        page: number
      }>
    ) => {
      setLoading(true)
      setError(null)

      const effectiveQuery = override?.query ?? query
      const effectiveJurisdiction = override?.jurisdiction ?? jurisdiction
      const effectiveTechnology = override?.technology ?? technology
      const effectiveAssignee = override?.assignee ?? assignee
      const effectiveIpc = override?.ipc ?? ipc
      const effectiveCpc = override?.cpc ?? cpc
      const effectiveTags = override?.tags ?? tags
      const effectiveFrom = override?.fromDate ?? fromDate
      const effectiveTo = override?.toDate ?? toDate
      const effectiveSemantic = override?.semantic ?? semantic
      const effectivePage = override?.page ?? page

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: effectiveQuery,
          jurisdictions: parseList(effectiveJurisdiction),
          technology: effectiveTechnology || undefined,
          assignee: effectiveAssignee || undefined,
          ipc: parseList(effectiveIpc),
          cpc: parseList(effectiveCpc),
          tags: parseList(effectiveTags),
          startDate: effectiveFrom || undefined,
          endDate: effectiveTo || undefined,
          semantic: effectiveSemantic,
          page: effectivePage,
          pageSize,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data?.error || 'Failed to load patents')
      }

      const data = (await response.json()) as {
        results: PatentSearchResult[]
        provider: string
        total: number
        page: number
        pageSize: number
      }

      setResults(data.results)
      setMeta({ total: data.total, provider: data.provider, page: data.page, pageSize: data.pageSize })
      setPage(data.page)
      setLoading(false)
    },
    [assignee, cpc, fromDate, ipc, jurisdiction, page, query, semantic, tags, technology, toDate]
  )

  useEffect(() => {
    fetchPatents().catch((err) => {
      console.error(err)
      setError((err as Error).message)
      setLoading(false)
    })
  }, [fetchPatents])

  useEffect(() => {
    fetchPatents({ semantic, page: 1 }).catch((err) => {
      console.error(err)
      setError((err as Error).message)
      setLoading(false)
    })
    setPage(1)
  }, [fetchPatents, semantic])

  const activeFilters = useMemo(
    () =>
      [
        jurisdiction && `Jurisdiction: ${jurisdiction}`,
        technology && `Tech: ${technology}`,
        assignee && `Assignee: ${assignee}`,
        ipc && `IPC: ${ipc}`,
        cpc && `CPC: ${cpc}`,
        tags && `Tags: ${tags}`,
        (fromDate || toDate) && `Filed ${fromDate || 'start'} → ${toDate || 'now'}`,
      ].filter(Boolean) as string[],
    [assignee, cpc, fromDate, ipc, jurisdiction, tags, technology, toDate]
  )

  const totalPages = useMemo(() => {
    if (!meta) return 1
    return Math.max(1, Math.ceil(meta.total / (meta.pageSize || pageSize)))
  }, [meta])

  const riskTone = (score?: number | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (typeof score !== 'number') return 'outline'
    if (score >= 70) return 'destructive'
    if (score >= 40) return 'secondary'
    return 'default'
  }

  const handleSearch = () => {
    setPage(1)
    fetchPatents({ page: 1 }).catch((err) => setError((err as Error).message))
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
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((value) => (
                <Badge key={value} variant="outline">
                  {value}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch id="semantic" checked={semantic} onCheckedChange={(checked) => setSemantic(checked)} />
            <Label htmlFor="semantic">Semantic search</Label>
          </div>
          <Button asChild>
            <Link href="/patents/upload">Ingest a patent</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Search and filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2 space-y-1">
            <Label htmlFor="search">Keyword or semantic query</Label>
            <Textarea
              id="search"
              placeholder="Title, abstract, claims, or description"
              value={query}
              rows={3}
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
          <div className="space-y-1">
            <Label htmlFor="assignee">Assignee</Label>
            <Input
              id="assignee"
              placeholder="Client or filer"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ipc">IPC classes</Label>
            <Input id="ipc" placeholder="H04W, G06F" value={ipc} onChange={(e) => setIpc(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cpc">CPC classes</Label>
            <Input id="cpc" placeholder="H04W72/00" value={cpc} onChange={(e) => setCpc(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tags">Upload tags</Label>
            <Input
              id="tags"
              placeholder="seed, pdf, auto"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="from">Filed from</Label>
              <Input id="from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
          <div className="md:col-span-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setQuery('')
                setJurisdiction('')
                setTechnology('')
                setAssignee('')
                setIpc('')
                setCpc('')
                setTags('')
                setFromDate('')
                setToDate('')
                setPage(1)
                fetchPatents({
                  query: '',
                  jurisdiction: '',
                  technology: '',
                  assignee: '',
                  ipc: '',
                  cpc: '',
                  tags: '',
                  fromDate: '',
                  toDate: '',
                  page: 1,
                }).catch(() => {})
              }}
            >
              Reset
            </Button>
            <Button onClick={handleSearch}>Search</Button>
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
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            No patents found. Try adjusting filters or ingesting a record.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {meta && (
              <>
                <Badge variant="outline">Provider: {meta.provider}</Badge>
                <Badge variant="outline">Total: {meta.total}</Badge>
                <Badge variant="outline">Page {page} / {totalPages}</Badge>
              </>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((result) => {
              const patent = result.patent
              const latestInsight = patent.insights[0]
              const latestIngestion = patent.ingestions[0]

              return (
                <Card key={patent.id} className="h-full">
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-xl">
                          <span dangerouslySetInnerHTML={{ __html: result.highlights.title || patent.title }} />
                        </CardTitle>
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
                    {patent.abstract && (
                      <div
                        className="text-sm text-muted-foreground line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: result.highlights.abstract || patent.abstract }}
                      />
                    )}
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
                              <Badge key={tag} variant="outline">
                                {tag.trim()}
                              </Badge>
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
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">Score {(result.score * 100).toFixed(1)}</Badge>
                      <span>
                        Lexical {(result.lexicalScore * 100).toFixed(1)} • Semantic {(result.semanticScore * 100).toFixed(1)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {patent.ipcClasses && <Badge variant="outline">IPC {patent.ipcClasses}</Badge>}
                      {patent.cpcClasses && <Badge variant="outline">CPC {patent.cpcClasses}</Badge>}
                      {patent.filingDate && <Badge variant="outline">Filed {patent.filingDate}</Badge>}
                      {patent.publicationDate && <Badge variant="outline">Published {patent.publicationDate}</Badge>}
                      {patent.tags?.map((tag) => (
                        <Badge key={tag.tag} variant="outline">
                          {tag.tag}
                        </Badge>
                      ))}
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
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4 text-sm">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Semantic {semantic ? 'on' : 'off'}</Badge>
              <Badge variant="outline">Showing {results.length} of {meta?.total ?? 0}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  const nextPage = Math.max(1, page - 1)
                  setPage(nextPage)
                  fetchPatents({ page: nextPage }).catch(() => {})
                }}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => {
                  const nextPage = Math.min(totalPages, page + 1)
                  setPage(nextPage)
                  fetchPatents({ page: nextPage }).catch(() => {})
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
