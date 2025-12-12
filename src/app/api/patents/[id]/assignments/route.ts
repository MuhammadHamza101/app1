import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { broadcastToRoom } from '@/lib/realtime'

const createSchema = z.object({
  assigneeId: z.string(),
  role: z.enum(['REVIEWER', 'APPROVER', 'COLLABORATOR']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']).optional(),
  dueDate: z.string().optional(),
})

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const assignments = await db.patentAssignment.findMany({
    where: { patentId: params.id },
    include: { assignee: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ assignments })
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
  const parsed = createSchema.parse(body)

  const assignment = await db.patentAssignment.create({
    data: {
      patentId: params.id,
      assigneeId: parsed.assigneeId,
      role: parsed.role || 'REVIEWER',
      status: parsed.status || 'OPEN',
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
    },
    include: { assignee: { select: { id: true, name: true, email: true, role: true } } },
  })

  broadcastToRoom(`patent-${params.id}`, 'assignment.created', assignment)
  return NextResponse.json({ assignment })
}
