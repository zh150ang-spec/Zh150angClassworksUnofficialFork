/**
 * 网络重试策略（纯决策逻辑，不含任何 IO / 浏览器 API）
 *
 * 背景：此前 axios 响应拦截器执行「无限重试、永不放弃」，导致传输层的 Promise 永不 settle，
 * 上层所有失败处理（心跳阈值、retryOperation、RMW 合并降级、离线队列、后台同步退避）
 * 全部沦为死代码，表现为保存按钮转圈、isOnline() 失真、离线队列高位不降。
 *
 * 现策略：**传输层有界、快速失败、错误码保真；持久重试交给离线队列 / backgroundSync**。
 * 见 `docs/OFFLINE_SYSTEM.md` 与 `src/axios/axios.js`。
 */

/** 可重试的 axios / 网络错误码 */
export const RETRYABLE_ERROR_CODES = [
  'ECONNABORTED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ENETUNREACH',
  'ECONNRESET',
  'EAI_AGAIN',
  'ERR_NETWORK',
]

/** 可重试的 HTTP 状态码 */
export const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504]

/**
 * 交互请求（用户点保存 / 页面加载数据）默认策略。
 * 预算 12s 小于单次请求超时 15s：即「请求整体超时后不再重试」，
 * 这样 UI 最坏等待时间有界（约 15s），而不是几分钟。
 */
export const DEFAULT_RETRY_POLICY = Object.freeze({
  maxAttempts: 2,
  baseDelayMs: 500,
  maxDelayMs: 4000,
  budgetMs: 12000,
})

/** 心跳：单次尝试，失败即计数；下一次 30s 心跳就是它的重试 */
export const HEARTBEAT_RETRY_POLICY = Object.freeze({
  ...DEFAULT_RETRY_POLICY,
  maxAttempts: 1,
})

/**
 * 后台同步 / 队列上传：可以慢一些，但仍必须有界。
 * ⚠️ 目前尚无调用方接入（backgroundSync 仍走默认交互策略），接入属于批次 3；
 * 在此之前不要把它当成已生效的行为。
 */
export const BACKGROUND_RETRY_POLICY = Object.freeze({
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  budgetMs: 45000,
})

/** 硬上限：任何调用方都不能把单请求尝试次数配到失控 */
export const MAX_ATTEMPTS_LIMIT = 5

const clampInt = (value, min, max, fallback) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(Math.max(Math.trunc(num), min), max)
}

/**
 * 归一化策略对象：任何缺省字段都回落到默认值，并夹在安全区间内。
 * @param {object} [policy]
 * @returns {{maxAttempts:number, baseDelayMs:number, maxDelayMs:number, budgetMs:number}}
 */
export function resolveRetryPolicy(policy) {
  const source = policy || {}
  return {
    maxAttempts: clampInt(
      source.maxAttempts,
      1,
      MAX_ATTEMPTS_LIMIT,
      DEFAULT_RETRY_POLICY.maxAttempts,
    ),
    baseDelayMs: clampInt(source.baseDelayMs, 0, 60000, DEFAULT_RETRY_POLICY.baseDelayMs),
    maxDelayMs: clampInt(source.maxDelayMs, 0, 300000, DEFAULT_RETRY_POLICY.maxDelayMs),
    budgetMs: clampInt(source.budgetMs, 0, 600000, DEFAULT_RETRY_POLICY.budgetMs),
  }
}

/**
 * 该错误是否属于「重试有意义」的瞬时故障。
 * 注意：401/403/400/404 等业务拒绝不在此列——它们必须快速失败并把错误码原样交给上层。
 * @param {any} error
 * @returns {boolean}
 */
export function isRetryableError(error) {
  if (!error) return false

  if (error.code && RETRYABLE_ERROR_CODES.includes(error.code)) {
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

/**
 * 解析 429 的等待时间：优先 Retry-After 头，其次 RateLimit reset 字段。
 * @param {any} error
 * @param {number} [now]
 * @returns {number|null} 毫秒；无法判定时返回 null
 */
export function getRateLimitDelayMs(error, now = Date.now()) {
  if (!error?.response || error.response.status !== 429) return null

  const retryAfter = error.response.headers?.['retry-after']
  if (retryAfter !== undefined && retryAfter !== null && retryAfter !== '') {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
    const asDate = Date.parse(retryAfter)
    if (Number.isFinite(asDate)) return Math.max(0, asDate - now)
  }

  return null
}

/**
 * 指数退避：base * 2^(attempt-1)，上限 maxDelayMs。
 * @param {number} attempt 已失败的尝试次数（>=1）
 * @param {{baseDelayMs:number, maxDelayMs:number}} policy
 * @returns {number}
 */
export function computeBackoffMs(attempt, policy) {
  const resolved = resolveRetryPolicy(policy)
  const exponent = Math.max(0, attempt - 1)
  const raw = resolved.baseDelayMs * Math.pow(2, exponent)
  return Math.min(raw, resolved.maxDelayMs)
}

/**
 * 重试决策。
 * @param {object} params
 * @param {any} params.error
 * @param {number} params.attempt 已完成的尝试次数（首次请求失败后为 1）
 * @param {number} [params.elapsedMs] 本次请求已耗时（含此前尝试）
 * @param {number} [params.rateLimitDelayMs] 外部（如 RateLimit 头解析器）给出的等待时间
 * @param {object} [params.policy]
 * @param {number} [params.now]
 * @returns {{retry:boolean, delayMs:number, reason:string}}
 */
export function planRetry({
  error,
  attempt,
  elapsedMs = 0,
  rateLimitDelayMs = null,
  policy,
  now = Date.now(),
}) {
  const resolved = resolveRetryPolicy(policy)

  if (!isRetryableError(error)) {
    return { retry: false, delayMs: 0, reason: 'not-retryable' }
  }
  if (attempt >= resolved.maxAttempts) {
    return { retry: false, delayMs: 0, reason: 'attempts-exhausted' }
  }
  if (elapsedMs >= resolved.budgetMs) {
    return { retry: false, delayMs: 0, reason: 'budget-exhausted' }
  }

  const headerDelay = getRateLimitDelayMs(error, now)
  const externalDelay = Number.isFinite(rateLimitDelayMs) ? Math.max(0, rateLimitDelayMs) : null

  // 限速等待时间不受 maxDelayMs 截断（截断会导致提前重试、再被限速），
  // 但必须受预算约束，否则等于把「无限重试」从延时换成等待。
  const throttledDelay = headerDelay ?? externalDelay
  const delayMs = throttledDelay !== null ? throttledDelay : computeBackoffMs(attempt, resolved)

  if (elapsedMs + delayMs >= resolved.budgetMs) {
    return { retry: false, delayMs: 0, reason: 'budget-exhausted' }
  }

  return { retry: true, delayMs, reason: 'retry' }
}
