import axios from '@/axios/axios'
import { formatResponse, formatError } from '@/utils/dataProvider'
import { getSetting } from '@/utils/settings'
import { tryWithRotation, isRotationEnabled } from '@/utils/serverRotation'

// Helper function to get request headers with kvtoken
const getHeaders = () => {
  const headers = { Accept: 'application/json' }
  const kvToken = getSetting('server.kvToken')
  const siteKey = getSetting('server.siteKey')

  // 优先使用新的kvToken
  if (kvToken) {
    headers['x-app-token'] = kvToken
  } else if (siteKey) {
    // 向后兼容旧的siteKey
    headers['x-site-key'] = siteKey
  }

  return headers
}

/**
 * 把调用方传入的"请求级选项"翻译成 axios 配置。
 *
 * - `retryPolicy`：覆盖默认的有界重试策略（后台同步用 BACKGROUND_RETRY_POLICY）
 * - `signal`：租约失效时中止在途请求（跨标签锁丢失后立刻停止打服务器）
 *
 * 不传 options 时行为与以前完全一致（走默认交互策略）。
 * @param {{retryPolicy?:object, signal?:AbortSignal}} [options]
 * @returns {object} 可直接展开进 axios config 的对象
 */
const getRequestConfig = (options = {}) => {
  const config = {}
  if (options.retryPolicy) {
    config.metadata = { retryPolicy: options.retryPolicy }
  }
  if (options.signal) {
    config.signal = options.signal
  }
  return config
}

/**
 * 交互读取的 in-flight 去重表。
 *
 * 只缓存「尚未完成」的 Promise，完成后立即删除，因此不会引入陈旧数据；
 * 带 signal / retryPolicy 的调用（后台同步）不参与共享，避免取消互相影响。
 */
const inflightLoads = new Map()

async function loadDataUncached(key, options = {}) {
  try {
    // Use rotation for classworkscloud provider
    if (isRotationEnabled()) {
      return await tryWithRotation(async (serverUrl) => {
        const res = await axios.get(`${serverUrl}/kv/${key}`, {
          headers: getHeaders(),
          ...getRequestConfig(options),
        })
        return formatResponse(res.data)
      })
    }

    const serverUrl = getSetting('server.domain')
    const res = await axios.get(`${serverUrl}/kv/${key}`, {
      headers: getHeaders(),
      ...getRequestConfig(options),
    })

    return formatResponse(res.data)
  } catch (error) {
    const status = error.response?.status
    const message = error.response?.data?.message
    // 安全日志：仅记录 message 和 status，避免泄漏 error.config.headers 中的 x-app-token
    console.error('loadData 失败:', error.message, status)

    // 错误码保真：业务拒绝不能被折叠成 NETWORK_ERROR，否则会被上层当成瞬时故障反复重试。
    if (status === 404) return formatError('数据不存在', 'NOT_FOUND', { retryable: false })
    if (status === 401)
      return formatError(message || '未授权访问', 'UNAUTHORIZED', { retryable: false })
    if (status === 403)
      return formatError(message || '无权限访问', 'FORBIDDEN', { retryable: false })
    if (error.code === 'ERR_CANCELED') {
      return formatError('请求已取消', 'CANCELLED', { retryable: false })
    }

    const serverSide = typeof status === 'number' && status >= 500
    return formatError(
      message || (serverSide ? '服务器错误' : '服务器连接失败'),
      serverSide ? 'SERVER_LOAD_ERROR' : 'NETWORK_ERROR',
      {
        retryable: true,
        // 传输层已按预算重试过：上层 retryOperation 必须据此停止，避免再放大 3 倍。
        retryExhausted: error.retryExhausted === true,
      },
    )
  }
}

