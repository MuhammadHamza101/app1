import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url)
  const heartbeatMs = Number(searchParams.get('heartbeat') ?? 1000)

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (data: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      send({ status: 'connected', runId: params.id })

      const interval = setInterval(async () => {
        const run = await db.analysisRun.findUnique({ where: { id: params.id } })
        if (!run) {
          send({ status: 'error', message: 'Run not found' })
          clearInterval(interval)
          controller.close()
          return
        }
        send({ status: run.status, outputs: run.outputs, steps: run.steps, completedAt: run.completedAt })
        if (run.status === 'COMPLETED' || run.status === 'FAILED') {
          clearInterval(interval)
          controller.close()
        }
      }, heartbeatMs)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
    },
  })
}
