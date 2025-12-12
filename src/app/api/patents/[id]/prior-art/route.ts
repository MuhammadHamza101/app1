import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { broadcastToRoom } from '@/lib/realtime'

const createSchema = z.object({
  linkedPatentId: z.string().optional(),
  externalTitle: z.string().optional(),
  externalUrl: z.string().url().optional(),
  reasoning: z.string().min(3),
})

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const links = await db.priorArtLink.findMany({
    where: { patentId: params.id },
    include: { creator: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ links })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createSchema.parse(body)

  const link = await db.priorArtLink.create({
    data: {
      patentId: params.id,
      createdBy: session.user.id,
      linkedPatentId: parsed.linkedPatentId,
      externalTitle: parsed.externalTitle,
      externalUrl: parsed.externalUrl,
      reasoning: parsed.reasoning,
    },
    include: { creator: { select: { id: true, name: true, email: true, role: true } } },
  })

  broadcastToRoom(`patent-${params.id}`, 'prior-art.created', link)
  return NextResponse.json({ link })
}
