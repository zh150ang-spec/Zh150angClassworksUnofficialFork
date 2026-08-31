// Lightweight reusable Socket.IO client singleton
// - Uses server domain from settings when available
// - Exposes join/leave helpers and event on/off wrappers
// - Supports offline event caching with auto-retry on reconnect

import { io } from 'socket.io-client'
import { getSetting } from '@/utils/settings'
import { getEffectiveServerUrl, isRotationEnabled } from '@/utils/serverRotation'
import { networkStatus } from '@/utils/networkStatus'

let socket = null
let connectedDomain = null
const listeners = new Set()
const offlineEventQueue = []
const MAX_QUEUE_SIZE = 100

const flushOfflineQueue = () => {
  if (!socket || !socket.connected || offlineEventQueue.length === 0) return

  while (offlineEventQueue.length > 0) {
    const event = offlineEventQueue.shift()
    try {
      socket.emit(event.name, event.data)
    } catch (e) {
      // emit 失败时把事件放回队首，等下次 connect 时重试，避免丢失 leave-token 等关键事件
      // 导致服务端房间状态不一致、潜在权限残留
      offlineEventQueue.unshift(event)
      console.warn('重发离线事件失败，事件已放回队列:', e)
      break
    }
  }
}

if (typeof window !== 'undefined') {
  networkStatus.subscribe((event) => {
    if (event.type === 'online') {
      console.log('网络已恢复，正在重发离线事件...')
      setTimeout(flushOfflineQueue, 1000)
    }
  })
}

export function getServerUrl() {
  // For classworkscloud provider, use the effective server URL from rotation
  if (isRotationEnabled()) {
    return getEffectiveServerUrl()
  }

  // Prefer configured server domain; fallback to env; then current origin
  const cfg = getSetting('server.domain')
  const envUrl = import.meta?.env?.VITE_SERVER_URL
  return cfg || envUrl || window.location.origin
}

export function getSocket() {
  const serverUrl = getServerUrl()
  if (!socket || connectedDomain !== serverUrl) {
    if (socket) {
      try {
        socket.disconnect()
      } catch (e) {
        void e // ignore
      }
      socket = null
    }
    connectedDomain = serverUrl

    // For classworkscloud, create socket with the first server in rotation
    // Note: Socket.IO's built-in reconnection will retry the same server URL.
    // Server rotation is handled at the HTTP request level, not Socket.IO level.
    // If the Socket.IO server goes down, the connection will fail until the server recovers.
    socket = io(serverUrl, { transports: ['polling', 'websocket'] })

    // Re-attach previously registered event handlers on new socket instance
    listeners.forEach(({ event, handler }) => {
      socket.on(event, handler)
    })

    socket.on('connect', () => {
      flushOfflineQueue()
    })
  }
  return socket
}

export function on(event, handler) {
  const s = getSocket()
  s.on(event, handler)
  listeners.add({ event, handler })
  return () => off(event, handler)
}

export function off(event, handler) {
  if (!socket) return
  socket.off(event, handler)
  // Remove only matching entry
  for (const item of Array.from(listeners)) {
    if (item.event === event && item.handler === handler) {
      listeners.delete(item)
    }
  }
}

export function joinToken(token) {
  if (!token) return
  if (!networkStatus.isOnline() || !socket?.connected) {
    if (offlineEventQueue.length < MAX_QUEUE_SIZE) {
      offlineEventQueue.push({ name: 'join-token', data: { token } })
    }
    return
  }
  const s = getSocket()
  s.emit('join-token', { token })
}

export function leaveToken(token) {
  if (!socket) return
  if (!networkStatus.isOnline() || !socket.connected) {
    if (offlineEventQueue.length < MAX_QUEUE_SIZE) {
      offlineEventQueue.push({ name: 'leave-token', data: { token } })
    }
    return
  }
  socket.emit('leave-token', { token })
}

export function leaveAll() {
  if (!socket) return
  if (!networkStatus.isOnline() || !socket.connected) {
    if (offlineEventQueue.length < MAX_QUEUE_SIZE) {
      offlineEventQueue.push({ name: 'leave-all', data: {} })
    }
    return
  }
  socket.emit('leave-all')
}

export function onConnect(handler) {
  const s = getSocket()
  s.on('connect', handler)
  return () => s.off('connect', handler)
}

export function sendEvent(type, content = null) {
  if (!networkStatus.isOnline() || !socket?.connected) {
    if (offlineEventQueue.length < MAX_QUEUE_SIZE) {
      offlineEventQueue.push({ name: 'send-event', data: { type, content } })
    }
    return
  }
  const s = getSocket()
  s.emit('send-event', {
    type,
    content,
  })
}

export function disconnect() {
  if (!socket) return
  try {
    socket.disconnect()
  } catch (e) {
    void e // ignore
  }
  socket = null
  connectedDomain = null
  listeners.clear()
}
