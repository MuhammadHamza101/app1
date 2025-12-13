import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastToRoom } from '@/lib/realtime'
import { z } from 'zod'
import { getDemoSession } from '@/lib/demo-session'

const createSchema = z.object({
  content: z.string().min(2),
  threadKey: z.string().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getDemoSession()

  const comments = await db.patentComment.findMany({
    where: { patentId: params.id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ comments })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getDemoSession()

  const body = await request.json()
  const { content, threadKey } = createSchema.parse(body)

  const patent = await db.patent.findUnique({ where: { id: params.id } })
  if (!patent) {
    return NextResponse.json({ error: 'Patent not found' }, { status: 404 })
  }

  const comment = await db.patentComment.create({
    data: {
      patentId: params.id,
      userId: session.user.id,
      role: (session.user.role as any) || 'REVIEWER',
      threadKey,
      content,
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  })

  broadcastToRoom(`patent-${params.id}`, 'comment.created', comment)
  return NextResponse.json({ comment })
}
