import { NextRequest, NextResponse } from 'next/server'
import { getRoomEmitter } from '@/lib/realtime'
import { getDemoSession } from '@/lib/demo-session'

export async function GET(request: NextRequest) {
  const session = getDemoSession()

  const { searchParams } = new URL(request.url)
  const room = searchParams.get('room') || 'global'
  const emitter = getRoomEmitter(room)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const onMessage = (payload: unknown) => send(payload)
      emitter.on('message', onMessage)
      send({ type: 'ready', room })

      const keepAlive = setInterval(() => send({ type: 'ping', room }), 25000)

      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive)
        emitter.off('message', onMessage)
      })
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
