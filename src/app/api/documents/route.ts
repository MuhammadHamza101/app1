import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import crypto from 'crypto'

const documentSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  metadata: z.object({}).optional(),
})

// Encryption key (in production, use environment variable)
const ENCRYPTION_KEY = process.env.PATENTFLOW_ENCRYPTION_KEY || 'fallback-key-for-development'

function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc'
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(algorithm, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(encryptedData: string): string {
  try {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const parts = encryptedData.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = Buffer.from(parts[1], 'hex')
    const decipher = crypto.createDecipher(algorithm, key, iv)
    
    let decrypted = decipher.update(encrypted, null, 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption failed:', error)
    throw new Error('Failed to decrypt document')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(auth)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, content, metadata } = documentSchema.parse(body)

    // Encrypt document content
    const encryptedContent = encrypt(content)
    const checksum = crypto.createHash('sha256').update(content).digest('hex')

    // Create document record
    const document = await db.document.create({
      data: {
        title,
        encryptedData: encryptedContent,
        checksum,
        status: 'DRAFT',
        metadata: metadata || {},
        firmId: session.user.firmId,
        createdBy: session.user.id,
      },
    })

    // Create initial snapshot
    const snapshot = await db.documentSnapshot.create({
      data: {
        documentId: document.id,
        version: 1,
        content, // Store unencrypted for analysis
        structuredData: {
          sections: [],
          claims: [],
          figures: [],
          referenceNumerals: [],
          terminology: [],
        },
        mappingMetadata: {
          paragraphMap: [],
          anchorMap: {},
          changeDetection: {
            documentChecksum: checksum,
            lastSyncTime: new Date(),
            changeHistory: [],
          },
        },
        checksum,
      },
    })

    // Log document creation
    console.log(`Document created: ${document.id} by user ${session.user.id}`)

    return NextResponse.json({
      message: 'Document stored successfully',
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        createdAt: document.createdAt,
        snapshotId: snapshot.id,
      },
    })
  } catch (error) {
    console.error('Document storage error:', error)
    return NextResponse.json(
      { error: 'Failed to store document' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(auth)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const firmId = searchParams.get('firmId')

    const where: any = {}
    if (firmId && session.user.role === 'ADMIN') {
      where.firmId = firmId
    } else {
      where.firmId = session.user.firmId
    }

    const documents = await db.document.findMany({
      where,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        snapshots: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        analyses: {
          orderBy: { startedAt: 'desc' },
          take: 3,
          include: {
            findings: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
        _count: {
          select: { id: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await db.document.count({ where })

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Document retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve documents' },
      { status: 500 }
    )
  }
}