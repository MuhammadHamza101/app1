import EventEmitter from 'events'

export type RealtimeEvent = {
  room: string
  type: string
  payload: unknown
}

const globalBus = globalThis as unknown as {
  realtimeEmitters?: Map<string, EventEmitter>
}

function getBus() {
  if (!globalBus.realtimeEmitters) {
    globalBus.realtimeEmitters = new Map()
  }
  return globalBus.realtimeEmitters
}

export function getRoomEmitter(room: string) {
  const bus = getBus()
  if (!bus.has(room)) {
    bus.set(room, new EventEmitter())
  }
  return bus.get(room)!
}

export function broadcastToRoom(room: string, type: string, payload: unknown) {
  const emitter = getRoomEmitter(room)
  const event: RealtimeEvent = { room, type, payload }
  emitter.emit('message', event)
}
