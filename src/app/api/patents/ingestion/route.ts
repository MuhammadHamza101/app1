import { NextRequest, NextResponse } from 'next/server'
import {
  cancelIngestionJob,
  enqueueIngestionJob,
  getIngestionJobStatus,
  listIngestionJobs,
  retryIngestionJob,
} from '@/services/ingestion'
import { persistRawFile } from '@/services/ingestion/storage'
import { db } from '@/lib/db'
import { getDemoSession } from '@/lib/demo-session'

export async function POST(request: NextRequest) {
  try {
    const session = getDemoSession()

    const formData = await request.formData()
    const files = formData.getAll('files')

    if (!files.length) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    const retentionDays = Number(process.env.FILE_RETENTION_DAYS || '30')
    const retentionUntil = new Date(
      Date.now() + retentionDays * 24 * 60 * 60 * 1000
    ).toISOString()

    const preparedFiles = (
      await Promise.all(
        files.map(async (file) => {
          if (!(file instanceof File)) return null
          const buffer = Buffer.from(await file.arrayBuffer())
          const stored = await persistRawFile(file.name, file.type || 'application/octet-stream', buffer)
          return { ...stored, retentionUntil }
        })
      )
    ).filter(Boolean)

    if (!preparedFiles.length) {
      return NextResponse.json({ error: 'No readable files were provided' }, { status: 400 })
    }

    const checksums = preparedFiles.reduce<Record<string, string>>((acc, file) => {
      acc[file.name] = file.checksum
      return acc
    }, {})

    const totalSize = preparedFiles.reduce((acc, file) => acc + (file?.size || 0), 0)

    const record = await db.ingestionJob.create({
      data: {
        userId: session.user.id,
        firmId: session.user.firmId,
        status: 'QUEUED',
        files: preparedFiles as any,
        checksums,
        totalSize,
      },
    })

    await enqueueIngestionJob({
      jobId: record.id,
      userId: session.user.id,
      firmId: session.user.firmId,
      files: preparedFiles as any,
    })

    return NextResponse.json({
      jobId: record.id,
      queued: true,
      files: preparedFiles.length,
      totalSize,
      checksums,
    })
  } catch (error) {
    console.error('Ingestion POST error', error)
    return NextResponse.json({ error: 'Failed to queue ingestion' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const list = searchParams.get('list') === 'true'
    const jobId = searchParams.get('jobId')

    const session = getDemoSession()

    if (list) {
      const jobs = await listIngestionJobs(session.user.id)
      const jobsWithProgress = await Promise.all(
        jobs.map(async (job) => {
          const liveStatus = await getIngestionJobStatus(job.id)
          return { ...job, progress: liveStatus?.progress }
        })
      )
      return NextResponse.json({ jobs: jobsWithProgress })
    }

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    if (request.headers.get('accept')?.includes('text/event-stream')) {
      const stream = new ReadableStream({
        async start(controller) {
          const sendStatus = async () => {
            const status = await getIngestionJobStatus(jobId)
            controller.enqueue(`data: ${JSON.stringify(status || {})}\n\n`)
            if (!status || status.status === 'COMPLETED' || status.status === 'FAILED') {
              controller.close()
            }
          }

          const interval = setInterval(sendStatus, 1000)
          await sendStatus()
          return () => clearInterval(interval)
        },
      })

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache',
        },
      })
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

export async function PATCH(request: NextRequest) {
  try {
    const session = getDemoSession()

    const body = await request.json()
    const { jobId, action } = body || {}

    if (!jobId || !action) {
      return NextResponse.json({ error: 'jobId and action are required' }, { status: 400 })
    }

    if (action === 'cancel') {
      await cancelIngestionJob(jobId)
    } else if (action === 'retry') {
      await retryIngestionJob(jobId)
    } else {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
    }

    const status = await getIngestionJobStatus(jobId)
    return NextResponse.json({ updated: true, status })
  } catch (error) {
    console.error('Ingestion PATCH error', error)
    return NextResponse.json({ error: 'Failed to update ingestion job' }, { status: 500 })
  }
}
