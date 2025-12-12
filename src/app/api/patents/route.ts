import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { enqueueIngestion } from '@/lib/ingestion-queue'
import { indexPatentForSearch } from '@/services/search'

const createSchema = z.object({
  title: z.string().min(3),
  number: z.string().optional(),
  applicationNumber: z.string().optional(),
  publicationNumber: z.string().optional(),
  abstract: z.string().optional(),
  claimsText: z.string().optional(),
  content: z.string().optional(),
  jurisdiction: z.string().optional(),
  assignee: z.string().optional(),
  language: z.string().optional(),
  technology: z.string().optional(),
  keywords: z.string().optional(),
  ipcClasses: z.string().optional(),
  cpcClasses: z.string().optional(),
  sourceFile: z.string().optional(),
  sourceType: z
    .enum(['PDF', 'DOCX', 'JSON', 'USPTO', 'EPO', 'WIPO', 'MANUAL_ENTRY'])
    .default('MANUAL_ENTRY'),
  status: z.enum(['DRAFT', 'READY', 'IN_REVIEW', 'FLAGGED', 'COMPLETE']).default('DRAFT'),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const payload = createSchema.parse(body)

    const patent = await db.patent.create({
      data: {
        ...payload,
        createdBy: session.user.id,
        ingestions: {
          create: {
            sourceType: payload.sourceType,
            status: 'PENDING',
            notes: 'Captured via workspace intake; queued for offline parsing.',
          },
        },
        insights: {
          create: {
            summary: 'Baseline insight: queued for offline semantic scoring.',
            riskScore: payload.status === 'FLAGGED' ? 70 : payload.status === 'IN_REVIEW' ? 50 : 30,
            highlights: {
              jurisdiction: payload.jurisdiction,
              technology: payload.technology,
              keywords: payload.keywords,
            },
            tags: 'workspace,intake,queued',
          },
        },
        tags: payload.keywords
          ? {
              create: payload.keywords
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean)
                .map((tag) => ({ tag, source: 'manual' })),
            }
          : undefined,
      },
      include: {
        ingestions: true,
        insights: true,
        tags: true,
      },
    })

    if (patent.ingestions[0]) {
      enqueueIngestion({
        patentId: patent.id,
        ingestionId: patent.ingestions[0].id,
        content: `${payload.abstract || ''}\n${payload.claimsText || ''}`,
      })
    }

    await indexPatentForSearch(patent.id)

    return NextResponse.json({ patent })
  } catch (error) {
    console.error('Failed to create patent', error)
    return NextResponse.json({ error: 'Failed to create patent' }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || undefined
    const jurisdiction = searchParams.get('jurisdiction') || undefined
    const technology = searchParams.get('technology') || undefined
    const take = Math.min(parseInt(searchParams.get('take') || '20', 10), 50)

    const patents = await db.patent.findMany({
      where: {
        ...(session.user.role !== 'ADMIN' ? { createdBy: session.user.id } : {}),
        ...(jurisdiction ? { jurisdiction: { equals: jurisdiction, mode: 'insensitive' } } : {}),
        ...(technology ? { technology: { contains: technology, mode: 'insensitive' } } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { abstract: { contains: q, mode: 'insensitive' } },
                { keywords: { contains: q, mode: 'insensitive' } },
                { assignee: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        insights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        ingestions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take,
    })

    return NextResponse.json({ patents })
  } catch (error) {
    console.error('Failed to fetch patents', error)
    return NextResponse.json({ error: 'Failed to fetch patents' }, { status: 500 })
  }
}
