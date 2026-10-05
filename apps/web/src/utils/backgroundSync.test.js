import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 退避是"失败回合"的状态，不能被每次编辑重置。
// 这里断言的是**阶梯真的在爬**（30s → 60s），而不是"每次都是 30s"。

vi.mock('@/utils/settings', () => ({
  getSetting: vi.fn(),
  setSetting: vi.fn(),
}))

vi.mock('@/utils/crossTabLock', () => ({
  acquireLock: vi.fn(),
}))

vi.mock('@/utils/providers/kvLocalProvider', () => ({
  kvLocalProvider: {
    getOfflineQueue: vi.fn(),
    loadData: vi.fn(),
    loadKeys: vi.fn(),
    saveData: vi.fn(),
    removeFromOfflineQueue: vi.fn(),
  },
}))

vi.mock('@/utils/providers/kvServerProvider', () => ({
  kvServerProvider: {
    loadData: vi.fn(),
    saveData: vi.fn(),
    loadKeys: vi.fn(),
  },
}))

vi.mock('@/utils/rmw', () => ({
  rmwWriteServer: vi.fn(),
}))

vi.mock('@/utils/networkStatus', () => ({
  networkStatus: {
    isBrowserOnline: () => true,
    isOnline: () => true,
    markServerReachable: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    getEffectiveStatus: () => ({ browserOnline: true, serverReachable: true }),
  },
}))

vi.mock('@/utils/syncHelpers', () => ({
  loadAllKeys: vi.fn(),
  // 真实实现会并发跑 worker；测试里顺序跑，保证 worker 真的被执行（否则阶段是空转）
  runWithConcurrency: vi.fn(async (items, _concurrency, worker) => {
    const results = []
    for (const item of items || []) {
      results.push(await worker(item))
    }
    return results
  }),
  SYNC_CONCURRENCY: 5,
}))

const { getSetting } = await import('@/utils/settings')
const { acquireLock } = await import('@/utils/crossTabLock')
const { kvLocalProvider } = await import('@/utils/providers/kvLocalProvider')
const { kvServerProvider } = await import('@/utils/providers/kvServerProvider')
const { rmwWriteServer } = await import('@/utils/rmw')
const { loadAllKeys } = await import('@/utils/syncHelpers')
const { BACKGROUND_RETRY_POLICY } = await import('@/utils/netRetryPolicy')
const backgroundSync = (await import('@/utils/backgroundSync')).default

const QUEUE_ITEM = { id: 1, key: 'classworks-data-2026-01-01' }

