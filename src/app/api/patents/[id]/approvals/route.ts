import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { broadcastToRoom } from '@/lib/realtime'

const updateSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  notes: z.string().optional(),
})

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const approvals = await db.patentApproval.findMany({
    where: { patentId: params.id },
    include: { reviewer: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ approvals })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['ADMIN', 'ATTORNEY', 'REVIEWER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Insufficient role' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateSchema.parse(body)

  const approval = await db.patentApproval.upsert({
    where: { patentId_reviewerId: { patentId: params.id, reviewerId: session.user.id } },
    update: { status: parsed.status, notes: parsed.notes },
    create: {
      patentId: params.id,
      reviewerId: session.user.id,
      status: parsed.status,
      notes: parsed.notes,
    },
    include: { reviewer: { select: { id: true, name: true, email: true, role: true } } },
  })

  broadcastToRoom(`patent-${params.id}`, 'approval.updated', approval)
  return NextResponse.json({ approval })
}
