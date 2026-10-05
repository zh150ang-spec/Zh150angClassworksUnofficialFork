import { describe, it, expect, vi, beforeEach } from 'vitest'

// 跨标签锁的核心不变量：
// 1. 拿到锁后 acquireLock 必须**立即返回**（否则调用方要等到锁释放才能真正开始工作）；
// 2. 租约超时只"通知"调用方停手，**不得**替调用方释放锁；
// 3. 锁被其他标签页占用时返回 null，不排队、不阻塞。

const { acquireLock } = await import('@/utils/crossTabLock')

function createFakeLocks() {
  const state = { held: false, holder: null, options: [] }
  const request = vi.fn(async (name, options, callback) => {
    state.options.push(options)
    if (options?.ifAvailable && state.held) {
      return callback(null)
    }
    state.held = true
    state.holder = name
    try {
      return await callback({ name })
    } finally {
      state.held = false
      state.holder = null
    }
  })
  return { request, state }
}

function stubLocks(locks) {
  vi.stubGlobal('navigator', locks ? { onLine: true, locks } : { onLine: true })
}

describe('acquireLock 租约语义', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('拿到锁后立即返回，且此时锁仍被持有（负向：修复前会一直等到锁释放）', async () => {
    const { request, state } = createFakeLocks()
    stubLocks({ request })

    const outcome = await Promise.race([
      acquireLock('sync', { timeoutMs: 30000 }).then((lease) => (lease ? 'acquired' : 'null')),
      new Promise((resolve) => setTimeout(() => resolve('pending'), 200)),
    ])

    expect(outcome).toBe('acquired')
    expect(state.held).toBe(true)
  })

  it('不把 AbortSignal 交给 Web Locks（避免浏览器在超时时替我们释放锁）', async () => {
    const { request, state } = createFakeLocks()
    stubLocks({ request })

    const lease = await acquireLock('sync', { timeoutMs: 30000 })

    expect(state.options[0].signal).toBeUndefined()
    expect(lease.signal.aborted).toBe(false)
  })

  it('锁被其他标签页占用时返回 null', async () => {
    const { request, state } = createFakeLocks()
    state.held = true
    stubLocks({ request })

    await expect(acquireLock('sync', { timeoutMs: 30000 })).resolves.toBe(null)
  })

  it('无 Web Locks 时降级为可用租约（不阻塞、不报错）', async () => {
    stubLocks(null)

    const lease = await acquireLock('sync', { timeoutMs: 30000 })

    expect(lease).not.toBe(null)
    expect(lease.signal.aborted).toBe(false)
    expect(lease.lost()).toBe(false)
    expect(() => lease.release()).not.toThrow()
  })

  it('超时只发中止信号 + 回调 onLeaseLost，锁必须仍然被持有（负向：假租约）', async () => {
    vi.useFakeTimers()
    const { request, state } = createFakeLocks()
    stubLocks({ request })
    const onLeaseLost = vi.fn()

    const lease = await acquireLock('sync', { timeoutMs: 30000, graceMs: 60000, onLeaseLost })
    expect(state.held).toBe(true)

    await vi.advanceTimersByTimeAsync(30000)

    expect(lease.signal.aborted).toBe(true)
    expect(lease.lost()).toBe(true)
    expect(onLeaseLost).toHaveBeenCalledWith('timeout')
    // 关键：调用方还没停手，锁就不能被释放
    expect(state.held).toBe(true)
  })

  it('调用方停手后 release 才真正释放锁，重复调用安全', async () => {
    vi.useFakeTimers()
    const { request, state } = createFakeLocks()
    stubLocks({ request })

    const lease = await acquireLock('sync', { timeoutMs: 30000, graceMs: 60000 })
    await vi.advanceTimersByTimeAsync(30000)
    expect(state.held).toBe(true)

    lease.release()
    await vi.advanceTimersByTimeAsync(0)
    expect(state.held).toBe(false)
    expect(() => lease.release()).not.toThrow()
  })

  it('宽限期内仍未释放时强制释放，避免锁永久泄漏', async () => {
    vi.useFakeTimers()
    const { request, state } = createFakeLocks()
    stubLocks({ request })

    await acquireLock('sync', { timeoutMs: 1000, graceMs: 500 })
    await vi.advanceTimersByTimeAsync(1000)
    expect(state.held).toBe(true)

    await vi.advanceTimersByTimeAsync(500)
    expect(state.held).toBe(false)
  })
})
