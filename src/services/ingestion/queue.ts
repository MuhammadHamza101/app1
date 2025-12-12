import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import { processIngestionJob } from './processor'

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379')

const globalQueue = globalThis as unknown as {
  ingestionQueue?: Queue
  ingestionWorker?: Worker
}

export const ingestionQueue =
  globalQueue.ingestionQueue ||
  new Queue('patent-ingestion', {
    connection,
  })

globalQueue.ingestionQueue = ingestionQueue

if (!globalQueue.ingestionWorker) {
  globalQueue.ingestionWorker = new Worker(
    'patent-ingestion',
    processIngestionJob,
    {
      connection,
      concurrency: 3,
    }
  )
}
