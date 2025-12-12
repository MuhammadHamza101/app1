import { NextResponse } from 'next/server'
import { addMonths, differenceInDays, format, subMonths } from 'date-fns'
import { Prisma } from '@prisma/client'

import { db } from '@/lib/db'
import { scheduleDeadlineAlert, scheduleReportEmail } from '@/services/notifications/scheduler'

type AnalyticsFilters = {
  firmId?: string | null
  client?: string | null
  domain?: string | null
  startDate?: string | null
  endDate?: string | null
}

function buildWhere(filters: AnalyticsFilters): Prisma.PatentWhereInput {
  const where: Prisma.PatentWhereInput = {}

  if (filters.firmId) {
    where.firmId = filters.firmId
  }

  if (filters.client) {
    where.assignee = { contains: filters.client, mode: 'insensitive' }
  }

  if (filters.domain) {
    where.OR = [
      { cpcClasses: { contains: filters.domain, mode: 'insensitive' } },
      { ipcClasses: { contains: filters.domain, mode: 'insensitive' } },
    ]
  }

  if (filters.startDate || filters.endDate) {
    where.filingDate = {
      gte: filters.startDate ? new Date(filters.startDate) : undefined,
      lte: filters.endDate ? new Date(filters.endDate) : undefined,
    }
  }

  return where
}

function median(values: number[]) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }
  return sorted[middle]
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const filters: AnalyticsFilters = {
    firmId: url.searchParams.get('firmId'),
    client: url.searchParams.get('client'),
    domain: url.searchParams.get('domain'),
    startDate: url.searchParams.get('startDate'),
    endDate: url.searchParams.get('endDate'),
  }

  const where = buildWhere(filters)

  const [jurisdictionGroups, statusGroups, pendencySources, maintenanceSources, trendSources] =
    await Promise.all([
      db.patent.groupBy({
        by: ['jurisdiction'],
        where,
        _count: { _all: true },
      }),
      db.patent.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      db.patent.findMany({
        where: {
          ...where,
          filingDate: { not: null },
          publicationDate: { not: null },
        },
        select: {
          id: true,
          title: true,
          filingDate: true,
          publicationDate: true,
          jurisdiction: true,
          assignee: true,
        },
      }),
      db.patent.findMany({
        where: {
          ...where,
          filingDate: { not: null },
        },
        select: {
          id: true,
          title: true,
          filingDate: true,
          jurisdiction: true,
          assignee: true,
        },
      }),
      db.patent.findMany({
        where,
        select: {
          filingDate: true,
          status: true,
        },
      }),
    ])

  const filingsByJurisdiction = jurisdictionGroups.map((group) => ({
    jurisdiction: group.jurisdiction || 'Unknown',
    filings: group._count._all,
  }))

  const totalFilings = statusGroups.reduce((sum, group) => sum + group._count._all, 0)
  const allowedFilings =
    statusGroups.find((group) => group.status === 'COMPLETED')?._count._all || 0

  const allowanceRate = totalFilings ? Math.round((allowedFilings / totalFilings) * 10000) / 100 : 0

  const pendencyDurations = pendencySources
    .map((patent) => differenceInDays(patent.publicationDate!, patent.filingDate!))
    .filter((days) => Number.isFinite(days) && days >= 0)

  const pendency = {
    averageDays: pendencyDurations.length
      ? Math.round(pendencyDurations.reduce((sum, days) => sum + days, 0) / pendencyDurations.length)
      : 0,
    medianDays: Math.round(median(pendencyDurations)),
    sampleSize: pendencyDurations.length,
  }

  const maintenanceWindows = [
    { label: '3.5-year', months: 42 },
    { label: '7.5-year', months: 90 },
    { label: '11.5-year', months: 138 },
  ] as const

  const now = new Date()

  const maintenanceSchedules = maintenanceSources.map((patent) => ({
    patentId: patent.id,
    title: patent.title,
    jurisdiction: patent.jurisdiction || 'Unknown',
    assignee: patent.assignee,
    dueDates: maintenanceWindows.map((window) => {
      const dueDate = addMonths(patent.filingDate!, window.months)
      return {
        label: window.label,
        date: dueDate,
        isOverdue: dueDate < now,
        daysUntilDue: Math.round(differenceInDays(dueDate, now)),
      }
    }),
  }))

  const trendStart = subMonths(now, 11)
  const trendsMap = new Map<string, { filings: number; allowances: number }>()

  for (let i = 0; i < 12; i += 1) {
    const monthKey = format(addMonths(trendStart, i), 'yyyy-MM')
    trendsMap.set(monthKey, { filings: 0, allowances: 0 })
  }

  trendSources
    .filter((item) => item.filingDate)
    .forEach((item) => {
      const monthKey = format(item.filingDate!, 'yyyy-MM')
      if (!trendsMap.has(monthKey)) return
      const current = trendsMap.get(monthKey)!
      trendsMap.set(monthKey, {
        filings: current.filings + 1,
        allowances: current.allowances + (item.status === 'COMPLETED' ? 1 : 0),
      })
    })

  const trends = Array.from(trendsMap.entries()).map(([month, value]) => ({
    month,
    filings: value.filings,
    allowances: value.allowances,
    allowanceRate: value.filings ? Math.round((value.allowances / value.filings) * 10000) / 100 : 0,
  }))

  return NextResponse.json({
    filingsByJurisdiction,
    allowance: {
      allowedFilings,
      totalFilings,
      allowanceRate,
    },
    pendency,
    maintenanceSchedules,
    trends,
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (body.type === 'report') {
    const { recipients, subject, summary, html, when } = body
    if (!recipients?.length || !subject) {
      return NextResponse.json({ error: 'Recipients and subject are required' }, { status: 400 })
    }

    await scheduleReportEmail(
      {
        recipients,
        subject,
        html: html || `<p>${summary || 'Scheduled analytics report'}</p>`,
        text: summary,
      },
      when ? { delay: Math.max(new Date(when).getTime() - Date.now(), 0) } : undefined
    )

    return NextResponse.json({ status: 'scheduled' })
  }

  if (body.type === 'deadline') {
    const { recipients, dueDate, summary, link } = body
    if (!recipients?.length || !dueDate || !summary) {
      return NextResponse.json({ error: 'Recipients, dueDate, and summary are required' }, { status: 400 })
    }

    await scheduleDeadlineAlert({
      recipients,
      deadline: new Date(dueDate),
      summary,
      link,
    })

    return NextResponse.json({ status: 'scheduled' })
  }

  return NextResponse.json({ error: 'Unsupported operation' }, { status: 400 })
}