describe('backgroundSync 退避与租约', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    getSetting.mockImplementation((key) => {
      if (key === 'server.provider') return 'dual-cloud'
      if (key === 'sync.enabled') return true
      if (key === 'sync.minInterval') return 600
      if (key === 'sync.maxInterval') return 1200
      return undefined
    })
    kvLocalProvider.getOfflineQueue.mockResolvedValue({ success: true, data: [QUEUE_ITEM] })
    kvServerProvider.loadKeys.mockResolvedValue({ success: true, keys: [] })
    kvLocalProvider.loadKeys.mockResolvedValue({ success: true, keys: [] })
    // 默认：锁被其他标签页占用 → 本次同步直接跳过，只观察退避状态机
    acquireLock.mockResolvedValue(null)
    backgroundSync.stop()
    backgroundSync._resetImmediateBackoff()
  })

  afterEach(() => {
    backgroundSync.stop()
    vi.useRealTimers()
  })

  it('持续编辑不会重置退避阶梯，也不会每次编辑都打服务器（负向：旧实现退避恒为 30s）', async () => {
    backgroundSync.scheduleImmediate()
    await vi.advanceTimersByTimeAsync(0)
    expect(backgroundSync.getStatus().immediateAttempts).toBe(1)
    const callsAfterFirstRound = kvLocalProvider.getOfflineQueue.mock.calls.length

    // 模拟持续编辑：5 次触发都落在 10s 去抖窗口内 → 被吸收，不重置状态、不额外打服务器
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(1000)
      backgroundSync.scheduleImmediate()
    }
    expect(backgroundSync.getStatus().immediateAttempts).toBe(1)
    expect(kvLocalProvider.getOfflineQueue.mock.calls.length).toBe(callsAfterFirstRound)

    // 第 1 级退避（30s）到期 → 进入第 2 级（下一级等待 60s）
    await vi.advanceTimersByTimeAsync(26000)
    expect(backgroundSync.getStatus().immediateAttempts).toBe(2)

    // 距离上次同步已超过 10s，再来一次编辑 → 立刻补跑。
    // 关键负向断言：阶梯必须继续爬到第 3 级（旧实现会把 attempts 归零，这里会是 1）
    await vi.advanceTimersByTimeAsync(15000)
    backgroundSync.scheduleImmediate()
    await vi.advanceTimersByTimeAsync(0)
    expect(backgroundSync.getStatus().immediateAttempts).toBe(3)

    // 立刻补跑时必须清掉待跑的退避定时器，否则会叠加出重复同步
    const callsAfterThirdRound = kvLocalProvider.getOfflineQueue.mock.calls.length
    await vi.advanceTimersByTimeAsync(70000)
    expect(kvLocalProvider.getOfflineQueue.mock.calls.length).toBe(callsAfterThirdRound)
  })

  it('租约有效时会真正执行同步阶段（对照：证明下面的"停手"用例不是空跑）', async () => {
    const controller = new AbortController()
    const release = vi.fn()
    acquireLock.mockResolvedValue({
      release,
      signal: controller.signal,
      lost: () => false,
      lostReason: () => null,
    })
    loadAllKeys.mockResolvedValue({ success: true, keys: [] })

    await backgroundSync.forceSyncNow()

    expect(kvLocalProvider.getOfflineQueue).toHaveBeenCalled()
    expect(loadAllKeys).toHaveBeenCalled()
    expect(release).toHaveBeenCalled()
  })

  it('云端键列表请求携带专用重试策略与租约 signal（查询选项与请求选项分开传）', async () => {
    const controller = new AbortController()
    acquireLock.mockResolvedValue({
      release: vi.fn(),
      signal: controller.signal,
      lost: () => false,
      lostReason: () => null,
    })
    kvServerProvider.loadKeys.mockResolvedValue({ success: true, keys: [] })
    loadAllKeys.mockImplementation(async (fetcher) => {
      await fetcher({ limit: 10, skip: 0 })
      return { success: true, keys: [] }
    })

    await backgroundSync.forceSyncNow()

    expect(kvServerProvider.loadKeys).toHaveBeenCalled()
    const [queryOptions, requestOptions] = kvServerProvider.loadKeys.mock.calls[0]
    expect(queryOptions).toEqual({ limit: 10, skip: 0 })
    expect(requestOptions.retryPolicy).toEqual(BACKGROUND_RETRY_POLICY)
    expect(requestOptions.signal).toBe(controller.signal)
  })

  it('上行（离线队列）请求携带后台策略与租约 signal（负向：漏传即为假修复）', async () => {
    const controller = new AbortController()
    acquireLock.mockResolvedValue({
      release: vi.fn(),
      signal: controller.signal,
      lost: () => false,
      lostReason: () => null,
    })
    loadAllKeys.mockResolvedValue({ success: true, keys: [] })
    kvLocalProvider.loadData.mockResolvedValue({ success: true, data: { v: 1 } })
    rmwWriteServer.mockResolvedValue({ success: true })

    await backgroundSync.forceSyncNow()

    expect(rmwWriteServer).toHaveBeenCalled()
    const args = rmwWriteServer.mock.calls[0]
    expect(args[2]).toBe(kvServerProvider)
    expect(args[3].retryPolicy).toEqual(BACKGROUND_RETRY_POLICY)
    expect(args[3].retryPolicy.maxAttempts).toBe(3)
    expect(args[3].retryPolicy.budgetMs).toBe(45000)
    expect(args[3].signal).toBe(controller.signal)
  })

  it('下行（云端独有键）请求携带后台策略与租约 signal', async () => {
    const controller = new AbortController()
    acquireLock.mockResolvedValue({
      release: vi.fn(),
      signal: controller.signal,
      lost: () => false,
      lostReason: () => null,
    })
    // 先离线队列为空，然后云端有、本地没有
    kvLocalProvider.getOfflineQueue.mockResolvedValue({ success: true, data: [] })
    loadAllKeys
      .mockResolvedValueOnce({ success: true, keys: ['cloud-only'] })
      .mockResolvedValueOnce({ success: true, keys: [] })
    kvServerProvider.loadData.mockResolvedValue({ success: true, data: { v: 2 } })

    await backgroundSync.forceSyncNow()

    expect(kvServerProvider.loadData).toHaveBeenCalled()
    const [key, requestOptions] = kvServerProvider.loadData.mock.calls[0]
    expect(key).toBe('cloud-only')
    expect(requestOptions.retryPolicy).toEqual(BACKGROUND_RETRY_POLICY)
    expect(requestOptions.signal).toBe(controller.signal)
  })

  it('租约失效后立即停手，并释放锁（不发起新的同步请求）', async () => {
    const controller = new AbortController()
    controller.abort()
    const release = vi.fn()
    acquireLock.mockResolvedValue({
      release,
      signal: controller.signal,
      lost: () => true,
      lostReason: () => 'timeout',
    })

    await backgroundSync.forceSyncNow()

    expect(kvLocalProvider.getOfflineQueue).not.toHaveBeenCalled()
    expect(loadAllKeys).not.toHaveBeenCalled()
    expect(kvServerProvider.loadKeys).not.toHaveBeenCalled()
    expect(release).toHaveBeenCalled()
  })

  it('forceSyncNow 开启新的失败回合，退避归零', async () => {
    backgroundSync.scheduleImmediate()
    await vi.advanceTimersByTimeAsync(0)
    expect(backgroundSync.getStatus().immediateAttempts).toBe(1)

    await backgroundSync.forceSyncNow()

    expect(backgroundSync.getStatus().immediateAttempts).toBe(0)
  })
})
