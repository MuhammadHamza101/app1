import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

function scorePatent(query: string, text: string) {
  const normalizedQ = query.toLowerCase().split(/\s+/)
  const haystack = text.toLowerCase()
  return normalizedQ.reduce((score, term) => (haystack.includes(term) ? score + 1 : score), 0)
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  if (!q) {
    return NextResponse.json({ results: [] })
  }

  const patents = await db.patent.findMany({
    where: session.user.role === 'ADMIN' ? {} : { createdBy: session.user.id },
    include: { insights: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })

  const ranked = patents
    .map((patent) => {
      const text = `${patent.title} ${patent.abstract || ''} ${patent.claimsText || ''} ${patent.technology || ''} ${patent.assignee || ''}`
      return { patent, score: scorePatent(q, text) }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25)

  return NextResponse.json({
    query: q,
    count: ranked.length,
    results: ranked.map(({ patent, score }) => ({ patent, score })),
  })
}
