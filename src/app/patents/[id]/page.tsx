import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { db } from '@/lib/db'

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function highlightText(text: string | null, query?: string | null) {
  if (!text) return '—'
  if (!query) return escapeHtml(text)
  const tokens = query
    .toLowerCase()
    .split(/[,\s]+/)
    .map((token) => token.trim())
    .filter(Boolean)
  if (!tokens.length) return escapeHtml(text)
  const escaped = escapeHtml(text)
  const pattern = new RegExp(`(${tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  return escaped.replace(pattern, '<mark>$1</mark>')
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date)
}

export default async function PatentDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { q?: string }
}) {
  const patent = await db.patent.findUnique({ where: { id: params.id } })
  if (!patent) return notFound()

  const query = searchParams?.q || ''
  const classificationBadges = [patent.ipcClasses, patent.cpcClasses].filter(Boolean)

  return (
    <div className="container mx-auto max-w-5xl py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold" dangerouslySetInnerHTML={{ __html: highlightText(patent.title, query) }} />
        <p className="text-muted-foreground">Detailed patent record with highlighted matches.</p>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground items-center">
          <Badge variant="outline">Application {patent.applicationNumber || '—'}</Badge>
          <Badge variant="outline">Publication {patent.publicationNumber || '—'}</Badge>
          {classificationBadges.map((code) => (
            <Badge key={code} variant="secondary">
              {code}
            </Badge>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
          <CardDescription>Assignee, jurisdiction, and timeline</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline">Assignee: {patent.assignee || '—'}</Badge>
            <Badge variant="outline">Jurisdiction: {patent.jurisdiction || '—'}</Badge>
            <Badge variant="outline">Language: {patent.language || '—'}</Badge>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="secondary">Filed {formatDate(patent.filingDate)}</Badge>
            <Badge variant="secondary">Published {formatDate(patent.publicationDate)}</Badge>
            <Badge variant="outline">Uploaded from {patent.sourceFile || '—'}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Abstract</CardTitle>
          <CardDescription>Semantic matches highlighted</CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: highlightText(patent.abstract, query) }} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Claims</CardTitle>
          <CardDescription>Flattened claim set used in hybrid ranking</CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: highlightText(patent.claimsText, query) }} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content preview</CardTitle>
          <CardDescription>Full-text excerpt with highlights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: highlightText(patent.content, query) }} />
          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground">
            Hybrid search ranks by lexical and embedding similarity across title, abstract, claims, and classifications. Use the
            search page filters to refine IPC/CPC or assignee context.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
