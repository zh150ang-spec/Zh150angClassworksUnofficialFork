import axios from '@/axios/axios'
import { HEARTBEAT_RETRY_POLICY } from '@/utils/netRetryPolicy'

const listeners = new Set()
let browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
let serverReachable = true
let lastOnlineTime = browserOnline ? Date.now() : null
let lastOfflineTime = !browserOnline ? Date.now() : null

const effectiveOnline = () => browserOnline && serverReachable

const notifyListeners = (event) => {
  listeners.forEach((listener) => {
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
      reason: 'browser_online',
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
    reason: 'browser_offline',
  })

  console.log('网络已断开')
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  // 页面回到前台时立刻探一次：大屏长时间挂着时，恢复速度不再受 30s 心跳周期限制
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      probeNow()
    }
  })
}

// Heartbeat
//
// 唯一权威：只有心跳（连续失败 MAX_HEARTBEAT_FAILURES 次）才能把 serverReachable 置为 false；
// 只有一次真实成功（心跳或任意业务请求）才能把它置回 true。
// 业务请求失败只能通过 noteRequestFailure() 提供「证据」，不得直接翻转全局状态——
// 否则一次被服务器拒绝的写入（401/403/400）会让整个应用误判为离线，表现为「一阵一阵突然离线」。
let heartbeatTimer = null
let heartbeatUrl = null
let heartbeatFailures = 0
let heartbeatInFlight = false
const HEARTBEAT_INTERVAL = 30000
const MAX_HEARTBEAT_FAILURES = 2
const HEARTBEAT_TIMEOUT = 5000
// 业务失败触发的即时探测去抖窗口
const PROBE_DEBOUNCE = 5000
let probeTimer = null
let lastProbeAt = 0
let lastRequestFailureAt = null
let lastRequestSuccessAt = null

const performHeartbeat = async () => {
  if (!heartbeatUrl) return
  // 在途守卫：心跳超时/挂起时不再叠加新的心跳请求
  if (heartbeatInFlight) return

  heartbeatInFlight = true
  try {
    await axios.get(heartbeatUrl, {
      timeout: HEARTBEAT_TIMEOUT,
      validateStatus: (status) => status >= 200 && status < 300,
      // 心跳不重试：失败必须立刻计数，下一次 30s 心跳就是它的重试
      metadata: { retryPolicy: HEARTBEAT_RETRY_POLICY },
    })
    heartbeatFailures = 0
    networkStatus.markServerReachable()
  } catch {
    heartbeatFailures++
    if (heartbeatFailures >= MAX_HEARTBEAT_FAILURES) {
      networkStatus.markServerUnreachable()
    }
  } finally {
    heartbeatInFlight = false
  }
}

/**
 * 立刻探测服务器可达性（去抖：PROBE_DEBOUNCE 内最多一次）。
 * 供业务失败、页面重新可见、浏览器网络恢复时调用，用于缩短恢复/判定延迟。
 */
function probeNow() {
  if (!heartbeatUrl || heartbeatInFlight) return

  const sinceLast = Date.now() - lastProbeAt
  if (sinceLast >= PROBE_DEBOUNCE) {
    lastProbeAt = Date.now()
    performHeartbeat()
    return
  }

  if (probeTimer) return
  probeTimer = setTimeout(() => {
    probeTimer = null
    lastProbeAt = Date.now()
    performHeartbeat()
  }, PROBE_DEBOUNCE - sinceLast)
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
        reason: 'server_unreachable',
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
          reason: 'server_reachable',
        })
        console.log('服务器已恢复')
      }
    }
  },

  /**
   * 记录一次业务请求失败——**只作为证据**，不翻转全局状态。
   * 是否真的离线由心跳连续失败次数决定（见 performHeartbeat）。
   * 同时触发一次去抖的即时探测，让离线判定/恢复不必等满 30s。
   */
  noteRequestFailure: () => {
    lastRequestFailureAt = Date.now()
    probeNow()
  },

  /**
   * 记录一次业务请求成功：服务器显然可达，立即恢复并清零心跳失败计数。
   * 与 noteRequestFailure 配对，保证「证据」只用于加速判定，不制造假离线。
   */
  noteRequestSuccess: () => {
    lastRequestSuccessAt = Date.now()
    lastRequestFailureAt = null
    heartbeatFailures = 0
    networkStatus.markServerReachable()
  },

  /** 立即探测（去抖），供 App 层在页面可见 / 网络恢复时调用 */
  probeNow,

  getLastRequestFailureAt: () => lastRequestFailureAt,

  getLastRequestSuccessAt: () => lastRequestSuccessAt,

  getHeartbeatFailures: () => heartbeatFailures,

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
      reason: effectiveOnline() ? 'initial_online' : 'initial_offline',
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
    lastOfflineTime,
    heartbeatFailures,
    lastRequestFailureAt,
    lastRequestSuccessAt,
  }),

  getEffectiveStatus: () => ({
    isOnline: effectiveOnline(),
    browserOnline,
    serverReachable,
    lastOnlineTime,
    lastOfflineTime,
    heartbeatFailures,
    lastRequestFailureAt,
    lastRequestSuccessAt,
  }),

  startHeartbeat: (url) => {
    networkStatus.stopHeartbeat()
    if (!url) return
    heartbeatUrl = url
    lastProbeAt = 0
    performHeartbeat()
    heartbeatTimer = setInterval(performHeartbeat, HEARTBEAT_INTERVAL)
    console.log('服务器心跳检测已启动:', url)
  },

  stopHeartbeat: () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    if (probeTimer) {
      clearTimeout(probeTimer)
      probeTimer = null
    }
    heartbeatUrl = null
    heartbeatFailures = 0
    lastProbeAt = 0
  },

  destroy: () => {
    networkStatus.stopHeartbeat()
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
    listeners.clear()
  },
}

export default networkStatus
