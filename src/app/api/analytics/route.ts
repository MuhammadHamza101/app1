import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const patents = await db.patent.findMany({
    where: session.user.role === 'ADMIN' ? {} : { createdBy: session.user.id },
  })

  const totals = {
    totalPatents: patents.length,
    flagged: patents.filter((p) => p.status === 'FLAGGED').length,
    inReview: patents.filter((p) => p.status === 'IN_REVIEW').length,
    complete: patents.filter((p) => p.status === 'COMPLETE').length,
  }

  const byTech: Record<string, number> = {}
  patents.forEach((p) => {
    if (!p.technology) return
    byTech[p.technology] = (byTech[p.technology] || 0) + 1
  })

  return NextResponse.json({ totals, byTech })
}
