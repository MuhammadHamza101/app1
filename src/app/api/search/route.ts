import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { HybridSearchService } from '@/services/search'

const searchService = new HybridSearchService()

function parseCsvList(value: string | string[] | undefined | null) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      query,
      ipc,
      cpc,
      assignee,
      startDate,
      endDate,
      page = 1,
      pageSize = 10,
    } = body

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const filters = {
      ipc: parseCsvList(ipc),
      cpc: parseCsvList(cpc),
      assignee: assignee || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }

    const results = await searchService.search(query, filters, Number(page), Number(pageSize))
    return NextResponse.json(results)
  } catch (error) {
    console.error('Search API error', error)
    return NextResponse.json({ error: 'Failed to run search' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || searchParams.get('query')

  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        query,
        ipc: searchParams.get('ipc'),
        cpc: searchParams.get('cpc'),
        assignee: searchParams.get('assignee'),
        startDate: searchParams.get('startDate') || searchParams.get('from'),
        endDate: searchParams.get('endDate') || searchParams.get('to'),
        page: searchParams.get('page') || 1,
        pageSize: searchParams.get('pageSize') || 10,
      }),
    })
  )
}
