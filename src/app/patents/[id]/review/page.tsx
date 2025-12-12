import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ClaimTree, ClaimNode } from '@/components/patents/claim-tree'
import { ReviewWorkspace } from '@/components/patents/review-workspace'
import { db } from '@/lib/db'

function parseClaims(claimsText?: string | null): ClaimNode[] {
  if (!claimsText) return []
  const entries = claimsText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\.?\s*(.*)$/)
      if (match) {
        return { number: match[1], text: match[2] || line }
      }
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

function buildPriorArtLinks(patent: any) {
  const q = encodeURIComponent(patent.title || patent.applicationNumber || patent.publicationNumber || '')
  const links = [
    { label: 'Google Patents', href: `https://patents.google.com/?q=${q}` },
    { label: 'Espacenet', href: `https://worldwide.espacenet.com/patent/search?q=${q}` },
  ]

  if (patent.publicationNumber) {
    links.push({
      label: 'USPTO Publication',
      href: `https://ppubs.uspto.gov/pubwebapp/external.html?q=${encodeURIComponent(patent.publicationNumber)}`,
    })
  }
  if (patent.ipcClasses) {
    links.push({
      label: `IPC ${patent.ipcClasses}`,
      href: `https://patents.google.com/?q=${encodeURIComponent(patent.ipcClasses)}`,
    })
  }
  if (patent.cpcClasses) {
    links.push({
      label: `CPC ${patent.cpcClasses}`,
      href: `https://patentscope.wipo.int/search/en/search.jsf?query=${encodeURIComponent(patent.cpcClasses)}`,
    })
  }

  return links
}

export default async function PatentReviewPage({ params }: { params: { id: string } }) {
  const patent = await db.patent.findUnique({ where: { id: params.id } })
  if (!patent) return notFound()

  const claims = parseClaims(patent.claimsText)
  const priorArtLinks = buildPriorArtLinks(patent)

  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm uppercase text-muted-foreground">Patent review</p>
          <h1 className="text-3xl font-bold leading-tight">{patent.title}</h1>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground items-center">
            <Badge variant="outline">Application {patent.applicationNumber || '—'}</Badge>
            <Badge variant="outline">Publication {patent.publicationNumber || '—'}</Badge>
            {patent.ipcClasses && <Badge variant="secondary">IPC {patent.ipcClasses}</Badge>}
            {patent.cpcClasses && <Badge variant="secondary">CPC {patent.cpcClasses}</Badge>}
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground space-y-1">
          <div>Assignee: {patent.assignee || '—'}</div>
          <div>Jurisdiction: {patent.jurisdiction || '—'}</div>
          <Link href={`/patents/${patent.id}`} className="text-primary underline">
            Back to record
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Abstract</CardTitle>
          <CardDescription>High-level description for reviewers.</CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <p>{patent.abstract || 'No abstract available.'}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
        <div className="space-y-4">
          <ClaimTree claims={claims} />
          <Card>
            <CardHeader>
              <CardTitle>Prior art links</CardTitle>
              <CardDescription>Jump into external search tools with this patent’s context.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {priorArtLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                  target="_blank"
                >
                  {link.label}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claim text</CardTitle>
              <CardDescription>Full claim body used for assistant prompts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-6">
                {patent.claimsText || 'No claims available.'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Context metadata</CardTitle>
              <CardDescription>Use these anchors in comment threads.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Filing date</p>
                <p>{patent.filingDate?.toLocaleDateString() || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Publication date</p>
                <p>{patent.publicationDate?.toLocaleDateString() || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Language</p>
                <p>{patent.language || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Source file</p>
                <p>{patent.sourceFile || '—'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />
      <ReviewWorkspace patentId={patent.id} defaultThread={claims[0]?.number} />
    </div>
  )
}
