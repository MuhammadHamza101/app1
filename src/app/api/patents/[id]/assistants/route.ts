import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AssistantMode, runAssistant } from '@/services/ai/assistant'
import { z } from 'zod'
import { getDemoSession } from '@/lib/demo-session'

const schema = z.object({
  mode: z.enum(['summary', 'novelty', 'risk']),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = getDemoSession()

  const patent = await db.patent.findUnique({ where: { id: params.id } })
  if (!patent) {
    return NextResponse.json({ error: 'Patent not found' }, { status: 404 })
  }

  const body = await request.json()
  const { mode } = schema.parse(body)

  const result = await runAssistant(mode as AssistantMode, patent, session.user as any)

  return NextResponse.json(result)
}
