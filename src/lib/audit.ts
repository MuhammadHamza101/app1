import fs from 'fs/promises'
import path from 'path'

export type AuditEvent = {
  type: string
  userId?: string
  targetId?: string
  ip?: string
  outcome?: 'success' | 'failure'
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

export async function readAuditEvents(options: {
  userId?: string
  action?: string
  from?: string
  to?: string
  limit?: number
}) {
  const { userId, action, from, to, limit = 200 } = options
  const fromDate = from ? new Date(from) : undefined
  const toDate = to ? new Date(to) : undefined

  try {
    await ensureLogDir()
    const content = await fs.readFile(auditLogPath, 'utf8').catch(async (error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await ensureLogDir()
        return ''
      }
      throw error
    })

    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const events = lines
      .map((line) => {
        try {
          return JSON.parse(line) as AuditEvent & { timestamp: string }
        } catch (error) {
          console.warn('Skipping malformed audit line', error)
          return null
        }
      })
      .filter(Boolean) as (AuditEvent & { timestamp: string })[]

    const filtered = events.filter((event) => {
      const timestamp = new Date(event.timestamp)
      if (fromDate && timestamp < fromDate) return false
      if (toDate && timestamp > toDate) return false
      if (userId && event.userId !== userId) return false
      if (action && event.type !== action) return false
      return true
    })

    return filtered.slice(-limit)
  } catch (error) {
    console.error('Failed to read audit events', error)
    throw error
  }
}

export function extractClientIp(headers: Headers) {
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim()
  }

  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp

  return 'unknown'
}
