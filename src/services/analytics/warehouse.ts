import { addMonths, differenceInCalendarDays, eachMonthOfInterval, endOfMonth, format, startOfDay, startOfMonth } from 'date-fns'
import { Prisma } from '@prisma/client'

import { db } from '@/lib/db'

export type AnalyticsFilters = {
  firmId?: string
  client?: string
  domain?: string
  startDate?: string
  endDate?: string
}

export type AnalyticsSnapshot = {
  filingsByJurisdiction: { jurisdiction: string; filings: number }[]
  allowance: { allowedFilings: number; totalFilings: number; allowanceRate: number }
  pendency: { averageDays: number; medianDays: number; sampleSize: number }
  maintenanceSchedules: {
    patentId: string
    title: string
    jurisdiction: string
    assignee: string | null
    dueDates: { label: string; date: string; isOverdue: boolean; daysUntilDue: number }[]
  }[]
  trends: { month: string; filings: number; allowances: number; allowanceRate: number }[]
  slaMetrics: {
    averageTurnaround: number
    medianTurnaround: number
    onTimeRate: number
  }
}

function toWhere(filters: AnalyticsFilters): Prisma.PatentWhereInput {
  const clauses: Prisma.PatentWhereInput = {}

  if (filters.firmId) clauses.firmId = filters.firmId
  if (filters.client) clauses.assignee = { contains: filters.client, mode: 'insensitive' }
  if (filters.domain) {
    clauses.OR = [
      { ipcClasses: { contains: filters.domain, mode: 'insensitive' } },
      { cpcClasses: { contains: filters.domain, mode: 'insensitive' } },
      { technology: { contains: filters.domain, mode: 'insensitive' } },
    ]
  }

  if (filters.startDate || filters.endDate) {
    clauses.filingDate = {}
    if (filters.startDate) clauses.filingDate.gte = new Date(filters.startDate)
    if (filters.endDate) clauses.filingDate.lte = endOfMonth(new Date(filters.endDate))
  }

  return clauses
}

function median(values: number[]) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2
  return sorted[mid]
}

export async function computeAnalyticsSnapshot(filters: AnalyticsFilters): Promise<AnalyticsSnapshot> {
  const patents = await db.patent.findMany({
    where: toWhere(filters),
    orderBy: { filingDate: 'asc' },
  })

  const filingsByJurisdiction = patents.reduce<Record<string, number>>((acc, patent) => {
    if (!patent.jurisdiction) return acc
    acc[patent.jurisdiction] = (acc[patent.jurisdiction] || 0) + 1
    return acc
  }, {})

  const allowanceCandidates = patents.filter((patent) => patent.status === 'COMPLETE' || patent.status === 'COMPLETED')
  const allowedFilings = allowanceCandidates.length
  const totalFilings = patents.length
  const allowanceRate = totalFilings === 0 ? 0 : (allowedFilings / totalFilings) * 100

  const pendencyDurations = patents
    .filter((patent) => patent.filingDate && patent.publicationDate)
    .map((patent) => differenceInCalendarDays(patent.publicationDate as Date, patent.filingDate as Date))

  const pendency = {
    averageDays: pendencyDurations.length
      ? Math.round(pendencyDurations.reduce((sum, days) => sum + days, 0) / pendencyDurations.length)
      : 0,
    medianDays: Math.round(median(pendencyDurations)),
    sampleSize: pendencyDurations.length,
  }

  const maintenanceSchedules = patents.map((patent) => {
    const filingDate = patent.filingDate || patent.createdAt
    const labels = [
      { label: '3.5-year fee', years: 3.5 },
      { label: '7.5-year fee', years: 7.5 },
      { label: '11.5-year fee', years: 11.5 },
    ]

    const dueDates = labels.map((checkpoint) => {
      const dueDate = addMonths(filingDate, Math.round(checkpoint.years * 12))
      const daysUntilDue = differenceInCalendarDays(dueDate, startOfDay(new Date()))
      return {
        label: checkpoint.label,
        date: dueDate.toISOString(),
        isOverdue: daysUntilDue < 0,
        daysUntilDue,
      }
    })

    return {
      patentId: patent.id,
      title: patent.title,
      jurisdiction: patent.jurisdiction || 'Unknown',
      assignee: patent.assignee,
      dueDates,
    }
  })

  const twelveMonthsAgo = startOfMonth(addMonths(new Date(), -11))
  const trendMonths = eachMonthOfInterval({ start: twelveMonthsAgo, end: new Date() })

  const trends = trendMonths.map((month) => {
    const monthKey = format(month, 'yyyy-MM')
    const monthPatents = patents.filter((patent) => {
      const filed = patent.filingDate || patent.createdAt
      const monthStart = startOfMonth(filed)
      return monthStart.getFullYear() === month.getFullYear() && monthStart.getMonth() === month.getMonth()
    })

    const monthAllowances = monthPatents.filter((patent) => patent.status === 'COMPLETE' || patent.status === 'COMPLETED')
    const allowanceRateForMonth = monthPatents.length === 0 ? 0 : (monthAllowances.length / monthPatents.length) * 100

    return {
      month: monthKey,
      filings: monthPatents.length,
      allowances: monthAllowances.length,
      allowanceRate: allowanceRateForMonth,
    }
  })

  const assignments = await db.patentAssignment.findMany({ where: { status: 'DONE' } })
  const turnaroundDurations = assignments.map((assignment) =>
    differenceInCalendarDays((assignment.updatedAt as Date) || new Date(), assignment.createdAt)
  )
  const slaMetrics = {
    averageTurnaround: turnaroundDurations.length
      ? Math.round(turnaroundDurations.reduce((sum, days) => sum + days, 0) / turnaroundDurations.length)
      : 0,
    medianTurnaround: Math.round(median(turnaroundDurations)),
    onTimeRate:
      assignments.length === 0
        ? 0
        : (assignments.filter((assignment) => assignment.dueDate && assignment.updatedAt <= assignment.dueDate).length /
            assignments.length) *
          100,
  }

  return {
    filingsByJurisdiction: Object.entries(filingsByJurisdiction).map(([jurisdiction, filings]) => ({
      jurisdiction,
      filings,
    })),
    allowance: { allowedFilings, totalFilings, allowanceRate: Number(allowanceRate.toFixed(1)) },
    pendency,
    maintenanceSchedules,
    trends,
    slaMetrics,
  }
}

