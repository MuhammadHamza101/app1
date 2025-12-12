import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { createAlertRule } from '@/services/analytics/alerts'
import { deliverScheduledReport } from '@/services/analytics/reporting'
import { computeAnalyticsSnapshot, loadCachedAnalytics } from '@/services/analytics/warehouse'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const search = request.nextUrl.searchParams
  const filters = {
    firmId: search.get('firmId') || undefined,
    client: search.get('client') || undefined,
    domain: search.get('domain') || undefined,
    startDate: search.get('startDate') || undefined,
    endDate: search.get('endDate') || undefined,
  }

  const snapshot = await loadCachedAnalytics(filters)
  return NextResponse.json(snapshot)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  if (body.type === 'report') {
    const recipients: string[] = body.recipients || []
    const subject = body.subject || 'Scheduled analytics report'
    const snapshot = await computeAnalyticsSnapshot(body.filters || {})

    await db.scheduledReport.create({
      data: {
        name: subject,
        cadence: body.cadence || 'weekly',
        recipients: recipients.join(','),
        filters: body.filters || {},
        createdBy: session.user.id,
      },
    })

    await deliverScheduledReport(snapshot, recipients, subject)
    return NextResponse.json({ status: 'queued', subject })
  }

  if (body.type === 'alert-rule') {
    const rule = await createAlertRule({
      name: body.name,
      description: body.description,
      threshold: body.threshold,
      eventType: body.eventType,
      patentId: body.patentId,
      channel: body.channel,
      userId: session.user.id,
    })

    return NextResponse.json(rule)
  }

  return NextResponse.json({ error: 'Unsupported request' }, { status: 400 })
}
