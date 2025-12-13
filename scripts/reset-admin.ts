import path from 'node:path'
import { execSync } from 'node:child_process'
import { config } from 'dotenv'
import bcrypt from 'bcryptjs'

config({ path: path.join(process.cwd(), '.env') })
config({ path: path.join(process.cwd(), '.env.local'), override: true })

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db'
}

async function getDb() {
  const { db } = await import('../src/lib/db')
  return db
}

async function ensureSchema(db: Awaited<ReturnType<typeof getDb>>) {
  try {
    await db.user.count()
  } catch (error: any) {
    if (error?.code === 'P2021') {
      console.log('🛠️ Database not initialized; running prisma db push...')
      execSync('npx prisma db push --skip-generate', { stdio: 'inherit' })
      return
    }
    throw error
  }
}

async function resetAdmin() {
  const email = 'admin@patentflow.com'
  const defaultPassword = 'admin123'

  const db = await getDb()

  try {
    await ensureSchema(db)

    
    let firm = await db.firm.findUnique({ where: { domain: 'patentflow.com' } })
    if (!firm) {
      firm = await db.firm.create({
        data: {
          name: 'PatentFlow Enterprise',
          domain: 'patentflow.com',
          settings: { plan: 'enterprise', maxUsers: 100, features: ['all'] }
        }
      })
      console.log('✅ Created default firm')
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
        backupCodes: null
      },
      update: {
        password: hashedPassword,
        firmId: firm.id,
        isActive: true,
        role: 'ADMIN',
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: null,
        updatedAt: new Date()
      }
    })

    console.log('✅ Admin account ready:')
    console.log(`   Email: ${user.email}`)
    console.log(`   Password: ${defaultPassword}`)
    console.log('   MFA: disabled (TOTP/backup codes cleared)')
  } catch (error) {
    console.error('❌ Failed to reset admin:', error)
    process.exitCode = 1
  } finally {
    await db.$disconnect()
  }
}

resetAdmin()
