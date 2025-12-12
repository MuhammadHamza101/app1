import 'dotenv/config'

import { loadCachedAnalytics, refreshAnalyticsWarehouse } from '@/services/analytics/warehouse'

async function main() {
  const snapshot = await refreshAnalyticsWarehouse({})
  await loadCachedAnalytics({})
  console.log('Analytics warehouse refreshed with', snapshot.trends.length, 'trend rows')
}

main().catch((error) => {
  console.error('Failed to refresh analytics warehouse', error)
  process.exit(1)
})
