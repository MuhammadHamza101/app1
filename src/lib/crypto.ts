import crypto from 'crypto'

const KEY_LENGTH = 32

function normalizeKey(rawKey?: string) {
  if (!rawKey) {
    throw new Error('FILE_ENCRYPTION_KEY is required for file protection')
  }

  if (rawKey.startsWith('base64:')) {
    const decoded = Buffer.from(rawKey.replace('base64:', ''), 'base64')
    if (decoded.length !== KEY_LENGTH) {
      throw new Error('Decoded FILE_ENCRYPTION_KEY must be 32 bytes long')
    }
    return decoded
  }

  const keyBuffer = Buffer.from(rawKey)
  if (keyBuffer.length < KEY_LENGTH) {
    const padded = Buffer.alloc(KEY_LENGTH)
    keyBuffer.copy(padded)
    return padded
  }

  return keyBuffer.subarray(0, KEY_LENGTH)
}

const encryptionKey = normalizeKey(process.env.FILE_ENCRYPTION_KEY)

export type EncryptedPayload = {
  ciphertext: string
  iv: string
  authTag: string
}

export function encryptBuffer(buffer: Buffer): EncryptedPayload {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv)
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  }
}

export function decryptBuffer(payload: EncryptedPayload): Buffer {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    Buffer.from(payload.iv, 'base64')
  )
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ])
  return decrypted
}
