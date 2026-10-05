import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 心跳是 serverReachable 的唯一权威。这里的用例保护三个不变量：
// 1. 只有「连续 2 次」心跳失败才判离线；
// 2. 单次业务失败（noteRequestFailure）绝不能翻转全局状态；
// 3. 心跳必须有在途守卫，不能每 30s 叠一条挂起的请求。

vi.mock('@/axios/axios', () => ({
  default: { get: vi.fn() },
  isOnline: () => true,
  fetchWithOfflineCheck: vi.fn(),
}))

const axios = (await import('@/axios/axios')).default
const { networkStatus } = await import('@/utils/networkStatus')

const HEARTBEAT_URL = 'https://kv.example.com/kv/_info'

describe('networkStatus 心跳', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    axios.get.mockReset()
    networkStatus.stopHeartbeat()
    networkStatus.markServerReachable()
  })

  afterEach(() => {
    networkStatus.stopHeartbeat()
    vi.useRealTimers()
  })

  it('连续 2 次心跳失败才判离线（第一次不影响状态）', async () => {
    axios.get.mockRejectedValue(new Error('Network Error'))
    networkStatus.startHeartbeat(HEARTBEAT_URL)
    await vi.advanceTimersByTimeAsync(0)

    expect(axios.get).toHaveBeenCalledTimes(1)
    expect(networkStatus.isServerReachable()).toBe(true)
    expect(networkStatus.getHeartbeatFailures()).toBe(1)

    await vi.advanceTimersByTimeAsync(30000)
    expect(axios.get).toHaveBeenCalledTimes(2)
    expect(networkStatus.isServerReachable()).toBe(false)
    expect(networkStatus.isOnline()).toBe(false)
  })

  it('心跳成功即恢复并清零失败计数', async () => {
    axios.get.mockRejectedValue(new Error('Network Error'))
    networkStatus.startHeartbeat(HEARTBEAT_URL)
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(30000)
    expect(networkStatus.isServerReachable()).toBe(false)

    axios.get.mockResolvedValue({ status: 200 })
    await vi.advanceTimersByTimeAsync(30000)
    expect(networkStatus.isServerReachable()).toBe(true)
    expect(networkStatus.getHeartbeatFailures()).toBe(0)
  })

  it('业务失败只作为证据，不翻转全局离线状态（负向：修复前会立刻判离线）', () => {
    const unreachableSpy = vi.spyOn(networkStatus, 'markServerUnreachable')
    networkStatus.noteRequestFailure()

    expect(unreachableSpy).not.toHaveBeenCalled()
    expect(networkStatus.isServerReachable()).toBe(true)
    expect(networkStatus.getLastRequestFailureAt()).toBeGreaterThan(0)
  })

  it('任意一次业务成功都把服务器判回可达', () => {
    axios.get.mockRejectedValue(new Error('Network Error'))
    networkStatus.startHeartbeat(HEARTBEAT_URL)
    return vi.advanceTimersByTimeAsync(0).then(() =>
      vi.advanceTimersByTimeAsync(30000).then(() => {
        expect(networkStatus.isServerReachable()).toBe(false)
        networkStatus.noteRequestSuccess()
        expect(networkStatus.isServerReachable()).toBe(true)
      }),
    )
  })

  it('心跳挂起时不再叠加新心跳（负向：修复前每 30s 增加一条挂起请求）', async () => {
    let releaseHeartbeat
    axios.get.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseHeartbeat = resolve
        }),
    )
    networkStatus.startHeartbeat(HEARTBEAT_URL)
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(30000 * 5)

    expect(axios.get).toHaveBeenCalledTimes(1)

    // 收尾：让挂起的心跳落地，清掉在途标志，避免污染后续用例
    releaseHeartbeat({ status: 200 })
    await vi.advanceTimersByTimeAsync(0)
  })

  it('心跳请求显式禁止重试（maxAttempts=1），失败必须立刻计数', async () => {
    axios.get.mockResolvedValue({ status: 200 })
    networkStatus.startHeartbeat(HEARTBEAT_URL)
    await vi.advanceTimersByTimeAsync(0)

    const [, config] = axios.get.mock.calls[0]
    expect(config.metadata.retryPolicy.maxAttempts).toBe(1)
    expect(config.timeout).toBe(5000)
  })
})
