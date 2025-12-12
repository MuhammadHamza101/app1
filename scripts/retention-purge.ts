import fs from 'fs/promises'
import { db } from '../src/lib/db'
import { auditEvent } from '../src/lib/audit'

type StoredFile = {
  storagePath: string
  retentionUntil?: string
  name?: string
}

async function purgeExpiredFiles() {
  const now = new Date()
  const jobs = await db.ingestionJob.findMany({})
  let deleted = 0

  for (const job of jobs) {
    const files = (job.files as StoredFile[]) || []
    const retained: StoredFile[] = []

    for (const file of files) {
      if (file.retentionUntil && new Date(file.retentionUntil) < now) {
        try {
          if (file.storagePath) {
            await fs.unlink(file.storagePath)
          }
          deleted += 1
          await auditEvent({
            type: 'retention.file_deleted',
            userId: job.userId,
            targetId: job.id,
            outcome: 'success',
            metadata: { storagePath: file.storagePath, retentionUntil: file.retentionUntil },
          })
        } catch (error) {
          await auditEvent({
            type: 'retention.file_delete_failed',
            userId: job.userId,
            targetId: job.id,
            outcome: 'failure',
            metadata: {
              storagePath: file.storagePath,
              retentionUntil: file.retentionUntil,
              error: (error as Error).message,
            },
          })
        }
      } else {
        retained.push(file)
      }
    }

    if (retained.length !== files.length) {
      await db.ingestionJob.update({ where: { id: job.id }, data: { files: retained as any } })
    }
  }

  return deleted
}

async function main() {
  const deleted = await purgeExpiredFiles()
  console.log(`Retention purge complete. Deleted ${deleted} expired file(s).`)
  await auditEvent({
    type: 'retention.purge_complete',
    outcome: 'success',
    metadata: { deleted },
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Retention purge failed', error)
    process.exit(1)
  })
