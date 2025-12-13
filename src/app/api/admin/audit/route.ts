import { NextRequest, NextResponse } from 'next/server'
import { readAuditEvents, auditEvent, extractClientIp } from '@/lib/audit'
import { getDemoSession } from '@/lib/demo-session'

export async function GET(request: NextRequest) {
  const session = getDemoSession()

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || undefined
  const action = searchParams.get('action') || undefined
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined
  const limit = Number(searchParams.get('limit') || '200')

  const events = await readAuditEvents({ userId, action, from, to, limit })

  await auditEvent({
    type: 'audit.read',
    userId: session.user.id,
    outcome: 'success',
    ip: extractClientIp(request.headers),
    metadata: { filters: { userId, action, from, to, limit } },
  })

  return NextResponse.json({ events })
}
