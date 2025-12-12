import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const assignments = await db.patentAssignment.findMany({
    where: { assigneeId: session.user.id },
    include: {
      patent: { select: { id: true, title: true, applicationNumber: true, publicationNumber: true, status: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ assignments })
}
