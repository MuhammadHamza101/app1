import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  template: z.enum(['executive', 'novelty', 'risk']),
  format: z.enum(['pdf', 'word']).default('pdf'),
})

function buildReportBody(template: 'executive' | 'novelty' | 'risk', patent: any) {
  const base = `Title: ${patent.title}\nApplication: ${patent.applicationNumber ?? 'n/a'}\nPublication: ${patent.publicationNumber ?? 'n/a'}\nAssignee: ${patent.assignee ?? 'n/a'}\nIPC/CPC: ${patent.ipcClasses ?? 'n/a'} | ${patent.cpcClasses ?? 'n/a'}\nJurisdiction: ${patent.jurisdiction ?? 'n/a'}\n\n`

  if (template === 'novelty') {
    return `${base}Novelty focus:\n- Highlight distinguishing claim features.\n- Track prior art searches against similar IPC/CPC codes.\n- Summary: ${patent.abstract ?? 'No abstract available.'}`
  }
  if (template === 'risk') {
    return `${base}Risk profile:\n- Enforcement venue: ${patent.jurisdiction ?? 'Unknown'}\n- Filing timeline: ${patent.filingDate ?? 'n/a'} to ${patent.publicationDate ?? 'n/a'}\n- Observations: add litigation posture and design-around paths.`
  }
  return `${base}Executive summary:\n- High-level summary: ${patent.abstract ?? 'No abstract available.'}\n- Claims captured: ${(patent.claimsText || '').slice(0, 300)}...\n- Recommended actions: circulation for attorney and reviewer sign-off.`
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const patent = await db.patent.findUnique({ where: { id: params.id } })
  if (!patent) {
    return NextResponse.json({ error: 'Patent not found' }, { status: 404 })
  }

  const body = await request.json()
  const { template, format } = schema.parse(body)

  const content = buildReportBody(template, patent)
  const filename = `${template}-report-${patent.id}.${format === 'pdf' ? 'pdf' : 'docx'}`
  const headers = new Headers({
    'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': `attachment; filename="${filename}"`,
  })

  return new NextResponse(content, { status: 200, headers })
}
