/**
 * Server rotation utility for Classworks Cloud provider
 * Provides fallback mechanism across multiple server endpoints with
 * latency-based preference, background probing, and response caching.
 */

import { getSetting } from '@/utils/settings'

// Server list for classworkscloud provider (in default priority order)
const CLASSWORKS_CLOUD_SERVERS = [
  'https://kv-service.houlang.cloud',
  'https://kv-service.wuyuan.dev',
]

// Cache TTL for server preference (5 minutes)
const SERVER_PREFERENCE_TTL = 5 * 60 * 1000

// 备站被记住的时间要短：一次故障切换成功后不能把不稳定的镜像钉住 5 分钟。
// 60 秒后重新探测，主站恢复就立刻切回。
const FALLBACK_PREFERENCE_TTL = 60 * 1000

// 主站（第一个）优先；备站只有在主站不可达时才会被选为 preferred。
const PRIMARY_SERVER = CLASSWORKS_CLOUD_SERVERS[0]

// 用应用层的 /check 而不是静态首页做探针：更轻、且能反映真实服务可用性（HEAD / 会遇到 HTML/CF 挑战页）。
const PROBE_PATH = '/check'

// Probe timeout (3 seconds)
const PROBE_TIMEOUT_MS = 3000

// Server preference cache
const serverPreference = {
  preferred: null,
  cachedAt: 0,
  ttlMs: SERVER_PREFERENCE_TTL,
  probing: false,
}

/**
 * Update the preference cache to mark the given server URL as preferred.
 * @param {string} url
 * @param {number} [ttlMs] - 该项偏好有效期；主站默认 5 分钟，备站只保留 60 秒
 */
function setCachedPreference(url, ttlMs = SERVER_PREFERENCE_TTL) {
  serverPreference.preferred = url
  serverPreference.cachedAt = Date.now()
  serverPreference.ttlMs = ttlMs
}

/**
 * Determine whether an error should trigger rotation to the next server.
 * Network errors and 5xx server errors warrant rotation.
 * HTTP 4xx responses mean the server is reachable and should NOT trigger rotation
 * (e.g. 404 simply means the key does not exist on a healthy server).
 * @param {Error} error
 * @returns {boolean}
 */
function shouldRotateOnError(error) {
  if (!error.response) {
    return true
  }
  return error.response.status >= 500
}

/**
 * Probe a single server and return its round-trip latency in milliseconds.
 * Returns Infinity when the server cannot be reached within the timeout.
 * Any HTTP response (including 4xx) counts as reachable.
 * @param {string} serverUrl
 * @returns {Promise<number>}
 */
