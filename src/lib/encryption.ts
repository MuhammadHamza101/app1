import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

let cachedKey: Buffer | null = null

function getEncryptionKey(): Buffer {
  if (cachedKey) {
    return cachedKey
  }

  const rawKey = process.env.PATENTFLOW_ENCRYPTION_KEY

  if (!rawKey) {
    throw new Error('PATENTFLOW_ENCRYPTION_KEY is not configured')
  }

  cachedKey = crypto.createHash('sha256').update(rawKey).digest()
  return cachedKey
}

export function encryptContent(plainText: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encryptedBuffer = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()
  const payload = Buffer.concat([iv, authTag, encryptedBuffer])

  return payload.toString('base64')
}

export function decryptContent(payload: string): string {
  const key = getEncryptionKey()
  const buffer = Buffer.from(payload, 'base64')

  if (buffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Encrypted payload is too short')
  }

  const iv = buffer.subarray(0, IV_LENGTH)
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encryptedText = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
