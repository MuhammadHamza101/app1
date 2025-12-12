import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { enqueueIngestionJob, getIngestionJobStatus } from '@/services/ingestion'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files')

    if (!files.length) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    const uploadPayload = await Promise.all(
      files.map(async (file) => {
        if (!(file instanceof File)) return null
        const buffer = Buffer.from(await file.arrayBuffer())
        return {
          name: file.name,
          type: file.type || 'application/octet-stream',
          data: buffer.toString('base64'),
        }
      })
    )

    const preparedFiles = uploadPayload.filter(Boolean)
    if (!preparedFiles.length) {
      return NextResponse.json({ error: 'No readable files were provided' }, { status: 400 })
    }

    const job = await enqueueIngestionJob({
      userId: session.user.id,
      firmId: session.user.firmId,
      files: preparedFiles as any,
    })

    return NextResponse.json({
      jobId: job.id,
      queued: true,
      files: preparedFiles.length,
    })
  } catch (error) {
    console.error('Ingestion POST error', error)
    return NextResponse.json({ error: 'Failed to queue ingestion' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    const status = await getIngestionJobStatus(jobId)
    if (!status) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Ingestion GET error', error)
    return NextResponse.json({ error: 'Failed to read job status' }, { status: 500 })
  }
}
