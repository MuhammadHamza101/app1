import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { HybridSearchService } from '@/services/search'

const searchSchema = z.object({
  query: z.string().default(''),
  ipc: z.array(z.string()).optional(),
  cpc: z.array(z.string()).optional(),
  jurisdictions: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  assignee: z.string().optional(),
  technology: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().min(1).max(50).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
  semantic: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const payload = searchSchema.parse(body)
    const service = new HybridSearchService()

    const response = await service.search(
      payload.query,
      {
        ipc: payload.ipc,
        cpc: payload.cpc,
        assignee: payload.assignee,
        technology: payload.technology,
        jurisdictions: payload.jurisdictions,
        tags: payload.tags,
        startDate: payload.startDate,
        endDate: payload.endDate,
        createdBy: session.user.role === 'ADMIN' ? undefined : session.user.id,
      },
      payload.page,
      payload.pageSize,
      { semantic: payload.semantic }
    )

    return NextResponse.json(response)
  } catch (error) {
    console.error('Hybrid search failed', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const service = new HybridSearchService()

  const response = await service.search(
    q,
    {
      ipc: searchParams.getAll('ipc'),
      cpc: searchParams.getAll('cpc'),
      assignee: searchParams.get('assignee') || undefined,
      jurisdictions: searchParams.getAll('jurisdiction'),
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      createdBy: session.user.role === 'ADMIN' ? undefined : session.user.id,
    },
    Number(searchParams.get('page') || '1'),
    Number(searchParams.get('pageSize') || '10'),
    { semantic: searchParams.get('semantic') !== 'false' }
  )

  return NextResponse.json(response)
}
