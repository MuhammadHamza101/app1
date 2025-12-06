import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import crypto from 'crypto'
import { decryptContent, encryptContent } from '@/lib/encryption'

const documentSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  metadata: z.object({}).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, content, metadata } = documentSchema.parse(body)

    // Encrypt document content
    const encryptedContent = encryptContent(content)
    const encryptedSnapshot = encryptContent(content)
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
        content: encryptedSnapshot,
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
    const session = await getServerSession(authOptions)
    
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

    const safeDocuments = documents.map((document) => {
      const [latestSnapshot] = document.snapshots
      const decryptedSnapshot = latestSnapshot
        ? {
            ...latestSnapshot,
            content: decryptContent(latestSnapshot.content),
          }
        : null

      return {
        id: document.id,
        title: document.title,
        originalPath: document.originalPath,
        checksum: document.checksum,
        version: document.version,
        status: document.status,
        metadata: document.metadata,
        firmId: document.firmId,
        createdBy: document.createdBy,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        creator: document.creator,
        analyses: document.analyses,
        snapshots: decryptedSnapshot ? [decryptedSnapshot] : [],
        _count: document._count,
      }
    })

    return NextResponse.json({
      documents: safeDocuments,
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