import { describe, it, expect, vi } from 'vitest'

// Service Worker 安装时**不得**自动接管。
// 一旦有人把 self.skipWaiting() 放回 install，页面（教室大屏）会在发版后无提示刷新，这条用例必须立刻失败。

vi.mock('workbox-precaching', () => ({
  precacheAndRoute: vi.fn(),
  cleanupOutdatedCaches: vi.fn(),
}))
vi.mock('workbox-routing', () => ({
  registerRoute: vi.fn(),
  setCatchHandler: vi.fn(),
  NavigationRoute: class NavigationRoute {},
}))
vi.mock('workbox-strategies', () => ({
  NetworkFirst: class NetworkFirst {},
  StaleWhileRevalidate: class StaleWhileRevalidate {},
  CacheFirst: class CacheFirst {},
}))
vi.mock('workbox-expiration', () => ({ ExpirationPlugin: class ExpirationPlugin {} }))
vi.mock('workbox-cacheable-response', () => ({ CacheableResponsePlugin: class {} }))

const ORIGIN = 'https://app.example.com'
const listeners = new Map()
const skipWaiting = vi.fn().mockResolvedValue(undefined)
const claim = vi.fn().mockResolvedValue(undefined)

vi.stubGlobal('self', {
  addEventListener: (type, handler) => {
    const list = listeners.get(type) || []
    list.push(handler)
    listeners.set(type, list)
  },
  skipWaiting,
  clients: { claim },
  location: { origin: ORIGIN },
  registration: { scope: '/' },
  __WB_MANIFEST: [],
})

await import('@/sw.js')

const dispatch = async (type, event = {}) => {
  const waits = []
  for (const handler of listeners.get(type) || []) {
    const result = handler({
      origin: ORIGIN,
      waitUntil: (promise) => {
        waits.push(promise)
        return promise
      },
      ...event,
    })
    if (result && typeof result.then === 'function') waits.push(result)
  }
  await Promise.all(waits)
}

describe('sw.js 更新时序', () => {
  it('install 阶段不得自动接管（负向：修复前这里调用 skipWaiting）', async () => {
    skipWaiting.mockClear()

    await dispatch('install')

    expect(skipWaiting).not.toHaveBeenCalled()
  })

  it('只有收到 SKIP_WAITING 消息才接管', async () => {
    skipWaiting.mockClear()

    await dispatch('message', { data: { type: 'SKIP_WAITING' }, ports: [] })

    expect(skipWaiting).toHaveBeenCalledTimes(1)
  })

  it('跨源消息不得触发接管', async () => {
    skipWaiting.mockClear()

    await dispatch('message', {
      data: { type: 'SKIP_WAITING' },
      origin: 'https://evil.example.com',
      ports: [],
    })

    expect(skipWaiting).not.toHaveBeenCalled()
  })

  it('activate 阶段仍会 claim（用户确认更新后接管已打开的页面）', async () => {
    claim.mockClear()
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(true),
    })

    await dispatch('activate')

    expect(claim).toHaveBeenCalled()
  })
})
