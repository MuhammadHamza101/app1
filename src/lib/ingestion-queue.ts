import { db } from '@/lib/db'
import { generateInsightsFromText } from '@/lib/offline-analytics'

interface IngestionJob {
  patentId: string
  ingestionId: string
  content?: string
}

const queue: IngestionJob[] = []
let started = false

export function enqueueIngestion(job: IngestionJob) {
  queue.push(job)
  if (!started) {
    started = true
    setInterval(processNext, 750)
  }
}

async function processNext() {
  const job = queue.shift()
  if (!job) return

  const { patentId, ingestionId, content } = job
  try {
    await db.patentIngestion.update({
      where: { id: ingestionId },
      data: { status: 'PROCESSING', updatedAt: new Date() },
    })

    const patent = await db.patent.findUnique({ where: { id: patentId } })
    const text = [patent?.abstract, patent?.claimsText, content]
      .filter(Boolean)
      .join('\n')
      .trim()

    const summaryData = generateInsightsFromText(text)

    await db.patentInsight.create({
      data: {
        patentId,
        summary: summaryData.summary,
        riskScore: summaryData.riskScore,
        highlights: summaryData.highlights,
        tags: 'auto,offline,analysis',
      },
    })

    await db.patentIngestion.update({
      where: { id: ingestionId },
      data: { status: 'COMPLETED', metadata: summaryData.highlights, updatedAt: new Date() },
    })
  } catch (error) {
    console.error('Ingestion job failed', error)
    await db.patentIngestion.update({
      where: { id: ingestionId },
      data: { status: 'FAILED', error: (error as Error).message },
    })
  }
}
