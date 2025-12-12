import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export type BackupCodeRecord = {
  hashed: string
  issuedAt: string
  usedAt?: string
}

export function generateBackupCodes(count = 8) {
  const codes: string[] = []
  const stored: BackupCodeRecord[] = []

  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex')
    codes.push(code)
    stored.push({ hashed: bcrypt.hashSync(code, 10), issuedAt: new Date().toISOString() })
  }

  return { codes, stored }
}

export async function verifyBackupCode(
  provided: string,
  stored: BackupCodeRecord[] | null | undefined
): Promise<{ valid: boolean; remaining: BackupCodeRecord[]; used?: BackupCodeRecord }>
export async function verifyBackupCode(
  provided: string,
  stored: BackupCodeRecord[] | null | undefined
): Promise<{ valid: boolean; remaining: BackupCodeRecord[]; used?: BackupCodeRecord }> {
  if (!provided || !stored?.length) {
    return { valid: false, remaining: stored || [] }
  }

  for (const record of stored) {
    const match = await bcrypt.compare(provided, record.hashed)
    if (match) {
      const remaining = stored.filter((item) => item !== record)
      const used: BackupCodeRecord = { ...record, usedAt: new Date().toISOString() }
      return { valid: true, remaining, used }
    }
  }

  return { valid: false, remaining: stored }
}
