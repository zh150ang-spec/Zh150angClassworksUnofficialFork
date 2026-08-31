import axios from 'axios'
import { getSetting } from '@/utils/settings'
import { parseRateLimit } from 'ratelimit-header-parser'
import RateLimitModal from '@/components/system/RateLimitModal.vue'
import { Base64 } from 'js-base64'

const DEFAULT_TIMEOUT = 15000
// 重试策略：指数退避（2s → 4s → 8s → 16s → 32s → ... → 上限 30 分钟），
// 达到上限后稳定每 30 分钟重试一次，永不放弃直到请求成功。
// 这样既能在瞬时故障时快速恢复，又能在长期故障时保持温和的重试频率，避免对后端造成压力。
const RETRY_DELAY_BASE = 2000
const MAX_RETRY_DELAY = 30 * 60 * 1000 // 30 分钟上限

const RETRYABLE_ERRORS = [
  'ECONNABORTED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ENETUNREACH',
  'ECONNRESET',
  'EAI_AGAIN',
]

const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504]

const shouldRetry = (error) => {
  if (!error) return false

  if (error.code && RETRYABLE_ERRORS.includes(error.code)) {
    return true
  }

  if (error.response && RETRYABLE_STATUS_CODES.includes(error.response.status)) {
    return true
  }

  if (
    error.message &&
    (error.message.includes('timeout') ||
      error.message.includes('Network Error') ||
      error.message.includes('net::ERR'))
  ) {
    return true
  }

  return false
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const axiosInstance = axios.create({
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

axiosInstance.interceptors.request.use(
  (requestConfig) => {
    const provider = getSetting('server.provider')

    if (
      provider === 'kv-server' ||
      provider === 'classworkscloud' ||
      provider === 'dual-cloud' ||
      provider === 'dual-server'
    ) {
      const kvToken = getSetting('server.kvToken')
      if (kvToken) {
        requestConfig.headers['x-app-token'] = kvToken
      } else {
        const siteKey = getSetting('server.siteKey')
        if (siteKey) {
          requestConfig.headers['x-site-key'] = Base64.encode(siteKey)
        }
      }
    }

    requestConfig.metadata = {
      startTime: requestConfig.metadata?.startTime ?? Date.now(),
      // 保留响应拦截器写入的 retryCount，避免重试时计数器被重置为 0 导致死循环
      retryCount: requestConfig.metadata?.retryCount ?? 0,
    }

    return requestConfig
  },
  (error) => {
    console.error('请求拦截器错误:', error)
    return Promise.reject(error)
  },
)

axiosInstance.interceptors.response.use(
  (response) => {
    const duration = Date.now() - response.config.metadata?.startTime
    if (duration > 5000) {
      console.warn(`请求耗时较长: ${response.config.url} (${duration}ms)`)
    }
    return response
  },
  async (error) => {
    const config = error.config || {}
    const retryCount = config.metadata?.retryCount || 0

    if (error.response && error.response.status === 429) {
      try {
        const rateLimitInfo = parseRateLimit(error.response)
        if (rateLimitInfo) {
          RateLimitModal.show(
            rateLimitInfo.reset,
            config.url,
            config.method?.toUpperCase() || 'GET',
          )
        }
      } catch (parseError) {
        console.error('解析限速头信息失败:', parseError)
      }
    }

    if (shouldRetry(error)) {
      const nextRetryCount = retryCount + 1
      // 指数退避：2s → 4s → 8s → 16s → 32s → 64s → ... → 上限 30 分钟
      // 达到上限后稳定每 30 分钟重试一次，永不放弃直到请求成功
      const delay = Math.min(RETRY_DELAY_BASE * Math.pow(2, retryCount), MAX_RETRY_DELAY)
      console.log(`请求失败，${delay}ms 后重试 (第 ${nextRetryCount} 次):`, error.message)

      await sleep(delay)

      const newConfig = {
        ...config,
        metadata: {
          ...config.metadata,
          retryCount: nextRetryCount,
        },
      }

      return axiosInstance(newConfig)
    }

    if (error.code === 'ECONNABORTED') {
      error.message = '请求超时，请检查网络连接'
    } else if (error.message === 'Network Error') {
      error.message = '网络连接失败，请检查网络设置'
    }

    return Promise.reject(error)
  },
)

export const createRequestWithTimeout = (timeout = DEFAULT_TIMEOUT) => {
  return axios.create({
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export const isOnline = () => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

export const fetchWithOfflineCheck = async (url, options = {}) => {
  if (!isOnline()) {
    throw new Error('当前处于离线状态，无法发送请求')
  }

  return axiosInstance({
    url,
    ...options,
  })
}

export default axiosInstance
