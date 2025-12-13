import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoSession } from '@/lib/demo-session'

export async function GET(_request: NextRequest) {
  const session = getDemoSession()

  const assignments = await db.patentAssignment.findMany({
    where: { assigneeId: session.user.id },
    include: {
      patent: { select: { id: true, title: true, applicationNumber: true, publicationNumber: true, status: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ assignments })
}