export async function refreshAnalyticsWarehouse(filters: AnalyticsFilters = {}) {
  const snapshot = await computeAnalyticsSnapshot(filters)
  const bucketDate = startOfMonth(new Date())

  await db.$transaction([
    db.analyticsSummary.deleteMany({ where: { bucketDate } }),
    db.reviewSlaSnapshot.deleteMany({ where: { bucketDate } }),
    db.analyticsSummary.createMany({
      data: snapshot.trends.map((trend) => ({
        bucketDate,
        jurisdiction: 'portfolio',
        team: filters.firmId,
        ipcClass: filters.domain,
        filings: trend.filings,
        allowances: trend.allowances,
        allowanceRate: trend.allowanceRate,
        averagePendency: snapshot.pendency.averageDays,
      })),
    }),
    db.reviewSlaSnapshot.create({
      data: {
        bucketDate,
        jurisdiction: 'portfolio',
        averageTurnaround: snapshot.slaMetrics.averageTurnaround,
        medianTurnaround: snapshot.slaMetrics.medianTurnaround,
        onTimeCount: Math.round((snapshot.slaMetrics.onTimeRate / 100) * (snapshot.trends[0]?.filings || 0)),
        totalReviewed: snapshot.trends[0]?.filings || 0,
      },
    }),
  ])

  return snapshot
}

export async function loadCachedAnalytics(filters: AnalyticsFilters = {}) {
  const hasFilters = Boolean(filters.client || filters.domain || filters.endDate || filters.firmId || filters.startDate)
  if (hasFilters) {
    return computeAnalyticsSnapshot(filters)
  }

  const bucketDate = startOfMonth(new Date())
  const cache = await db.analyticsSummary.findMany({ where: { bucketDate } })

  if (cache.length === 0) {
    return refreshAnalyticsWarehouse(filters)
  }

  const trends = cache.map((row) => ({
    month: format(bucketDate, 'yyyy-MM'),
    filings: row.filings,
    allowances: row.allowances,
    allowanceRate: row.allowanceRate,
  }))

  const slaSnapshot = await db.reviewSlaSnapshot.findFirst({ where: { bucketDate } })

  return {
    filingsByJurisdiction: cache.map((row) => ({ jurisdiction: row.jurisdiction || 'portfolio', filings: row.filings })),
    allowance: {
      allowedFilings: cache.reduce((sum, row) => sum + row.allowances, 0),
      totalFilings: cache.reduce((sum, row) => sum + row.filings, 0),
      allowanceRate:
        cache.reduce((sum, row) => sum + row.allowanceRate, 0) / Math.max(cache.length, 1),
    },
    pendency: {
      averageDays: cache[0]?.averagePendency || 0,
      medianDays: cache[0]?.averagePendency || 0,
      sampleSize: cache.reduce((sum, row) => sum + row.filings, 0),
    },
    maintenanceSchedules: [],
    trends,
    slaMetrics: {
      averageTurnaround: slaSnapshot?.averageTurnaround || 0,
      medianTurnaround: slaSnapshot?.medianTurnaround || 0,
      onTimeRate:
        slaSnapshot && slaSnapshot.totalReviewed
          ? (slaSnapshot.onTimeCount / slaSnapshot.totalReviewed) * 100
          : 0,
    },
  }
}