async function probeServer(serverUrl) {
  const controller = new window.AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  const start = Date.now()
  try {
    await fetch(`${serverUrl}${PROBE_PATH}`, { method: 'HEAD', signal: controller.signal })
    return Date.now() - start
  } catch {
    return Infinity
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Probe all cloud servers concurrently and update the preference cache
 * with the fastest reachable one.  Runs silently in the background.
 */
async function updateServerPreference() {
  if (serverPreference.probing) return
  serverPreference.probing = true
  try {
    const results = await Promise.all(
      CLASSWORKS_CLOUD_SERVERS.map(async (url) => ({
        url,
        latency: await probeServer(url),
      })),
    )
    const reachable = results.filter((r) => r.latency < Infinity)
    if (reachable.length > 0) {
      // 主站可达时永远优先主站：Cloudflare 镜像的 TLS/丢包抖动会偶尔让 HEAD 更快，
      // 但实际 API 延迟高一个数量级，不能凭一次探针把全局请求切过去。
      const primary = results.find((r) => r.url === PRIMARY_SERVER)
      const chosen =
        primary && primary.latency < Infinity
          ? primary
          : reachable.sort((a, b) => a.latency - b.latency)[0]
      setCachedPreference(
        chosen.url,
        chosen.url === PRIMARY_SERVER ? SERVER_PREFERENCE_TTL : FALLBACK_PREFERENCE_TTL,
      )
    }
  } catch {
    // Probe failure is non-fatal; keep existing preference
  } finally {
    serverPreference.probing = false
  }
}

/**
 * Return the cloud server list ordered by cached preference (fastest first).
 * Triggers a background probe when the cache is stale without blocking.
 * @returns {string[]}
 */
function getOrderedCloudServers() {
  const now = Date.now()
  const preferred = serverPreference.preferred
  const ttl = serverPreference.ttlMs ?? SERVER_PREFERENCE_TTL
  const cacheStale = now - serverPreference.cachedAt > ttl

  if (cacheStale && !serverPreference.probing) {
    updateServerPreference().catch(() => {})
  }

  if (preferred && CLASSWORKS_CLOUD_SERVERS.includes(preferred)) {
    return [preferred, ...CLASSWORKS_CLOUD_SERVERS.filter((s) => s !== preferred)]
  }
  return [...CLASSWORKS_CLOUD_SERVERS]
}

/**
 * Get the list of servers to try for the given provider.
 * For classworkscloud the list is ordered by latency preference (fastest first).
 * @param {string} provider - The provider type
 * @returns {string[]} Array of server URLs to try
 */
export function getServerList(provider) {
  if (provider === 'classworkscloud' || provider === 'dual-cloud') {
    return getOrderedCloudServers()
  }

  const domain = getSetting('server.domain')
  return domain ? [domain] : []
}

/**
 * Try an operation with server rotation fallback.
 *
 * Key behaviours:
 * - HTTP 4xx responses (e.g. 404) are treated as valid server replies and are
 *   propagated immediately without trying the next server.
 * - Only network errors or HTTP 5xx responses cause rotation to the next server.
 * - On success, the responding server is remembered as the preferred server.
 *
 * @param {Function} operation - Async function that receives a serverUrl and returns a promise
 * @param {Object} options
 * @param {string} [options.provider] - Provider type (defaults to current setting)
 * @param {Function} [options.onServerTried] - Callback invoked on each attempt;
 *   receives { url, status, tried } where tried is a snapshot of all attempts so far
 * @returns {Promise} Result from the first successful server, or throws the last error
 */
export async function tryWithRotation(operation, options = {}) {
  const provider = options.provider || getSetting('server.provider')
  const onServerTried = options.onServerTried
  const hasCallback = typeof onServerTried === 'function'

  const servers = getServerList(provider)
  const triedServers = []
  let lastError = null

  for (const serverUrl of servers) {
    triedServers.push({ url: serverUrl, status: 'trying' })
    if (hasCallback) {
      onServerTried({ url: serverUrl, status: 'trying', tried: [...triedServers] })
    }

    try {
      const result = await operation(serverUrl)

      triedServers[triedServers.length - 1].status = 'success'
      if (hasCallback) {
        onServerTried({ url: serverUrl, status: 'success', tried: [...triedServers] })
      }

      if (provider === 'classworkscloud' || provider === 'dual-cloud') {
        setCachedPreference(
          serverUrl,
          serverUrl === PRIMARY_SERVER ? SERVER_PREFERENCE_TTL : FALLBACK_PREFERENCE_TTL,
        )
      }

      return result
    } catch (error) {
      if (!shouldRotateOnError(error)) {
        triedServers[triedServers.length - 1].status = 'client-error'
        if (hasCallback) {
          onServerTried({ url: serverUrl, status: 'client-error', error, tried: [...triedServers] })
        }
        throw error
      }

      lastError = error
      triedServers[triedServers.length - 1].status = 'failed'
      triedServers[triedServers.length - 1].error = error.message || String(error)
      if (hasCallback) {
        onServerTried({ url: serverUrl, status: 'failed', error, tried: [...triedServers] })
      }

      console.warn(`Server ${serverUrl} failed, trying next:`, error.message)
    }
  }

  console.error('All servers failed. Tried:', triedServers)
  const error = lastError || new Error('All servers failed')
  error.triedServers = triedServers
  throw error
}

/**
 * Get the effective server URL for the current provider.
 * For classworkscloud, returns the cached preferred server (fastest known),
 * falling back to the first server in the list.
 * @returns {string} Server URL
 */
export function getEffectiveServerUrl() {
  const provider = getSetting('server.provider')

  if (provider === 'classworkscloud' || provider === 'dual-cloud') {
    return serverPreference.preferred || CLASSWORKS_CLOUD_SERVERS[0]
  }

  return getSetting('server.domain') || ''
}

/**
 * Check if rotation is enabled for the current provider.
 * @returns {boolean}
 */
export function isRotationEnabled() {
  const provider = getSetting('server.provider')
  return provider === 'classworkscloud' || provider === 'dual-cloud'
}
