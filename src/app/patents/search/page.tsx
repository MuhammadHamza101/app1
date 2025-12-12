'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

interface SearchHighlight {
  title?: string
  abstract?: string
  claims?: string
  classifications?: string
}

interface PatentSearchResult {
  patent: {
    id: string
    title: string
    abstract: string | null
    claimsText?: string | null
    ipcClasses?: string | null
    cpcClasses?: string | null
    assignee?: string | null
    filingDate?: string | null
    publicationDate?: string | null
  }
  highlights: SearchHighlight
  lexicalScore: number
  semanticScore: number
  score: number
}

interface SearchResponse {
  results: PatentSearchResult[]
  total: number
  provider: string
  schema: { fields: { name: string; description: string }[] }
  page: number
  pageSize: number
}

function parseList(input: string) {
  return input
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export default function PatentSearchPage() {
  const [query, setQuery] = useState('Novel wireless charging coil')
  const [ipc, setIpc] = useState('')
  const [cpc, setCpc] = useState('')
  const [assignee, setAssignee] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [results, setResults] = useState<PatentSearchResult[]>([])
  const [meta, setMeta] = useState<{ total: number; provider: string; page: number; pageSize: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtersSummary = useMemo(() => {
    const chips: string[] = []
    if (ipc) chips.push(`IPC: ${ipc}`)
    if (cpc) chips.push(`CPC: ${cpc}`)
    if (assignee) chips.push(`Assignee: ${assignee}`)
    if (fromDate || toDate) chips.push(`Dates: ${fromDate || 'start'} → ${toDate || 'now'}`)
    return chips
  }, [ipc, cpc, assignee, fromDate, toDate])

  const handleSearch = async (event?: React.FormEvent) => {
    event?.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          ipc: parseList(ipc),
          cpc: parseList(cpc),
          assignee,
          startDate: fromDate || undefined,
          endDate: toDate || undefined,
        }),
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || 'Search failed')
      }

      const body = (await response.json()) as SearchResponse
      setResults(body.results)
      setMeta({
        total: body.total,
        provider: body.provider,
        page: body.page,
        pageSize: body.pageSize,
      })
    } catch (searchError) {
      setError((searchError as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    handleSearch()
  }, [])

  return (
    <div className="container mx-auto max-w-6xl py-10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Patent semantic search</h1>
          <p className="text-muted-foreground max-w-3xl">
            Hybrid relevance combines Meilisearch-style lexical scoring with OpenAI embedding similarity. Filter by IPC/CPC,
            assignee, and filing dates to zero in on the right authority.
          </p>
          {meta && (
            <div className="text-sm text-muted-foreground space-x-2">
              <Badge variant="secondary">Engine: {meta.provider}</Badge>
              <Badge variant="outline">Results: {meta.total}</Badge>
            </div>
          )}
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" /> Index schema defined
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search patents</CardTitle>
          <CardDescription>Enter a semantic query and optional filters.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-4">
              <div className="lg:col-span-2 space-y-2">
                <Label htmlFor="query">Query</Label>
                <Textarea
                  id="query"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  rows={3}
                  placeholder="e.g., antenna array with adaptive beamforming"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipc">IPC codes</Label>
                <Input
                  id="ipc"
                  value={ipc}
                  onChange={(event) => setIpc(event.target.value)}
                  placeholder="H04W, G06F..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpc">CPC codes</Label>
                <Input
                  id="cpc"
                  value={cpc}
                  onChange={(event) => setCpc(event.target.value)}
                  placeholder="H04W72/00, H01Q1/28"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Input
                  id="assignee"
                  value={assignee}
                  onChange={(event) => setAssignee(event.target.value)}
                  placeholder="Apple, Siemens, ..."
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="from">From</Label>
                  <Input id="from" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to">To</Label>
                  <Input id="to" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {filtersSummary.length ? (
                  filtersSummary.map((chip) => (
                    <Badge key={chip} variant="outline">
                      {chip}
                    </Badge>
                  ))
                ) : (
                  <span>No filters applied</span>
                )}
              </div>
              <Button type="submit" disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </form>

          {error && <p className="text-destructive text-sm mt-3">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>Semantic and lexical ranking blended for better recall.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!results.length && !loading && <p className="text-muted-foreground">No results yet. Try refining your query.</p>}
          <div className="space-y-4">
            {results.map((result) => (
              <div key={result.patent.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Link
                      href={`/patents/${result.patent.id}?q=${encodeURIComponent(query)}`}
                      className="text-lg font-semibold hover:underline"
                    >
                      <span dangerouslySetInnerHTML={{ __html: result.highlights.title || result.patent.title }} />
                    </Link>
                    <div
                      className="text-sm text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: result.highlights.abstract || 'No abstract' }}
                    />
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant="secondary">Score {(result.score * 100).toFixed(1)}</Badge>
                    <div className="text-xs text-muted-foreground">
                      Lexical {(result.lexicalScore * 100).toFixed(1)} · Semantic {(
                        result.semanticScore * 100
                      ).toFixed(1)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {result.patent.assignee && <Badge variant="outline">{result.patent.assignee}</Badge>}
                  {result.patent.ipcClasses && <Badge variant="secondary">IPC {result.patent.ipcClasses}</Badge>}
                  {result.patent.cpcClasses && <Badge variant="secondary">CPC {result.patent.cpcClasses}</Badge>}
                  {result.highlights.classifications && (
                    <Badge variant="outline" dangerouslySetInnerHTML={{ __html: result.highlights.classifications }} />
                  )}
                  {result.patent.filingDate && <Badge variant="outline">Filed {result.patent.filingDate}</Badge>}
                </div>

                {result.highlights.claims && (
                  <div
                    className="text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: result.highlights.claims }}
                  />
                )}

                <Separator />
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>Source</span>
                  <Badge variant="outline">{result.patent.id}</Badge>
                  <span className="text-[10px]">Hybrid ranking</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