export const kvServerProvider = {
  loadData(key, options = {}) {
    const canDedupe = !options.signal && !options.retryPolicy
    if (canDedupe) {
      const existing = inflightLoads.get(key)
      if (existing) return existing
    }

    const promise = loadDataUncached(key, options)
    if (canDedupe) {
      inflightLoads.set(key, promise)
      const cleanup = () => {
        if (inflightLoads.get(key) === promise) inflightLoads.delete(key)
      }
      promise.then(cleanup, cleanup)
    }
    return promise
  },
  async loadNamespaceInfo() {
    try {
      // Use rotation for classworkscloud provider
      if (isRotationEnabled()) {
        return await tryWithRotation(async (serverUrl) => {
          const res = await axios.get(`${serverUrl}/kv/_info`, {
            headers: getHeaders(),
          })
          return formatResponse(res.data)
        })
      }

      // Standard single-server mode
      const serverUrl = getSetting('server.domain')
      const res = await axios.get(`${serverUrl}/kv/_info`, {
        headers: getHeaders(),
      })

      // 直接返回新格式 API 数据，包含 device 和 account 信息
      return formatResponse(res.data)
    } catch (error) {
      // 安全日志：仅记录 message 和 status，避免泄漏 error.config.headers 中的 x-app-token
      console.error('获取命名空间信息失败:', error.message, error.response?.status)
      return formatError(error.response?.data?.message || '获取命名空间信息失败', 'NAMESPACE_ERROR')
    }
  },

  async updateNamespaceInfo(data) {
    try {
      // Use rotation for classworkscloud provider
      if (isRotationEnabled()) {
        return await tryWithRotation(async (serverUrl) => {
          const res = await axios.put(`${serverUrl}/kv/_info`, data, {
            headers: getHeaders(),
          })
          // 统一返回格式：与其他方法一致使用 formatResponse，避免调用方需要区分成功/失败两种返回结构
          return formatResponse(res.data)
        })
      }

      const serverUrl = getSetting('server.domain')
      const res = await axios.put(`${serverUrl}/kv/_info`, data, {
        headers: getHeaders(),
      })

      return formatResponse(res.data)
    } catch (error) {
      return formatError(error.response?.data?.message || '更新命名空间信息失败', 'NAMESPACE_ERROR')
    }
  },

  async saveData(key, data, options = {}) {
    try {
      // Use rotation for classworkscloud provider
      if (isRotationEnabled()) {
        return await tryWithRotation(async (serverUrl) => {
          await axios.post(`${serverUrl}/kv/${key}`, data, {
            headers: getHeaders(),
            ...getRequestConfig(options),
          })
          return formatResponse(true)
        })
      }

      const serverUrl = getSetting('server.domain')
      await axios.post(`${serverUrl}/kv/${key}`, data, {
        headers: getHeaders(),
        ...getRequestConfig(options),
      })
      return formatResponse(true)
    } catch (error) {
      // 安全日志：仅记录 message 和 status，避免泄漏 error.config.headers 中的 x-app-token
      console.error('saveData 失败:', error.message, error.response?.status)
      return formatError(error.response?.data?.message || '保存失败', 'SAVE_ERROR')
    }
  },

  /**
   * 获取键名列表
   * @param {Object} options - 查询选项
   * @param {string} options.sortBy - 排序字段，默认为 "key"
   * @param {string} options.sortDir - 排序方向，"asc" 或 "desc"，默认为 "asc"
   * @param {number} options.limit - 每页返回的记录数，默认为 100
   * @param {number} options.skip - 跳过的记录数，默认为 0
   * @returns {Promise<Object>} 包含键名列表和分页信息的响应对象
   *
   * 返回值示例:
   * {
   *   keys: ["key1", "key2", "key3"],
   *   total_rows: 150,
   *   current_page: {
   *     limit: 10,
   *     skip: 0,
   *     count: 10
   *   },
   *   load_more: "/api/kv/namespace/_keys?sortBy=key&sortDir=asc&limit=10&skip=10"
   * }
   */
  async loadKeys(options = {}, requestOptions = {}) {
    try {
      // 设置默认参数
      const { sortBy = 'key', sortDir = 'asc', limit = 100, skip = 0 } = options

      // 构建查询参数
      const params = new URLSearchParams({
        sortBy,
        sortDir,
        limit: limit.toString(),
        skip: skip.toString(),
      })

      // Use rotation for classworkscloud provider
      if (isRotationEnabled()) {
        return await tryWithRotation(async (serverUrl) => {
          const res = await axios.get(`${serverUrl}/kv/_keys?${params}`, {
            headers: getHeaders(),
            ...getRequestConfig(requestOptions),
          })
          return formatResponse(res.data)
        })
      }

      const serverUrl = getSetting('server.domain')
      const res = await axios.get(`${serverUrl}/kv/_keys?${params}`, {
        headers: getHeaders(),
        ...getRequestConfig(requestOptions),
      })

      return formatResponse(res.data)
    } catch (error) {
      if (error.response?.status === 404) {
        return formatError('命名空间不存在', 'NOT_FOUND')
      }
      if (error.response?.status === 403) {
        return formatError('无权限访问此命名空间', 'PERMISSION_DENIED')
      }
      if (error.response?.status === 401) {
        return formatError('认证失败', 'UNAUTHORIZED')
      }
      // 安全日志：仅记录 message 和 status，避免泄漏 error.config.headers 中的 x-app-token
      console.error('loadKeys 失败:', error.message, error.response?.status)
      return formatError(error.response?.data?.message || '获取键名列表失败', 'NETWORK_ERROR')
    }
  },
}
