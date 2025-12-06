import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

type ExtendedToken = {
  id?: string
  role?: string
  firmId?: string | null
  sub?: string
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

async function getUserByEmail(email: string) {
  return await db.user.findUnique({
    where: { email },
    include: {
      firm: true,
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
      async authorize(credentials) {
        try {
          const { email, password } = await credentialsSchema.parseAsync(credentials)
          
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
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            firmId: user.firmId,
          }
        } catch (error) {
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