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

async function createDefaultUser() {
  const db = await getDb()
  try {
    await ensureSchema(db)
    // Check if admin user already exists
    const existingUser = await db.user.findUnique({
      where: { email: 'admin@patentflow.com' }
    })

    if (existingUser) {
      console.log('✅ Admin user already exists')
      return
    }

    // Get or create default firm
    let firm = await db.firm.findUnique({
      where: { domain: 'patentflow.com' }
    })

    if (!firm) {
      firm = await db.firm.create({
        data: {
          name: 'PatentFlow Enterprise',
          domain: 'patentflow.com',
          settings: {
            plan: 'enterprise',
            maxUsers: 100,
            features: ['all']
          }
        }
      })
      console.log('✅ Default firm created')
    } else {
      console.log('✅ Using existing firm')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 12)

    // Create admin user
    const user = await db.user.create({
      data: {
        email: 'admin@patentflow.com',
        name: 'System Administrator',
        password: hashedPassword,
        role: 'ADMIN',
        firmId: firm.id,
        isActive: true
      }
    })

    console.log('✅ Default admin user created:')
    console.log('   Email: admin@patentflow.com')
    console.log('   Password: admin123')
    console.log('   Role: ADMIN')
    console.log('   Firm:', firm.name)

  } catch (error) {
    console.error('❌ Error creating default user:', error)
  } finally {
    await db.$disconnect()
  }
}

createDefaultUser()
