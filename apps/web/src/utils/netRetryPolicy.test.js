import { describe, it, expect } from 'vitest'
import {
  DEFAULT_RETRY_POLICY,
  HEARTBEAT_RETRY_POLICY,
  MAX_ATTEMPTS_LIMIT,
  resolveRetryPolicy,
  isRetryableError,
  getRateLimitDelayMs,
  computeBackoffMs,
  planRetry,
} from '@/utils/netRetryPolicy'

// 这些用例守护的核心不变量：
// 「传输层必须有界，且只有瞬时故障才重试」——一旦有人把无限重试改回来，
// 下面的 attempts-exhausted / budget-exhausted / not-retryable 用例会立刻失败。

const retryableError = (extra = {}) => ({
  code: 'ECONNABORTED',
  message: 'timeout of 15000ms exceeded',
  ...extra,
})

describe('resolveRetryPolicy', () => {
  it('缺省时回落到默认策略', () => {
    expect(resolveRetryPolicy()).toEqual({ ...DEFAULT_RETRY_POLICY })
    expect(resolveRetryPolicy(undefined)).toEqual({ ...DEFAULT_RETRY_POLICY })
  })

  it('把失控的尝试次数夹在安全区间内（负向：不允许无限次）', () => {
    // 断言绝对上限，而不是引用 MAX_ATTEMPTS_LIMIT 自身——否则把常量改大时用例会跟着“通过”
    expect(MAX_ATTEMPTS_LIMIT).toBeLessThanOrEqual(5)
    expect(resolveRetryPolicy({ maxAttempts: 999 }).maxAttempts).toBe(5)
    expect(resolveRetryPolicy({ maxAttempts: 0 }).maxAttempts).toBe(1)
    expect(resolveRetryPolicy({ maxAttempts: -5 }).maxAttempts).toBe(1)
    expect(resolveRetryPolicy({ maxAttempts: 'abc' }).maxAttempts).toBe(
      DEFAULT_RETRY_POLICY.maxAttempts,
    )
  })

  it('部分覆盖时保留其它默认值', () => {
    const policy = resolveRetryPolicy({ maxAttempts: 3 })
    expect(policy.maxAttempts).toBe(3)
    expect(policy.baseDelayMs).toBe(DEFAULT_RETRY_POLICY.baseDelayMs)
    expect(policy.budgetMs).toBe(DEFAULT_RETRY_POLICY.budgetMs)
  })

  it('心跳策略必须是单次尝试', () => {
    expect(HEARTBEAT_RETRY_POLICY.maxAttempts).toBe(1)
  })
})

describe('isRetryableError', () => {
  it('瞬时故障可重试', () => {
    expect(isRetryableError({ code: 'ECONNRESET' })).toBe(true)
    expect(isRetryableError({ response: { status: 503 } })).toBe(true)
    expect(isRetryableError({ response: { status: 429 } })).toBe(true)
    expect(isRetryableError({ message: 'Network Error' })).toBe(true)
    expect(isRetryableError({ code: 'ECONNABORTED' })).toBe(true)
  })

  it('业务拒绝不可重试（负向：401/403/404/400 不得进入重试）', () => {
    expect(isRetryableError({ response: { status: 401 } })).toBe(false)
    expect(isRetryableError({ response: { status: 403 } })).toBe(false)
    expect(isRetryableError({ response: { status: 404 } })).toBe(false)
    expect(isRetryableError({ response: { status: 400 } })).toBe(false)
    expect(isRetryableError(null)).toBe(false)
    expect(isRetryableError(undefined)).toBe(false)
  })
})

describe('computeBackoffMs', () => {
  it('按指数增长并受 maxDelayMs 截断', () => {
    const policy = { baseDelayMs: 500, maxDelayMs: 4000 }
    expect(computeBackoffMs(1, policy)).toBe(500)
    expect(computeBackoffMs(2, policy)).toBe(1000)
    expect(computeBackoffMs(3, policy)).toBe(2000)
    expect(computeBackoffMs(4, policy)).toBe(4000)
    expect(computeBackoffMs(10, policy)).toBe(4000)
  })
})

describe('getRateLimitDelayMs', () => {
  it('解析 Retry-After（秒）', () => {
    const error = { response: { status: 429, headers: { 'retry-after': '7' } } }
    expect(getRateLimitDelayMs(error)).toBe(7000)
  })

  it('非 429 或无头信息时返回 null', () => {
    expect(getRateLimitDelayMs({ response: { status: 500, headers: {} } })).toBe(null)
    expect(getRateLimitDelayMs({ response: { status: 429, headers: {} } })).toBe(null)
    expect(getRateLimitDelayMs({})).toBe(null)
  })
})

describe('planRetry', () => {
  it('首次失败且策略允许时重试一次', () => {
    const decision = planRetry({ error: retryableError(), attempt: 1 })
    expect(decision).toEqual({ retry: true, delayMs: 500, reason: 'retry' })
  })

  it('达到尝试上限后放弃（负向：不允许无限重试）', () => {
    const decision = planRetry({
      error: retryableError(),
      attempt: DEFAULT_RETRY_POLICY.maxAttempts,
    })
    expect(decision.retry).toBe(false)
    expect(decision.reason).toBe('attempts-exhausted')
  })

  it('超出预算后放弃（负向：超时请求不再叠加第二次尝试）', () => {
    const decision = planRetry({
      error: retryableError(),
      attempt: 1,
      elapsedMs: DEFAULT_RETRY_POLICY.budgetMs,
    })
    expect(decision.retry).toBe(false)
    expect(decision.reason).toBe('budget-exhausted')
  })

  it('不可重试的错误直接放弃', () => {
    const decision = planRetry({ error: { response: { status: 401 } }, attempt: 1 })
    expect(decision.retry).toBe(false)
    expect(decision.reason).toBe('not-retryable')
  })

  it('429 尊重 Retry-After，且不被 maxDelayMs 截断', () => {
    const error = { response: { status: 429, headers: { 'retry-after': '10' } } }
    const decision = planRetry({ error, attempt: 1 })
    expect(decision.retry).toBe(true)
    // 关键：10s > maxDelayMs(4000)。若被截断成 4s 会提前重试、再次被限速。
    expect(decision.delayMs).toBe(10000)
  })

  it('限速等待时间超出预算时不重试', () => {
    const error = { response: { status: 429, headers: { 'retry-after': '600' } } }
    const decision = planRetry({ error, attempt: 1 })
    expect(decision.retry).toBe(false)
    expect(decision.reason).toBe('budget-exhausted')
  })

  it('外部传入的等待时间优先于退避计算', () => {
    const decision = planRetry({
      error: retryableError({ response: undefined }),
      attempt: 1,
      rateLimitDelayMs: 1500,
    })
    expect(decision.delayMs).toBe(1500)
  })
})
