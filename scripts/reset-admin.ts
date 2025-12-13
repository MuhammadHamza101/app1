import { db } from '../src/lib/db'
import bcrypt from 'bcryptjs'

async function resetAdmin() {
  const email = 'admin@patentflow.com'
  const defaultPassword = 'admin123'

  try {
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
