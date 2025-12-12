import { IngestionJobStatus, PatentStatus } from '@prisma/client'
import fs from 'fs/promises'
import { Job } from 'bullmq'
import { db } from '@/lib/db'
import { parseBufferByType } from './extractors'
import { IngestionJobData, IngestionResult, NormalizedPatent } from './types'

function parseDate(value?: string) {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

async function persistPatent(patent: NormalizedPatent, job: Job<IngestionJobData>) {
  const abstract = patent.abstract || patent.content.slice(0, 1000)
  const claimsText = patent.claims?.join('\n').trim()
  const ipcClasses = patent.classifications?.ipc?.join(', ')
  const cpcClasses = patent.classifications?.cpc?.join(', ')

  const filingDate = parseDate(patent.filingDate)
  const publicationDate = parseDate(patent.publicationDate)

  return db.patent.create({
    data: {
      title: patent.title,
      abstract,
      claimsText,
      applicationNumber: patent.applicationNumber,
      publicationNumber: patent.publicationNumber,
      jurisdiction: patent.jurisdiction,
      language: patent.language,
      sourceFile: patent.sourceFile,
      content: patent.content || 'No text extracted',
      metadata: patent.metadata,
      classifications: patent.classifications,
      ipcClasses,
      cpcClasses,
      assignee: patent.assignee,
      filingDate,
      publicationDate,
      status: PatentStatus.COMPLETED,
      firmId: job.data.firmId || undefined,
      createdBy: job.data.userId,
    },
  })
}

export async function processIngestionJob(
  job: Job<IngestionJobData>
): Promise<IngestionResult> {
  const totalFiles = job.data.files.length
  let processed = 0
  let patentsCreated = 0
  const languageTally: Record<string, number> = {}
  const errors: string[] = []
  const extractedMetadata: Array<Record<string, unknown>> = []

  await db.ingestionJob.update({
    where: { id: job.data.jobId },
    data: { status: IngestionJobStatus.PROCESSING },
  })

  await job.updateProgress({ percent: 0, processed, total: totalFiles })

  for (const file of job.data.files) {
    try {
      if (file.retentionUntil && new Date(file.retentionUntil) < new Date()) {
        await job.log(`Skipped expired file ${file.name}`)
        processed += 1
        await job.updateProgress({
          percent: Math.round((processed / totalFiles) * 100),
          processed,
          total: totalFiles,
          currentFile: file.name,
        })
        continue
      }

      const buffer = await fs.readFile(file.storagePath)
      const patents = await parseBufferByType(buffer, file.name, file.type)

      for (const patent of patents) {
        await persistPatent(
          {
            ...patent,
            sourceFile: file.name,
            metadata: {
              ...(patent.metadata || {}),
              checksum: file.checksum,
              storagePath: file.storagePath,
              size: file.size,
            },
          },
          job
        )
        patentsCreated += 1

        if (patent.language) {
          languageTally[patent.language] = (languageTally[patent.language] || 0) + 1
        }
      }

      extractedMetadata.push({
        file: file.name,
        checksum: file.checksum,
        size: file.size,
        parsedPatents: patents.length,
      })
    } catch (error) {
      errors.push(`${file.name}: ${(error as Error).message}`)
      await job.log(`Failed to ingest ${file.name}: ${(error as Error).message}`)
    }

    processed += 1
    const percent = totalFiles > 0 ? Math.round((processed / totalFiles) * 100) : 100
    await job.updateProgress({ percent, processed, total: totalFiles, currentFile: file.name })
    await db.ingestionJob.update({
      where: { id: job.data.jobId },
      data: {
        extractedMetadata,
        errors,
        status: IngestionJobStatus.PROCESSING,
        result: {
          patentsCreated,
          filesProcessed: totalFiles,
          languages: languageTally,
          errors,
        },
        updatedAt: new Date(),
      },
    })
  }

  const result = {
    patentsCreated,
    filesProcessed: totalFiles,
    languages: languageTally,
    errors,
  }

  await db.ingestionJob.update({
    where: { id: job.data.jobId },
    data: {
      status: errors.length ? IngestionJobStatus.FAILED : IngestionJobStatus.COMPLETED,
      extractedMetadata,
      errors,
      result,
      updatedAt: new Date(),
    },
  })

  return result
}
