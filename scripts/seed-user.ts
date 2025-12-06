import { db } from '../src/lib/db'
import bcrypt from 'bcryptjs'

async function createDefaultUser() {
  try {
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