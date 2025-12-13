import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { enqueueAnalysisJob } from '@/lib/analysis/pipeline'
import { getDemoSession } from '@/lib/demo-session'

const analysisSchema = z.object({
  documentId: z.string(),
  type: z.enum(['CLAIMS_ANALYSIS', 'SPECIFICATION_ANALYSIS', 'FIGURE_ANALYSIS', 'TERMINOLOGY_ANALYSIS', 'FULL_ANALYSIS']),
  config: z.object({}).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = getDemoSession()

    const body = await request.json()
    const { documentId, type, config } = analysisSchema.parse(body)

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

    // Get latest snapshot for analysis
    const snapshot = await db.documentSnapshot.findFirst({
      where: { documentId },
      orderBy: { version: 'desc' },
    })

    if (!snapshot) {
      return NextResponse.json(
        { error: 'No document snapshot available' },
        { status: 400 }
      )
    }

    const analysis = await db.analysis.create({
      data: {
        documentId,
        snapshotId: snapshot.id,
        userId: session.user.id,
        type,
        status: 'PENDING',
        config: config || {},
        startedAt: new Date(),
      },
    })

    enqueueAnalysisJob({
      analysisId: analysis.id,
      snapshotId: snapshot.id,
      type,
      config,
    })

    return NextResponse.json({
      message: 'Analysis job enqueued successfully',
      analysisId: analysis.id,
      status: analysis.status,
    })
  } catch (error) {
    console.error('Analysis creation error:', error)
    return NextResponse.json(
      { error: 'Failed to start analysis' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = getDemoSession()

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const status = searchParams.get('status')
    const analysisId = searchParams.get('analysisId') ?? searchParams.get('id')

    const where: any = {}
    if (analysisId) {
      where.id = analysisId
    }
    if (documentId) {
      where.documentId = documentId
    }
    if (status) {
      where.status = status.toUpperCase()
    }
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id
    }

    const analyses = await db.analysis.findMany({
      where,
      include: {
        document: {
          select: { id: true, title: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        findings: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { startedAt: 'desc' },
    })

    return NextResponse.json({ analyses })
  } catch (error) {
    console.error('Analysis retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve analyses' },
      { status: 500 }
    )
  }
}
