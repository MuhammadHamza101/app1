import 'dotenv/config'
import { addMinutes } from 'date-fns'

import { db } from '@/lib/db'
import { loadCachedAnalytics, refreshAnalyticsWarehouse } from '@/services/analytics/warehouse'
import { deliverScheduledReport } from '@/services/analytics/reporting'
import { evaluateAlertRules } from '@/services/analytics/alerts'

async function main() {
  const now = new Date()
  const dueReports = await db.scheduledReport.findMany({
    where: {
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
    },
  })

  for (const report of dueReports) {
    const snapshot = await refreshAnalyticsWarehouse(report.filters as any)
    await deliverScheduledReport(snapshot, report.recipients.split(',').map((r) => r.trim()), report.name)

    await db.scheduledReport.update({
      where: { id: report.id },
      data: { lastRunAt: now, nextRunAt: addMinutes(now, 60 * 24) },
    })
  }

  await evaluateAlertRules()
  await loadCachedAnalytics({})

  console.log(`Processed ${dueReports.length} scheduled reports and evaluated alert rules.`)
}

main().catch((error) => {
  console.error('Scheduled reporting failed', error)
  process.exit(1)
})
