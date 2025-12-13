import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { broadcastToRoom } from '@/lib/realtime'
import { getDemoSession } from '@/lib/demo-session'

const createSchema = z.object({
  assigneeId: z.string(),
  role: z.enum(['REVIEWER', 'APPROVER', 'COLLABORATOR']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']).optional(),
  dueDate: z.string().optional(),
})

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = getDemoSession()

  const assignments = await db.patentAssignment.findMany({
    where: { patentId: params.id },
    include: { assignee: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ assignments })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getDemoSession()

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
