import { describe, it, expect, vi, beforeEach } from 'vitest'

// 云端单存储模式没有本地副本，传输层改为快速失败后必须保证：
// 可重试的写入失败不会让用户输入凭空消失，且补写顺序不乱、不并发打服务器。

vi.mock('@/axios/axios', () => ({
  default: { get: vi.fn() },
  isOnline: () => true,
  fetchWithOfflineCheck: vi.fn(),
}))

const { networkStatus } = await import('@/utils/networkStatus')
const { setSpoolFlushHandler, spoolWrite, flushSpool, getSpooledCount, clearSpool } =
  await import('@/utils/pendingWriteSpool')

describe('pendingWriteSpool', () => {
  beforeEach(() => {
    clearSpool()
    setSpoolFlushHandler(null)
    networkStatus.markServerReachable()
  })

  it('全部补写成功时清空暂存', async () => {
    const handler = vi.fn().mockResolvedValue({ success: true })
    setSpoolFlushHandler(handler)
    spoolWrite('a', 1)
    spoolWrite('b', 2)

    const result = await flushSpool()

    expect(result).toEqual({ flushed: 2, remaining: 0 })
    expect(handler).toHaveBeenCalledTimes(2)
    expect(getSpooledCount()).toBe(0)
  })

  it('第一项仍失败时停手并保留全部（负向：不得跳过失败项继续写）', async () => {
    const handler = vi.fn().mockResolvedValue({ success: false, error: { code: 'SAVE_ERROR' } })
    setSpoolFlushHandler(handler)
    spoolWrite('a', 1)
    spoolWrite('b', 2)

    const result = await flushSpool()

    expect(result).toEqual({ flushed: 0, remaining: 2 })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(getSpooledCount()).toBe(2)
  })

  it('同 key 重复暂存时后者覆盖前者', async () => {
    const handler = vi.fn().mockResolvedValue({ success: true })
    setSpoolFlushHandler(handler)
    spoolWrite('a', 1)
    spoolWrite('a', 2)

    expect(getSpooledCount()).toBe(1)
    await flushSpool()
    expect(handler).toHaveBeenCalledWith('a', 2)
  })

  it('离线时不补写', async () => {
    const handler = vi.fn().mockResolvedValue({ success: true })
    setSpoolFlushHandler(handler)
    spoolWrite('a', 1)
    vi.spyOn(networkStatus, 'isOnline').mockReturnValue(false)

    const result = await flushSpool()

    expect(result).toEqual({ flushed: 0, remaining: 1 })
    expect(handler).not.toHaveBeenCalled()
  })

  it('并发调用时后到的一次直接让路', async () => {
    let release
    const handler = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve
        }),
    )
    setSpoolFlushHandler(handler)
    spoolWrite('a', 1)

    const first = flushSpool()
    const second = await flushSpool()

    expect(second).toEqual({ flushed: 0, remaining: 1 })
    release({ success: true })
    await expect(first).resolves.toEqual({ flushed: 1, remaining: 0 })
  })

  it('离线转在线时自动补写', async () => {
    const handler = vi.fn().mockResolvedValue({ success: true })
    setSpoolFlushHandler(handler)
    spoolWrite('a', 1)

    networkStatus.markServerUnreachable()
    networkStatus.markServerReachable()
    await Promise.resolve()

    expect(handler).toHaveBeenCalledTimes(1)
    expect(getSpooledCount()).toBe(0)
  })
})
