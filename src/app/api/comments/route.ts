import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const commentSchema = z.object({
  documentId: z.string(),
  content: z.string().min(1),
  type: z.enum(['GENERAL', 'FINDING', 'SUGGESTION', 'QUESTION', 'APPROVAL']).default('GENERAL'),
  anchorId: z.string().optional(),
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
    const { documentId, content, type, anchorId } = commentSchema.parse(body)

    // Check if user has access to document
    const document = await db.document.findUnique({
      where: { id: documentId },
      include: {
        firm: true,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    if (document.firmId !== session.user.firmId && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Create comment
    const comment = await db.comment.create({
      data: {
        documentId,
        userId: session.user.id,
        content,
        type,
        anchorId,
        status: 'OPEN',
        metadata: {},
      },
    })

    // Update document activity
    await db.document.update({
      where: { id: documentId },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({
      message: 'Comment created successfully',
      comment: {
        id: comment.id,
        content: comment.content,
        type: comment.type,
        createdAt: comment.createdAt,
      },
    })
  } catch (error) {
    console.error('Comment creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
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
    const documentId = searchParams.get('documentId')
    const type = searchParams.get('type')

    const where: any = { documentId }
    if (type) {
      where.type = type
    }
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id
    }

    const comments = await db.comment.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      comments,
    })
  } catch (error) {
    console.error('Comment retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve comments' },
      { status: 500 }
    )
  }
}