import { db } from '@/lib/db'
import { decryptContent } from '@/lib/encryption'

export type AnalysisJob = {
  analysisId: string
  snapshotId: string
  type: string
  config?: Record<string, unknown>
}

type QueuedJob = AnalysisJob & { enqueuedAt: Date }

const jobQueue: QueuedJob[] = []
let processing = false

export function enqueueAnalysisJob(job: AnalysisJob) {
  jobQueue.push({ ...job, enqueuedAt: new Date() })
  void processQueue()
}

async function processQueue() {
  if (processing) return
  processing = true

  while (jobQueue.length > 0) {
    const job = jobQueue.shift()!
    try {
      await processJob(job)
    } catch (error) {
      console.error('Failed to process analysis job', job.analysisId, error)
      await db.analysis.update({
        where: { id: job.analysisId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          results: {
            error: 'Analysis failed to complete',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      })
    }
  }

  processing = false
}

async function processJob(job: QueuedJob) {
  await db.analysis.update({
    where: { id: job.analysisId },
    data: { status: 'RUNNING', startedAt: new Date() },
  })

  const snapshot = await db.documentSnapshot.findUnique({
    where: { id: job.snapshotId },
  })

  if (!snapshot) {
    throw new Error('Snapshot not found for analysis')
  }

  const decryptedContent = decryptContent(snapshot.content)
  const results = generateAnalysisResults(job.type, decryptedContent, job.config)

  await db.analysis.update({
    where: { id: job.analysisId },
    data: {
      status: 'COMPLETED',
      results,
      metrics: results.metrics,
      completedAt: new Date(),
    },
  })
}

function generateAnalysisResults(type: string, content: string, config?: Record<string, unknown>) {
  const paragraphs = content.split(/\n\s*\n/).filter((paragraph) => paragraph.trim().length > 0)
  const sentences = content
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
  const words = content.split(/\s+/).filter(Boolean)

  const metrics = {
    wordCount: words.length,
    paragraphCount: paragraphs.length,
    sentenceCount: sentences.length,
    estimatedReadingTimeMinutes: Number((words.length / 200).toFixed(2)),
  }

  const findings = [] as Array<{
    id: string
    type: string
    severity: string
    title: string
    description: string
    suggestion: string
    context: string
    confidence: number
    createdAt: Date
  }>

  if (type === 'CLAIMS_ANALYSIS' || type === 'FULL_ANALYSIS') {
    const claimMentions = content.match(/claim\s+\d+/gi) || []
    if (claimMentions.length === 0) {
      findings.push({
        id: 'claim-coverage',
        type: 'CLAIM_COVERAGE',
        severity: 'HIGH',
        title: 'No claims identified in document',
        description: 'The analysis could not locate any claim references, which suggests claims may be missing or mislabeled.',
        suggestion: 'Ensure claims are clearly enumerated and labeled.',
        context: content.slice(0, 180),
        confidence: 0.75,
        createdAt: new Date(),
      })
    } else {
      const uniqueClaims = new Set(claimMentions.map((claim) => claim.toLowerCase()))
      findings.push({
        id: 'claim-coverage',
        type: 'CLAIM_COVERAGE',
        severity: 'MEDIUM',
        title: 'Detected claim references',
        description: `Identified ${uniqueClaims.size} claim references. Verify dependencies and numbering continuity.`,
        suggestion: 'Cross-check dependent claims and numbering against the specification.',
        context: claimMentions.slice(0, 3).join(', '),
        confidence: 0.9,
        createdAt: new Date(),
      })
    }
  }

  if (type === 'SPECIFICATION_ANALYSIS' || type === 'FULL_ANALYSIS') {
    const longSentences = sentences.filter((sentence) => sentence.split(/\s+/).length > 40)
    if (longSentences.length > 0) {
      findings.push({
        id: 'lengthy-description',
        type: 'READABILITY',
        severity: 'LOW',
        title: 'Lengthy specification sentences detected',
        description: `Found ${longSentences.length} sentences exceeding 40 words, which may hinder clarity.`,
        suggestion: 'Break long sentences into shorter, precise statements to improve readability.',
        context: longSentences.slice(0, 2).join(' '),
        confidence: 0.72,
        createdAt: new Date(),
      })
    }
  }

  if (type === 'TERMINOLOGY_ANALYSIS' || type === 'FULL_ANALYSIS') {
    const inconsistentCapitalization = paragraphs.filter((paragraph) => /\b[A-Z]{2,}\b/.test(paragraph))
    if (inconsistentCapitalization.length > 0) {
      findings.push({
        id: 'terminology-standardization',
        type: 'TERMINOLOGY_INCONSISTENCY',
        severity: 'MEDIUM',
        title: 'Potential terminology inconsistencies',
        description: 'Detected sections with aggressive capitalization that may indicate inconsistent terminology.',
        suggestion: 'Standardize defined terms and ensure capitalization matches defined terms.',
        context: inconsistentCapitalization[0].slice(0, 200),
        confidence: 0.66,
        createdAt: new Date(),
      })
    }
  }

  if (type === 'FIGURE_ANALYSIS' || type === 'FULL_ANALYSIS') {
    const figureMentions = content.match(/figure\s+\d+/gi) || []
    if (figureMentions.length === 0) {
      findings.push({
        id: 'figure-coverage',
        type: 'REFERENCE_NUMERAL',
        severity: 'LOW',
        title: 'No figure references detected',
        description: 'The analysis did not find figure references. Confirm whether figures are required.',
        suggestion: 'Add figure references or confirm figures are intentionally omitted.',
        context: content.slice(0, 160),
        confidence: 0.7,
        createdAt: new Date(),
      })
    }
  }

  const summary = {
    totalFindings: findings.length,
    highlights: findings.map((finding) => finding.title),
    readingTimeMinutes: metrics.estimatedReadingTimeMinutes,
    dominantTerms: extractDominantTerms(words, 10),
    configuration: config || {},
  }

  return {
    findings,
    summary,
    metrics,
  }
}

function extractDominantTerms(words: string[], limit: number) {
  const stopwords = new Set(['the', 'and', 'of', 'to', 'a', 'in', 'for', 'with', 'on', 'at', 'by', 'an'])
  const frequency: Record<string, number> = {}

  for (const word of words) {
    const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!normalized || stopwords.has(normalized) || normalized.length < 3) continue
    frequency[normalized] = (frequency[normalized] || 0) + 1
  }

  return Object.entries(frequency)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }))
}
