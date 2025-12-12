'use client'

import { useEffect } from 'react'

type RoomEvent = { type: string; room: string; payload?: unknown }

export function useRealtimeRoom(room: string, onEvent: (event: RoomEvent) => void) {
  useEffect(() => {
    const source = new EventSource(`/api/realtime?room=${encodeURIComponent(room)}`)
    source.onmessage = (message) => {
      try {
        const parsed: RoomEvent = JSON.parse(message.data)
        onEvent(parsed)
      } catch (error) {
        console.error('Realtime event parse failed', error)
      }
    }

    return () => {
      source.close()
    }
  }, [room, onEvent])
}
