import { IngestionJobStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { ingestionQueue } from './queue'
import { IngestionJobData, IngestionResult, IngestionJobDetail } from './types'

export async function enqueueIngestionJob(data: IngestionJobData) {
  await db.ingestionJob.update({
    where: { id: data.jobId },
    data: {
      status: IngestionJobStatus.QUEUED,
      errors: null,
      result: null,
    },
  })

  return ingestionQueue.add('patent-upload', data, {
    jobId: data.jobId,
    removeOnComplete: true,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  })
}

export async function getIngestionJobStatus(jobId: string) {
  const [job, dbJob] = await Promise.all([
    ingestionQueue.getJob(jobId),
    db.ingestionJob.findUnique({ where: { id: jobId } }),
  ])

  if (!job && !dbJob) return null

  const state = job ? await job.getState() : undefined
  const progress = job?.progress as
    | number
    | { percent?: number; processed?: number; total?: number; currentFile?: string }

  const base: Partial<IngestionJobDetail> = dbJob
    ? {
        id: dbJob.id,
        status: dbJob.status,
        files: (dbJob.files as any) || [],
        checksums: dbJob.checksums as any,
        errors: dbJob.errors as any,
        extractedMetadata: dbJob.extractedMetadata as any,
        totalSize: dbJob.totalSize || undefined,
        result: dbJob.result as IngestionResult,
        createdAt: dbJob.createdAt.toISOString(),
        updatedAt: dbJob.updatedAt.toISOString(),
      }
    : {}

  return {
    ...base,
    queueState: state,
    progress,
    attemptsMade: job?.attemptsMade,
    failedReason: job?.failedReason,
  }
}

export type { IngestionJobData, IngestionResult } from './types'
export { ingestionQueue } from './queue'

export async function listIngestionJobs(userId: string) {
  return db.ingestionJob.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}

export async function cancelIngestionJob(jobId: string) {
  const job = await ingestionQueue.getJob(jobId)
  if (job) {
    await job.discard()
    await job.remove()
  }
  await db.ingestionJob.update({
    where: { id: jobId },
    data: { status: IngestionJobStatus.CANCELLED },
  })
}

export async function retryIngestionJob(jobId: string) {
  const record = await db.ingestionJob.findUnique({ where: { id: jobId } })
  if (!record) throw new Error('Job not found')

  await db.ingestionJob.update({
    where: { id: jobId },
    data: { status: IngestionJobStatus.QUEUED, errors: null },
  })

  return ingestionQueue.add(
    'patent-upload',
    {
      jobId: record.id,
      userId: record.userId,
      firmId: record.firmId,
      files: (record.files as any) || [],
    },
    {
      jobId: record.id,
      removeOnComplete: true,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    }
  )
}
