import { ingestionQueue } from './queue'
import { IngestionJobData, IngestionResult } from './types'

export async function enqueueIngestionJob(data: IngestionJobData) {
  return ingestionQueue.add('patent-upload', data, {
    removeOnComplete: true,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  })
}

export async function getIngestionJobStatus(jobId: string) {
  const job = await ingestionQueue.getJob(jobId)
  if (!job) return null

  const state = await job.getState()
  const progress = job.progress as
    | number
    | { percent?: number; processed?: number; total?: number; currentFile?: string }

  return {
    id: job.id,
    state,
    progress,
    attemptsMade: job.attemptsMade,
    result: (job.returnvalue || undefined) as IngestionResult | undefined,
    failedReason: job.failedReason,
  }
}

export type { IngestionJobData, IngestionResult } from './types'
export { ingestionQueue } from './queue'
