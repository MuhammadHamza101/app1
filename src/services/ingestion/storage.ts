import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'

export interface StoredFileReference {
  name: string
  type: string
  size: number
  storagePath: string
  checksum: string
  version: number
  retentionUntil?: string
}

const STORAGE_ROOT =
  process.env.INGESTION_STORAGE_PATH || path.join(process.cwd(), 'storage', 'uploads')

async function ensureStorageDir() {
  await fs.mkdir(STORAGE_ROOT, { recursive: true })
}

function computeChecksum(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function persistRawFile(
  name: string,
  type: string,
  buffer: Buffer
): Promise<StoredFileReference> {
  await ensureStorageDir()
  const checksum = computeChecksum(buffer)
  const version = Date.now()
  const sanitized = sanitizeFilename(name || `upload-${version}`)
  const storagePath = path.join(STORAGE_ROOT, `${version}-${sanitized}`)

  await fs.writeFile(storagePath, buffer)

  return {
    name: sanitized,
    type: type || 'application/octet-stream',
    size: buffer.byteLength,
    storagePath,
    checksum,
    version,
  }
}
