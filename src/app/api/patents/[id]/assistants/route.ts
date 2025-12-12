import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { AssistantMode, runAssistant } from '@/services/ai/assistant'
import { z } from 'zod'

const schema = z.object({
  mode: z.enum(['summary', 'novelty', 'risk']),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const patent = await db.patent.findUnique({ where: { id: params.id } })
  if (!patent) {
    return NextResponse.json({ error: 'Patent not found' }, { status: 404 })
  }

  const body = await request.json()
  const { mode } = schema.parse(body)

  const result = await runAssistant(mode as AssistantMode, patent, session.user as any)

  return NextResponse.json(result)
}
