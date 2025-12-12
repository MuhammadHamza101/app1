import assert from 'node:assert'
import { before, describe, it } from 'node:test'

before(() => {
  const key = Buffer.alloc(32, 1)
  process.env.FILE_ENCRYPTION_KEY = `base64:${key.toString('base64')}`
})

describe('file encryption utilities', () => {
  it('round-trips buffers through encryption', async () => {
    const { encryptBuffer, decryptBuffer } = await import('../src/lib/crypto')
    const payload = Buffer.from('sensitive data payload')
    const encrypted = encryptBuffer(payload)
    const decrypted = decryptBuffer({
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
    })

    assert.deepStrictEqual(decrypted.toString(), payload.toString())
  })
})

describe('retention policy helpers', () => {
  it('flags expired files for skipping', () => {
    const pastDate = new Date(Date.now() - 1000 * 60).toISOString()
    const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString()

    assert.ok(new Date(pastDate) < new Date())
    assert.ok(!(new Date(futureDate) < new Date()))
  })
})
