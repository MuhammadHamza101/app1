import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AnalysisOrchestrator } from '@/services/ai/analysis-orchestrator'
import { getDemoSession } from '@/lib/demo-session'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const patentId = searchParams.get('patentId') || undefined
  const runs = await db.analysisRun.findMany({
    where: patentId ? { patentId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ runs })
}

export async function POST(request: Request) {
  const session = getDemoSession()
  const userId = session.user?.id
  const body = await request.json()
  const { patentId, type = 'FULL_PIPELINE', provider } = body || {}

  if (!patentId) {
    return NextResponse.json({ error: 'patentId is required' }, { status: 400 })
  }

  const patent = await db.patent.findUnique({ where: { id: patentId } })
  if (!patent) {
    return NextResponse.json({ error: 'Patent not found' }, { status: 404 })
  }

  const orchestrator = new AnalysisOrchestrator()
  const run = await orchestrator.start(type, patent, userId, provider)

  return NextResponse.json({ run })
}
