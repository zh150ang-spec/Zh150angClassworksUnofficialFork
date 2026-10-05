import { describe, it, expect, vi, beforeEach } from 'vitest'

// 后台同步必须显式携带专用重试策略与租约 signal。
// 一旦有人漏传，下面的断言会失败——避免"定义了策略却没人用"的假修复再次发生。

vi.mock('@/axios/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

vi.mock('@/utils/dataProvider', () => ({
  formatResponse: (data) => data,
  formatError: (message, code) => ({ success: false, error: { code, message } }),
}))

vi.mock('@/utils/settings', () => ({
  getSetting: vi.fn(),
  setSetting: vi.fn(),
}))

vi.mock('@/utils/serverRotation', () => ({
  isRotationEnabled: vi.fn(() => false),
  tryWithRotation: vi.fn(),
}))

const axios = (await import('@/axios/axios')).default
const { getSetting } = await import('@/utils/settings')
const { isRotationEnabled } = await import('@/utils/serverRotation')
const { kvServerProvider } = await import('@/utils/providers/kvServerProvider')
const { BACKGROUND_RETRY_POLICY } = await import('@/utils/netRetryPolicy')

describe('kvServerProvider 请求级选项', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSetting.mockImplementation((key) => {
      if (key === 'server.domain') return 'https://kv.example.com'
      return undefined
    })
    isRotationEnabled.mockReturnValue(false)
    axios.get.mockResolvedValue({ data: { ok: true } })
    axios.post.mockResolvedValue({ data: { ok: true } })
  })

  it('loadData 透传 retryPolicy 与 signal', async () => {
    const controller = new AbortController()

    await kvServerProvider.loadData('board', {
      retryPolicy: BACKGROUND_RETRY_POLICY,
      signal: controller.signal,
    })

    const [url, config] = axios.get.mock.calls[0]
    expect(url).toBe('https://kv.example.com/kv/board')
    expect(config.metadata.retryPolicy).toEqual(BACKGROUND_RETRY_POLICY)
    expect(config.signal).toBe(controller.signal)
  })

  it('saveData 透传 retryPolicy 与 signal', async () => {
    const controller = new AbortController()

    await kvServerProvider.saveData(
      'board',
      { a: 1 },
      {
        retryPolicy: BACKGROUND_RETRY_POLICY,
        signal: controller.signal,
      },
    )

    const [, , config] = axios.post.mock.calls[0]
    expect(config.metadata.retryPolicy).toEqual(BACKGROUND_RETRY_POLICY)
    expect(config.signal).toBe(controller.signal)
  })

  it('loadKeys 把请求级选项与查询选项分开传（查询选项不被当策略）', async () => {
    const controller = new AbortController()

    await kvServerProvider.loadKeys(
      { limit: 50, skip: 100 },
      { retryPolicy: BACKGROUND_RETRY_POLICY, signal: controller.signal },
    )

    const [url, config] = axios.get.mock.calls[0]
    expect(url).toContain('limit=50')
    expect(url).toContain('skip=100')
    expect(config.metadata.retryPolicy).toEqual(BACKGROUND_RETRY_POLICY)
    expect(config.signal).toBe(controller.signal)
  })

  it('不传选项时保持原行为（不注入 metadata / signal，走默认交互策略）', async () => {
    await kvServerProvider.loadData('board')

    const [, config] = axios.get.mock.calls[0]
    expect(config.metadata).toBeUndefined()
    expect(config.signal).toBeUndefined()
  })
})
