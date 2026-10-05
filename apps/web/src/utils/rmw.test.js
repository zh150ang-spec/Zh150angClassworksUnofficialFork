import { describe, it, expect, vi, beforeEach } from 'vitest'

// RMW 的保护对象是「云端已有数据」。这里的核心不变量是 fail-closed：
// 读不到 ≠ 云端没有；只有确认 404（键不存在）才允许直接写入。
vi.mock('@/utils/providers/kvServerProvider', () => ({
  kvServerProvider: { loadData: vi.fn(), saveData: vi.fn() },
}))

const { rmwWriteServer } = await import('@/utils/rmw')

const notFound = () => ({ success: false, error: { code: 'NOT_FOUND', message: '数据不存在' } })
const netError = () => ({
  success: false,
  error: { code: 'NETWORK_ERROR', message: '服务器连接失败', retryable: true },
})

function createProvider(loadResults, saveResult = { success: true }) {
  const provider = {
    loadData: vi.fn(),
    saveData: vi.fn().mockResolvedValue(saveResult),
  }
  for (const result of loadResults) {
    provider.loadData.mockResolvedValueOnce(result)
  }
  provider.loadData.mockResolvedValue(loadResults[loadResults.length - 1])
  return provider
}

describe('rmwWriteServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('读取成功时合并后写入，并回报冲突', async () => {
    const provider = createProvider([[{ id: 1, v: 'cloud' }]])
    const result = await rmwWriteServer('k', [{ id: 1, v: 'local' }, { id: 2 }], provider)

    expect(result.success).toBe(true)
    expect(provider.loadData).toHaveBeenCalledTimes(1)
    expect(provider.saveData).toHaveBeenCalledTimes(1)
    const written = provider.saveData.mock.calls[0][1]
    expect(written).toHaveLength(2)
    expect(written.map((i) => i.id).sort()).toEqual([1, 2])
    expect(result.conflicts).toHaveLength(1)
  })

  it('内容完全一致时短路，不重复写入', async () => {
    const data = [{ id: 1, v: 'same' }]
    const provider = createProvider([JSON.parse(JSON.stringify(data))])
    const result = await rmwWriteServer('k', data, provider)

    expect(result).toEqual({ success: true, skipped: true })
    expect(provider.saveData).not.toHaveBeenCalled()
  })

  it('键确实不存在（404）时允许新建写入', async () => {
    const provider = createProvider([notFound()])
    const result = await rmwWriteServer('k', { fresh: true }, provider)

    expect(result.success).toBe(true)
    expect(provider.saveData).toHaveBeenCalledTimes(1)
    expect(provider.saveData.mock.calls[0][1]).toEqual({ fresh: true })
  })

  it('读取失败时拒绝覆盖云端（负向：修复前这里会直接把云端冲掉）', async () => {
    const provider = createProvider([netError()])
    const result = await rmwWriteServer('k', { local: true }, provider)

    expect(result.success).toBe(false)
    expect(result.error.code).toBe('SERVER_READ_FAILED')
    expect(result.error.retryable).toBe(true)
    expect(provider.saveData).not.toHaveBeenCalled()
  })

  it('provider 未返回任何内容时同样 fail-closed', async () => {
    const provider = createProvider([undefined])
    const result = await rmwWriteServer('k', { local: true }, provider)

    expect(result.success).toBe(false)
    expect(result.error.code).toBe('SERVER_READ_FAILED')
    expect(provider.saveData).not.toHaveBeenCalled()
  })

  it('写入失败时按 RMW_MAX_RETRIES 重试后返回 SERVER_SAVE_ERROR', async () => {
    const provider = createProvider([{ id: 1, v: 'cloud' }], {
      success: false,
      error: { code: 'SAVE_ERROR', message: '保存失败' },
    })
    const result = await rmwWriteServer('k', { id: 2 }, provider)

    expect(result.success).toBe(false)
    expect(result.error.code).toBe('SERVER_SAVE_ERROR')
    // 1 次原始 + 2 次重试
    expect(provider.saveData).toHaveBeenCalledTimes(3)
  })
})
