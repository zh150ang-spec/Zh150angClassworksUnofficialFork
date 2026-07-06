import axios from "@/axios/axios"

const listeners = new Set()
let browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
let serverReachable = true
let lastOnlineTime = browserOnline ? Date.now() : null
let lastOfflineTime = !browserOnline ? Date.now() : null

const effectiveOnline = () => browserOnline && serverReachable

const notifyListeners = (event) => {
  listeners.forEach(listener => {
    try {
      listener(event)
    } catch (e) {
      console.error('网络状态监听器错误:', e)
    }
  })
}

const handleOnline = () => {
  const wasOffline = !browserOnline
  browserOnline = true
  if (wasOffline) {
    lastOnlineTime = Date.now()
  }
  
  if (serverReachable) {
    notifyListeners({
      type: 'online',
      isOnline: true,
      wasOffline,
      offlineDuration: wasOffline ? lastOnlineTime - lastOfflineTime : 0,
      reason: 'browser_online'
    })
    console.log('网络已连接')
  } else {
    console.log('浏览器网络已恢复，等待服务器可达...')
  }
}

const handleOffline = () => {
  const wasOnline = browserOnline
  browserOnline = false
  lastOfflineTime = Date.now()
  
  notifyListeners({
    type: 'offline',
    isOnline: false,
    wasOnline,
    onlineDuration: wasOnline ? lastOfflineTime - lastOnlineTime : 0,
    reason: 'browser_offline'
  })
  
  console.log('网络已断开')
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
}

// Heartbeat
let heartbeatTimer = null
let heartbeatUrl = null
let heartbeatFailures = 0
const HEARTBEAT_INTERVAL = 30000
const MAX_HEARTBEAT_FAILURES = 2
const HEARTBEAT_TIMEOUT = 5000

const performHeartbeat = async () => {
  if (!heartbeatUrl) return

  try {
    await axios.get(heartbeatUrl, {
      timeout: HEARTBEAT_TIMEOUT,
      validateStatus: (status) => status >= 200 && status < 300
    })
    heartbeatFailures = 0
    networkStatus.markServerReachable()
  } catch {
    heartbeatFailures++
    if (heartbeatFailures >= MAX_HEARTBEAT_FAILURES) {
      networkStatus.markServerUnreachable()
    }
  }
}

export const networkStatus = {
  isOnline: () => effectiveOnline(),

  isOffline: () => !effectiveOnline(),

  isBrowserOnline: () => browserOnline,

  isServerReachable: () => serverReachable,

  markServerUnreachable: () => {
    if (serverReachable) {
      serverReachable = false
      lastOfflineTime = Date.now()
      notifyListeners({
        type: 'offline',
        isOnline: false,
        wasOnline: true,
        reason: 'server_unreachable'
      })
      console.log('服务器不可达，进入离线模式')
    }
  },

  markServerReachable: () => {
    if (!serverReachable) {
      serverReachable = true
      if (browserOnline) {
        lastOnlineTime = Date.now()
        notifyListeners({
          type: 'online',
          isOnline: true,
          wasOffline: true,
          offlineDuration: lastOnlineTime - lastOfflineTime,
          reason: 'server_reachable'
        })
        console.log('服务器已恢复')
      }
    }
  },

  getLastOnlineTime: () => lastOnlineTime,

  getLastOfflineTime: () => lastOfflineTime,

  subscribe: (callback) => {
    if (typeof callback !== 'function') {
      console.error('订阅回调必须是函数')
      return () => {}
    }

    listeners.add(callback)

    callback({
      type: 'initial',
      isOnline: effectiveOnline(),
      wasOffline: false,
      reason: effectiveOnline() ? 'initial_online' : 'initial_offline'
    })

    return () => {
      listeners.delete(callback)
    }
  },

  getOnlineStatus: () => ({
    isOnline: effectiveOnline(),
    browserOnline,
    serverReachable,
    lastOnlineTime,
    lastOfflineTime
  }),

  getEffectiveStatus: () => ({
    isOnline: effectiveOnline(),
    browserOnline,
    serverReachable,
    lastOnlineTime,
    lastOfflineTime
  }),

  startHeartbeat: (url) => {
    networkStatus.stopHeartbeat()
    if (!url) return
    heartbeatUrl = url
    performHeartbeat()
    heartbeatTimer = setInterval(performHeartbeat, HEARTBEAT_INTERVAL)
    console.log('服务器心跳检测已启动:', url)
  },

  stopHeartbeat: () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    heartbeatUrl = null
    heartbeatFailures = 0
  },

  destroy: () => {
    networkStatus.stopHeartbeat()
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
    listeners.clear()
  }
}

export default networkStatus
