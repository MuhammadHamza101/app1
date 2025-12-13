import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { broadcastToRoom } from '@/lib/realtime'
import { getDemoSession } from '@/lib/demo-session'

const createSchema = z.object({
  targetLabel: z.string().optional(),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  body: z.string().min(2),
  assigneeId: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'RESOLVED']).optional(),
})

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = getDemoSession()

  const annotations = await db.annotation.findMany({
    where: { patentId: params.id },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
      assignee: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ annotations })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getDemoSession()

  const body = await request.json()
  const parsed = createSchema.parse(body)

  const annotation = await db.annotation.create({
    data: {
      patentId: params.id,
      createdBy: session.user.id,
      assigneeId: parsed.assigneeId,
      targetLabel: parsed.targetLabel,
      startOffset: parsed.startOffset,
      endOffset: parsed.endOffset,
      body: parsed.body,
      status: parsed.status || 'PENDING',
    },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
      assignee: { select: { id: true, name: true, email: true, role: true } },
    },
  })

  broadcastToRoom(`patent-${params.id}`, 'annotation.created', annotation)
  return NextResponse.json({ annotation })
}
