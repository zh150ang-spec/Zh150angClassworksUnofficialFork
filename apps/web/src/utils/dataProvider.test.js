import { describe, it, expect, vi, beforeEach } from 'vitest'

// 这一组用例守护两个不变量：
// 1. 错误码保真：只有确证的 NOT_FOUND 才能变成「数据不存在」；
// 2. 全局离线状态只由心跳决定：单次业务失败不得把整个应用翻成离线。

vi.mock('@/utils/settings', () => ({
  getSetting: vi.fn(),
  setSetting: vi.fn(),
}))

vi.mock('@/utils/serverRotation', () => ({
  getEffectiveServerUrl: vi.fn(() => 'https://kv.example.com'),
  tryWithRotation: vi.fn(),
  isRotationEnabled: vi.fn(() => false),
}))

vi.mock('@/utils/providers/kvLocalProvider', () => ({
  kvLocalProvider: {
    loadData: vi.fn(),
    saveData: vi.fn(),
    loadKeys: vi.fn(),
    addToOfflineQueue: vi.fn(),
    removeKeyFromOfflineQueue: vi.fn(),
    removeFromOfflineQueue: vi.fn(),
    getOfflineQueue: vi.fn(),
    getOfflineQueueCount: vi.fn(),
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
  computeDataHash: (data) => JSON.stringify(data),
}))

vi.mock('@/utils/backgroundSync', () => ({
  default: { scheduleImmediate: vi.fn() },
}))

vi.mock('@/utils/message', () => ({
  default: { warning: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const { getSetting } = await import('@/utils/settings')
const { kvLocalProvider } = await import('@/utils/providers/kvLocalProvider')
const { kvServerProvider } = await import('@/utils/providers/kvServerProvider')
const { rmwWriteServer } = await import('@/utils/rmw')
const backgroundSync = (await import('@/utils/backgroundSync')).default
const dataProvider = (await import('@/utils/dataProvider')).default
const { networkStatus } = await import('@/utils/networkStatus')
const { getSpooledCount, clearSpool } = await import('@/utils/pendingWriteSpool')

const notFound = () => ({ success: false, error: { code: 'NOT_FOUND', message: '数据不存在' } })
const networkError = () => ({
  success: false,
  error: { code: 'NETWORK_ERROR', message: '服务器连接失败', retryable: true },
})

const useProvider = (provider) => {
  getSetting.mockImplementation((key) => (key === 'server.provider' ? provider : undefined))
}

describe('dataProvider.loadData 错误码保真', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearSpool()
    kvLocalProvider.addToOfflineQueue.mockResolvedValue({ success: true })
    kvLocalProvider.removeKeyFromOfflineQueue.mockResolvedValue({ success: true })
    networkStatus.markServerReachable()
  })

  it('云端故障时必须原样上抛错误码，不得变成「数据不存在」', async () => {
    useProvider('classworkscloud')
    kvServerProvider.loadData.mockResolvedValue(networkError())

    const result = await dataProvider.loadData('board')

    expect(result.success).toBe(false)
    expect(result.error.code).toBe('NETWORK_ERROR')
    // 负向：修复前 retryOperation 隐式返回 undefined，这里会变成 DATA_NOT_FOUND
    expect(result.error.code).not.toBe('DATA_NOT_FOUND')
  })

  it('云端确认不存在时保留 NOT_FOUND', async () => {
    useProvider('classworkscloud')
    kvServerProvider.loadData.mockResolvedValue(notFound())

    const result = await dataProvider.loadData('board')

    expect(result.error.code).toBe('NOT_FOUND')
    expect(kvServerProvider.loadData).toHaveBeenCalledTimes(1)
  })

  it('可重试失败会重试 3 次，确定性结果（NOT_FOUND）不重试', async () => {
    useProvider('classworkscloud')
    kvServerProvider.loadData.mockResolvedValue(networkError())
    await dataProvider.loadData('board')
    expect(kvServerProvider.loadData).toHaveBeenCalledTimes(3)

    vi.clearAllMocks()
    kvServerProvider.loadData.mockResolvedValue(notFound())
    await dataProvider.loadData('board')
    expect(kvServerProvider.loadData).toHaveBeenCalledTimes(1)
  })

  it('双模式：两边都确认缺失才是 NOT_FOUND，一边故障则不是', async () => {
    useProvider('dual-cloud')
    kvLocalProvider.loadData.mockResolvedValue(notFound())
    kvServerProvider.loadData.mockResolvedValue(notFound())
    const bothMissing = await dataProvider.loadData('board')
    expect(bothMissing.error.code).toBe('NOT_FOUND')

    vi.clearAllMocks()
    kvLocalProvider.loadData.mockResolvedValue(notFound())
    kvServerProvider.loadData.mockResolvedValue(networkError())
    const serverBroken = await dataProvider.loadData('board')
    expect(serverBroken.error.code).toBe('DATA_UNAVAILABLE')
    // 负向：故障不得被上层当成「键不存在」而触发默认配置回退
    expect(serverBroken.error.code).not.toBe('NOT_FOUND')
  })
})

describe('dataProvider.saveData 离线状态与暂存', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearSpool()
    dataProvider.clearLocalWriteFailures()
    kvLocalProvider.saveData.mockResolvedValue({ success: true })
    kvLocalProvider.addToOfflineQueue.mockResolvedValue({ success: true })
    networkStatus.markServerReachable()
  })

  it('云端成功 + 本地失败：先原地重试一次，成功则不登记（P0-6）', async () => {
    useProvider('dual-cloud')
    kvLocalProvider.saveData.mockResolvedValueOnce({
      success: false,
      error: { code: 'LOCAL_SAVE_ERROR' },
    })
    rmwWriteServer.mockResolvedValue({ success: true })

    const result = await dataProvider.saveData('board', { homework: {} })

    expect(result).toEqual({ success: true, source: 'dual', localRetried: true })
    expect(dataProvider.getLocalWriteFailureCount()).toBe(0)
  })

  it('云端成功 + 本地重试仍失败：登记为本地副本写入异常（负向：旧实现完全静默）', async () => {
    useProvider('dual-cloud')
    kvLocalProvider.saveData.mockResolvedValue({
      success: false,
      error: { code: 'LOCAL_SAVE_ERROR' },
    })
    rmwWriteServer.mockResolvedValue({ success: true })

    const result = await dataProvider.saveData('board', { homework: {} })

    expect(result).toEqual({ success: true, source: 'cloud', localFailed: true })
    expect(dataProvider.getLocalWriteFailureCount()).toBe(1)
    expect(dataProvider.getLocalWriteFailures()[0].key).toBe('board')
    expect(dataProvider.getLocalWriteFailures()[0].count).toBeGreaterThan(0)
  })

  it('云端写失败 + 本地写成功：入队重试，并把整个应用标记为离线（产品要求）', async () => {
    useProvider('dual-cloud')
    const unreachableSpy = vi.spyOn(networkStatus, 'markServerUnreachable')
    rmwWriteServer.mockResolvedValue({
      success: false,
      error: { code: 'SERVER_READ_FAILED', message: '云端读取失败', retryable: true },
    })

    const result = await dataProvider.saveData('board', { homework: {} })

    expect(result).toEqual({ success: true, source: 'local', serverFailed: true })
    expect(kvLocalProvider.addToOfflineQueue).toHaveBeenCalledWith('board')
    expect(backgroundSync.scheduleImmediate).toHaveBeenCalled()
    // 写入失败 + 本地成功 = 立刻离线：后续保存走本地快路径，横幅告知"已保存到本地"
    expect(unreachableSpy).toHaveBeenCalled()
    expect(networkStatus.isServerReachable()).toBe(false)
    expect(networkStatus.isOnline()).toBe(false)
  })

  it('云端写抛错 + 本地写成功：同样标记离线（异常兜底分支）', async () => {
    useProvider('dual-cloud')
    const unreachableSpy = vi.spyOn(networkStatus, 'markServerUnreachable')
    rmwWriteServer.mockRejectedValue(new Error('boom'))

    const result = await dataProvider.saveData('board', { homework: {} })

    expect(result).toEqual({ success: true, source: 'local', serverFailed: true })
    expect(unreachableSpy).toHaveBeenCalled()
    expect(networkStatus.isOnline()).toBe(false)
  })

  it('云端单存储：可重试失败时暂存于本页并明确告知', async () => {
    useProvider('classworkscloud')
    rmwWriteServer.mockResolvedValue({
      success: false,
      error: { code: 'SERVER_SAVE_ERROR', message: '保存失败', retryable: true },
    })

    const result = await dataProvider.saveData('board', { homework: { a: 1 } })

    expect(result.success).toBe(false)
    expect(result.error.spooled).toBe(true)
    expect(getSpooledCount()).toBe(1)
  })

  it('云端单存储：确定性拒绝（401）不入暂存', async () => {
    useProvider('classworkscloud')
    rmwWriteServer.mockResolvedValue({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '认证失败', retryable: false },
    })

    const result = await dataProvider.saveData('board', { homework: { a: 1 } })

    expect(result.success).toBe(false)
    expect(result.error.code).toBe('UNAUTHORIZED')
    expect(getSpooledCount()).toBe(0)
  })
})

describe('useConfigDefaults 缺失判定', () => {
  it('云端故障不得被当成「键不存在」', async () => {
    useProvider('classworkscloud')
    kvServerProvider.loadData.mockResolvedValue(networkError())
    const { useConfigDefaults } = await import('@/composables/useConfigDefaults')
    const applyDefault = vi.fn()
    const { loadConfig } = useConfigDefaults({
      configKey: 'classworks-config-subject',
      kind: 'array',
    })

    const outcome = await loadConfig({ applyLoaded: vi.fn(), applyDefault })

    expect(outcome.result).toBe('error')
    expect(applyDefault).not.toHaveBeenCalled()
  })

  it('确证缺失（NOT_FOUND）时才回退默认配置', async () => {
    useProvider('classworkscloud')
    kvServerProvider.loadData.mockResolvedValue(notFound())
    const { useConfigDefaults } = await import('@/composables/useConfigDefaults')
    const applyDefault = vi.fn()
    const { loadConfig } = useConfigDefaults({
      configKey: 'classworks-config-subject',
      kind: 'array',
    })

    const outcome = await loadConfig({ applyLoaded: vi.fn(), applyDefault })

    expect(outcome.result).toBe('default')
    expect(applyDefault).toHaveBeenCalled()
  })
})
