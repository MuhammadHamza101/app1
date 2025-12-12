import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { authenticator } from 'otplib'
import { auditEvent, extractClientIp } from './audit'
import { verifyBackupCode } from './mfa'

type ExtendedToken = {
  id?: string
  role?: string
  firmId?: string | null
  sub?: string
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  otp: z.string().min(6).max(12).optional(),
})

async function getUserByEmail(email: string) {
  return await db.user.findUnique({
    where: { email },
    include: {
      firm: true,
      backupCodes: true,
    },
  })
}

async function verifyPassword(password: string, hashedPassword: string) {
  return await bcrypt.compare(password, hashedPassword)
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        try {
          const submittedEmail = (credentials as any)?.email
          const { email, password, otp } = await credentialsSchema.parseAsync(
            credentials
          )
          
          // Find user by email
          const user = await getUserByEmail(email)
          if (!user) {
            throw new Error('Invalid credentials')
          }
          
          // Verify password
          const isValidPassword = await verifyPassword(password, user.password || '')
          if (!isValidPassword) {
            throw new Error('Invalid credentials')
          }
          
          // Check if user is active
          if (!user.isActive) {
            throw new Error('Account is deactivated')
          }

          if (user.twoFactorEnabled) {
            const otpValid =
              !!otp &&
              !!user.twoFactorSecret &&
              authenticator.verify({ token: otp, secret: user.twoFactorSecret })

            if (!otpValid) {
              const backupResult = await verifyBackupCode(
                otp || '',
                (user.backupCodes as any) || []
              )

              if (!backupResult.valid) {
                await auditEvent({
                  type: 'auth.mfa_failed',
                  userId: user.id,
                  outcome: 'failure',
                  ip: req?.headers ? extractClientIp(req.headers as any) : undefined,
                  metadata: { email: user.email },
                })
                throw new Error('Multi-factor verification failed')
              }

              await db.user.update({
                where: { id: user.id },
                data: { backupCodes: backupResult.remaining as any },
              })

              await auditEvent({
                type: 'auth.mfa_backup_code_used',
                userId: user.id,
                outcome: 'success',
                ip: req?.headers ? extractClientIp(req.headers as any) : undefined,
                metadata: { email: user.email, usedCodeIssuedAt: backupResult.used?.issuedAt },
              })
            }
          }

          await auditEvent({
            type: 'auth.login.success',
            userId: user.id,
            outcome: 'success',
            ip: req?.headers ? extractClientIp(req.headers as any) : undefined,
            metadata: { email: user.email },
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            firmId: user.firmId,
          }
        } catch (error) {
          await auditEvent({
            type: 'auth.login.failed',
            outcome: 'failure',
            metadata: {
              email: (credentials as any)?.email || submittedEmail,
              reason: (error as Error).message,
            },
            ip: req?.headers ? extractClientIp(req.headers as any) : undefined,
          })
          console.error('Authorization error:', error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      const tokenWithClaims = token as ExtendedToken

      // Add custom claims to JWT token
      if (user) {
        return {
          ...token,
          id: user.id ?? token.sub,
          sub: user.id ?? token.sub,
          role: user.role,
          firmId: user.firmId,
        }
      }

      return {
        ...token,
        id: tokenWithClaims.id ?? token.sub,
      }
    },
    async session({ session, token }) {
      const tokenWithClaims = token as ExtendedToken
      const userId = tokenWithClaims.id ?? tokenWithClaims.sub ?? ''

      // Add custom data to session
      return {
        ...session,
        user: {
          ...session.user,
          id: userId,
          role: tokenWithClaims.role,
          firmId: tokenWithClaims.firmId,
        },
      }
    },
    async redirect({ url, baseUrl }: any) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      return url
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/new-user',
  },
}