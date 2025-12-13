import path from 'node:path'
import { execSync } from 'node:child_process'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: path.join(process.cwd(), '.env') })
loadEnv({ path: path.join(process.cwd(), '.env.local'), override: true })

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db'
}

async function ensureSchema() {
  try {
    await db.user.count()
  } catch (error: any) {
    if (error?.code === 'P2021') {
      execSync('npx prisma db push --skip-generate', { stdio: 'inherit' })
      return
    }
    throw error
  }
}

async function restoreAdmin() {
  const email = 'admin@patentflow.com'
  const defaultPassword = 'admin123'

  await ensureSchema()

  let firm = await db.firm.findUnique({ where: { domain: 'patentflow.com' } })
  if (!firm) {
    firm = await db.firm.create({
      data: {
        name: 'PatentFlow Enterprise',
        domain: 'patentflow.com',
        settings: { plan: 'enterprise', maxUsers: 100, features: ['all'] },
      },
    })
  }

  const hashedPassword = await bcrypt.hash(defaultPassword, 12)

  const user = await db.user.upsert({
    where: { email },
    create: {
      email,
      name: 'System Administrator',
      password: hashedPassword,
      role: 'ADMIN',
      firmId: firm.id,
      isActive: true,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: null,
    },
    update: {
      password: hashedPassword,
      firmId: firm.id,
      isActive: true,
      role: 'ADMIN',
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: null,
      updatedAt: new Date(),
    },
  })

  return {
    email: user.email,
    password: defaultPassword,
  }
}

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint disabled in production' }, { status: 403 })
  }

  try {
    const account = await restoreAdmin()
    return NextResponse.json({ success: true, account })
  } catch (error) {
    console.error('restore-admin failed:', error)
    return NextResponse.json(
      { error: 'Unable to restore default admin. Check server logs for details.' },
      { status: 500 }
    )
  } finally {
    await db.$disconnect()
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST to restore the default admin' }, { status: 405 })
}

export const dynamic = 'force-dynamic'
