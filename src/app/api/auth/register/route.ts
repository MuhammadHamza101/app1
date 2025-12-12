import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { authenticator } from 'otplib'
import { generateBackupCodes } from '@/lib/mfa'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  firmName: z.string().optional(),
  role: z.enum(['ADMIN', 'ATTORNEY', 'PARALEGAL', 'REVIEWER']).default('PARALEGAL'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, firmName, role } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      )
    }

    const twoFactorSecret = authenticator.generateSecret()
    const { codes: backupCodes, stored: storedCodes } = generateBackupCodes(8)

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create firm if provided
    let firmId = null
    if (firmName) {
      const firm = await db.firm.create({
        data: {
          name: firmName,
          domain: email.split('@')[1], // Extract domain from email
          settings: {},
        },
      })
      firmId = firm.id
    }

    // Create user
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        firmId,
        isActive: true,
        twoFactorEnabled: true,
        twoFactorSecret,
        backupCodes: storedCodes,
      },
      include: {
        firm: true,
      },
    })

    // Log registration
    console.log(`New user registered: ${email} (${role})`)

    return NextResponse.json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        firmId: user.firmId,
        firm: user.firm,
        twoFactorSecret,
        backupCodes,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    )
  }
}