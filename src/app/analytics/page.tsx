'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts'
import { format } from 'date-fns'
import { BarChart3, Building2, Filter, Gauge, Mail, MapPin, Timer, TrendingUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

interface JurisdictionMetric {
  jurisdiction: string
  filings: number
}

interface AllowanceMetric {
  allowedFilings: number
  totalFilings: number
  allowanceRate: number
}

interface PendencyMetric {
  averageDays: number
  medianDays: number
  sampleSize: number
}

interface MaintenanceSchedule {
  patentId: string
  title: string
  jurisdiction: string
  assignee: string | null
  dueDates: {
    label: string
    date: string
    isOverdue: boolean
    daysUntilDue: number
  }[]
}

interface TrendPoint {
  month: string
  filings: number
  allowances: number
  allowanceRate: number
}

interface AnalyticsResponse {
  filingsByJurisdiction: JurisdictionMetric[]
  allowance: AllowanceMetric
  pendency: PendencyMetric
  maintenanceSchedules: MaintenanceSchedule[]
  trends: TrendPoint[]
  slaMetrics: {
    averageTurnaround: number
    medianTurnaround: number
    onTimeRate: number
  }
}

const trendConfig = {
  filings: {
    label: 'Filings',
    color: 'var(--chart-1)',
  },
  allowances: {
    label: 'Allowances',
    color: 'var(--chart-2)',
  },
} as const

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    firmId: '',
    client: '',
    domain: '',
    startDate: '',
    endDate: '',
  })

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })

    try {
      const response = await fetch(`/api/analytics?${params.toString()}`)
      const payload = (await response.json()) as AnalyticsResponse
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const maintenanceDueSoon = useMemo(() => {
    if (!data) return []
    return data.maintenanceSchedules
      .flatMap((schedule) =>
        schedule.dueDates
          .filter((due) => due.daysUntilDue <= 90)
          .map((due) => ({
            ...due,
            title: schedule.title,
            jurisdiction: schedule.jurisdiction,
            assignee: schedule.assignee,
          }))
      )
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
  }, [data])

  const allowanceCardText = useMemo(() => {
    if (!data) return ''
    const { allowedFilings, totalFilings, allowanceRate } = data.allowance
    return `${allowedFilings}/${totalFilings || 1} (${allowanceRate.toFixed(1)}%)`
  }, [data])

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleScheduleReport = async () => {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'report',
          recipients: ['analytics@patentflow.local'],
          subject: 'Weekly analytics report',
          summary: 'Automated delivery of the most recent analytics snapshot.',
          filters,
        }),
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule report')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-6 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Portfolio trends, allowance performance, and maintenance exposure across firms and clients.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleScheduleReport} disabled={isLoading}>
            <Mail className="h-4 w-4 mr-2" /> Schedule weekly report
          </Button>
          <Button onClick={fetchAnalytics} disabled={isLoading}>
            <Filter className="h-4 w-4 mr-2" /> Refresh analytics
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
          <CardDescription>Segment analytics by firm, client, domain, or filing window.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="firm-filter">
              Firm ID
            </label>
            <Input
              id="firm-filter"
              placeholder="cuid for firm"
              value={filters.firmId}
              onChange={(e) => handleFilterChange('firmId', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="client-filter">
              Client / Assignee
            </label>
            <Input
              id="client-filter"
              placeholder="Acme Holdings"
              value={filters.client}
              onChange={(e) => handleFilterChange('client', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="domain-filter">
              Technology domain (IPC/CPC)
            </label>
            <Input
              id="domain-filter"
              placeholder="H04L, G06F"
              value={filters.domain}
              onChange={(e) => handleFilterChange('domain', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="start-filter">
              Filing start
            </label>
            <Input
              id="start-filter"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="end-filter">
              Filing end
            </label>
            <Input
              id="end-filter"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Error loading analytics</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Filings by jurisdiction
            </CardTitle>
            <CardDescription>Where filings are concentrated.</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.filingsByJurisdiction.slice(0, 4).map((item) => (
              <div key={item.jurisdiction} className="flex justify-between py-1 text-sm">
                <span className="text-muted-foreground">{item.jurisdiction}</span>
                <span className="font-medium">{item.filings}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gauge className="h-4 w-4" /> Review throughput
            </CardTitle>
            <CardDescription>SLA and on-time performance.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{data?.slaMetrics.averageTurnaround ?? 0}d</div>
            <p className="text-sm text-muted-foreground">
              Median {data?.slaMetrics.medianTurnaround ?? 0}d · On-time {(data?.slaMetrics.onTimeRate ?? 0).toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Allowance rate
            </CardTitle>
            <CardDescription>Granted vs. filed.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-semibold">{data?.allowance.allowanceRate ?? 0}%</div>
              <p className="text-sm text-muted-foreground">{allowanceCardText}</p>
            </div>
            <Badge variant="secondary">Trend</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Timer className="h-4 w-4" /> Pendency
            </CardTitle>
            <CardDescription>Average days to publication.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{data?.pendency.averageDays ?? 0}d</div>
            <p className="text-sm text-muted-foreground">
              Median {data?.pendency.medianDays ?? 0}d · {data?.pendency.sampleSize ?? 0} cases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Maintenance exposure
            </CardTitle>
            <CardDescription>Upcoming fee windows.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {maintenanceDueSoon.slice(0, 3).map((item) => (
                <div key={`${item.title}-${item.label}`} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium leading-tight">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                  <Badge variant={item.isOverdue ? 'destructive' : 'secondary'}>
                    {item.isOverdue ? 'Overdue' : `${item.daysUntilDue}d`}
                  </Badge>
                </div>
              ))}
              {maintenanceDueSoon.length === 0 && (
                <p className="text-sm text-muted-foreground">No maintenance deadlines in the next 90 days.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <TrendingUp className="h-4 w-4" /> Filing and allowance trends
            </CardTitle>
            <CardDescription>12-month view by month.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="h-[320px]">
              <AreaChart data={data?.trends || []}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickFormatter={(value) => format(new Date(`${value}-01`), 'MMM yy')} />
                <YAxis allowDecimals={false} />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
                <Area dataKey="filings" type="monotone" fill="var(--color-filings)" stroke="var(--color-filings)" />
                <Area
                  dataKey="allowances"
                  type="monotone"
                  fill="var(--color-allowances)"
                  stroke="var(--color-allowances)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Building2 className="h-4 w-4" /> Jurisdiction distribution
            </CardTitle>
            <CardDescription>Relative volume by office.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                filings: { label: 'Filings', color: 'var(--chart-1)' },
              }}
              className="h-[320px]"
            >
              <BarChart data={data?.filingsByJurisdiction || []}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="jurisdiction" />
                <YAxis allowDecimals={false} />
                <Tooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="filings" fill="var(--color-filings)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Timer className="h-4 w-4" /> Maintenance schedule
          </CardTitle>
          <CardDescription>All fee windows calculated from filing date.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data?.maintenanceSchedules || []).map((schedule) => (
            <div key={schedule.patentId} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium leading-tight">{schedule.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {schedule.jurisdiction} · {schedule.assignee || 'Unknown assignee'}
                  </p>
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>Filing-based</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {schedule.dueDates.map((due) => (
                  <div key={due.label} className="border rounded-md p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{due.label}</p>
                      <Badge variant={due.isOverdue ? 'destructive' : 'secondary'}>
                        {due.isOverdue ? 'Overdue' : `${due.daysUntilDue}d`}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{format(new Date(due.date), 'PP')}</p>
                  </div>
                ))}
              </div>
              <Separator />
            </div>
          ))}
          {(data?.maintenanceSchedules?.length || 0) === 0 && (
            <p className="text-sm text-muted-foreground">No maintenance timelines available for the selected filters.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
