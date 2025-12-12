import fs from 'fs/promises'
import path from 'path'

export type AuditEvent = {
  type: string
  userId?: string
  metadata?: Record<string, unknown>
}

const auditLogPath = process.env.AUDIT_LOG_PATH || './logs/audit.log'

async function ensureLogDir() {
  const dir = path.dirname(auditLogPath)
  await fs.mkdir(dir, { recursive: true })
}

export async function auditEvent(event: AuditEvent) {
  try {
    await ensureLogDir()
    const payload = {
      ...event,
      timestamp: new Date().toISOString(),
    }
    await fs.appendFile(auditLogPath, `${JSON.stringify(payload)}\n`, 'utf8')
  } catch (error) {
    console.error('Failed to write audit log', error)
  }
}
