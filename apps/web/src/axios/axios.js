import axios from 'axios'
import { getSetting } from '@/utils/settings'
import { parseRateLimit } from 'ratelimit-header-parser'
import RateLimitModal from '@/components/system/RateLimitModal.vue'
import { Base64 } from 'js-base64'
import { DEFAULT_RETRY_POLICY, resolveRetryPolicy, planRetry } from '@/utils/netRetryPolicy'

const DEFAULT_TIMEOUT = 15000
// 重试策略：**有界**指数退避，默认最多 2 次尝试、总预算 12s（见 netRetryPolicy.js）。
// 单次请求超时 15s > 预算 12s，因此「请求整体超时」不会重试，UI 的等待时间保持有界。
//
// 重要：这里**不再**做「永不放弃」的持久重试。持久重试属于离线队列 / backgroundSync 的职责，
// 传输层若永不失败，上层的失败处理（心跳阈值、离线队列、RMW 降级、退避）全部无法生效。
// 调用方可用 `config.metadata.retryPolicy` 覆盖（心跳 maxAttempts:1，后台同步见 BACKGROUND_RETRY_POLICY）。
//
// 幂等性说明：KV 写入是服务端无条件 upsert（apps/server/routes/kv-token.js），重试安全；
// 若将来新增非幂等端点，必须显式设置 maxAttempts:1。

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
      // 保留调用方传入的 metadata（retryPolicy 等）与响应拦截器写入的 attempt，
      // 否则重试时会丢失策略并导致计数器被重置
      ...(requestConfig.metadata || {}),
      startTime: requestConfig.metadata?.startTime ?? Date.now(),
      attempt: requestConfig.metadata?.attempt ?? 0,
      retryPolicy: resolveRetryPolicy(requestConfig.metadata?.retryPolicy),
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
    const metadata = config.metadata || {}
    const attempt = metadata.attempt ?? 0
    const elapsedMs = Date.now() - (metadata.startTime ?? Date.now())

    if (error.response && error.response.status === 429 && attempt === 0) {
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

    const decision = planRetry({
      error,
      attempt,
      elapsedMs,
      policy: metadata.retryPolicy ?? DEFAULT_RETRY_POLICY,
    })

    if (decision.retry) {
      const nextAttempt = attempt + 1
      console.log(`请求失败，${decision.delayMs}ms 后重试 (第 ${nextAttempt} 次):`, error.message)

      await sleep(decision.delayMs)

      const newConfig = {
        ...config,
        metadata: {
          ...metadata,
          attempt: nextAttempt,
        },
      }

      return axiosInstance(newConfig)
    }

    // 有界重试已结束：把「已尝试次数 / 放弃原因」原样交给上层，
    // 由离线队列等持久层决定是否继续重试。
    error.retryAttempts = attempt
    error.retryExhausted = true
    error.retryStoppedReason = decision.reason

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
