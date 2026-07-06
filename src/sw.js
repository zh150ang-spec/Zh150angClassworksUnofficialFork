import {precacheAndRoute, cleanupOutdatedCaches} from 'workbox-precaching'
import {registerRoute, setCatchHandler, NavigationRoute} from 'workbox-routing'
import {NetworkFirst, StaleWhileRevalidate, CacheFirst} from 'workbox-strategies'
import {ExpirationPlugin} from 'workbox-expiration'
import {CacheableResponsePlugin} from 'workbox-cacheable-response'

const CACHE_VERSION = 'v2'
const PRECACHE_NAME = `precache-${CACHE_VERSION}`
const OFFLINE_DATA_CACHE = 'offline-data-cache'

const manifest = self.__WB_MANIFEST
precacheAndRoute(manifest)

cleanupOutdatedCaches()

self.addEventListener('install', () => {
  console.log('[SW] 安装中，版本:', CACHE_VERSION, '资源数量:', manifest?.length || 0)
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中，版本:', CACHE_VERSION)
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== PRECACHE_NAME && !name.startsWith('workbox-') && name !== OFFLINE_DATA_CACHE)
          .map((name) => {
            console.log('[SW] 删除旧缓存:', name)
            return caches.delete(name)
          })
      )
    }).then(() => {
      console.log('[SW] 已激活，接管所有客户端')
      return self.clients.claim()
    })
  )
})

const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'navigations',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24
      })
    ],
    networkTimeoutSeconds: 8
  }),
  {
    denylist: [/^\/api\//]
  }
)
registerRoute(navigationRoute)

registerRoute(
  ({url, sameOrigin}) => sameOrigin && url.pathname.startsWith('/assets/'),
  new CacheFirst({
    cacheName: 'assets-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 365
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ]
  })
)

// JS 文件缓存
registerRoute(
  /\.(?:js)$/i,
  new StaleWhileRevalidate({
    cacheName: 'js-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 7
      })
    ]
  })
)

// CSS 文件缓存
registerRoute(
  /\.(?:css)$/i,
  new StaleWhileRevalidate({
    cacheName: 'css-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 7
      })
    ]
  })
)

// HTML 文件缓存
registerRoute(
  /\.(?:html)$/i,
  new NetworkFirst({
    cacheName: 'html-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24
      })
    ]
  })
)

// 图片缓存
registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
  new StaleWhileRevalidate({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30
      })
    ]
  })
)

// CDN 缓存
registerRoute(
  /\/cdn-cgi\/.*/i,
  new NetworkFirst({
    cacheName: 'cdn-cgi-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24
      })
    ],
    networkTimeoutSeconds: 10
  })
)

// 外部资源缓存
registerRoute(
  ({url}) => url.origin !== self.location.origin,
  new NetworkFirst({
    cacheName: 'external-resources',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ],
    networkTimeoutSeconds: 10
  })
)

// 离线回退处理 - 捕获所有失败的导航请求
setCatchHandler(async ({request}) => {
  if (request.mode === 'navigate') {
    try {
      const cache = await caches.open(PRECACHE_NAME)
      const keys = await cache.keys()
      const indexKey = keys.find(key => key.url.endsWith('index.html') || key.url === self.location.origin + '/')
      if (indexKey) {
        const cachedResponse = await cache.match(indexKey)
        if (cachedResponse) {
          return cachedResponse
        }
      }
      const fallback = await caches.match('/index.html')
      if (fallback) {
        return fallback
      }
    } catch (error) {
      console.error('[SW] 离线回退失败:', error)
    }
    return new Response(`<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>离线</title></head>
<body style="background:#000;color:#f5f5f7;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
<div style="text-align:center;">
<h2>离线状态</h2>
<p>请检查网络连接后刷新页面</p>
<button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;cursor:pointer;background:#fff;border:none;border-radius:4px;">刷新页面</button>
</div>
</body>
</html>`, {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({'Content-Type': 'text/html; charset=utf-8'})
    })
  }
  
  if (request.destination === 'image') {
    return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#ddd" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="#999">离线</text></svg>', {
      headers: {'Content-Type': 'image/svg+xml'}
    })
  }
  
  return new Response('离线状态', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: new Headers({'Content-Type': 'text/plain; charset=utf-8'})
  })
})

const safePostMessage = (port, data) => {
  if (port && typeof port.postMessage === 'function') {
    try {
      port.postMessage(data)
    } catch (error) {
      console.error('发送消息失败:', error)
    }
  }
}

self.addEventListener('message', async (event) => {
  // 仅允许同源页面发消息，防止跨域 iframe 或被嵌入页面滥用 SW 缓存操作接口
  // 同源页面（含 MessageChannel 通信）的 event.origin 必然等于 self.location.origin，不影响正常功能
  if (event.origin !== self.location.origin) return
  if (!event.data || !event.data.type) return
  
  const port = event.ports[0]
  
  try {
    switch (event.data.type) {
      case 'CACHE_KEYS': {
        const cacheNames = await caches.keys()
        safePostMessage(port, { success: true, cacheNames })
        break
      }
      case 'CACHE_CONTENT': {
        const { cacheName } = event.data
        if (!cacheName) {
          safePostMessage(port, { success: false, error: '缺少缓存名称' })
          break
        }
        const cache = await caches.open(cacheName)
        const requests = await cache.keys()
        const urls = requests.map(request => request.url)
        safePostMessage(port, { success: true, cacheName, urls })
        break
      }
      case 'CLEAR_CACHE': {
        const { cacheName } = event.data
        if (!cacheName) {
          safePostMessage(port, { success: false, error: '缺少缓存名称' })
          break
        }
        const success = await caches.delete(cacheName)
        safePostMessage(port, { success, cacheName })
        break
      }
      case 'CLEAR_URL': {
        const { cacheName, url } = event.data
        if (!cacheName || !url) {
          safePostMessage(port, { success: false, error: '缺少缓存名称或URL' })
          break
        }
        const cache = await caches.open(cacheName)
        const success = await cache.delete(url)
        safePostMessage(port, { success, cacheName, url })
        break
      }
      case 'CLEAR_ALL_CACHES': {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
        safePostMessage(port, { success: true })
        break
      }
      case 'GET_VERSION': {
        safePostMessage(port, { 
          success: true, 
          version: manifest?.length || 0,
          timestamp: Date.now()
        })
        break
      }
      default:
        safePostMessage(port, { success: false, error: '未知的消息类型' })
    }
  } catch (error) {
    console.error('Service Worker 消息处理错误:', error)
    safePostMessage(port, { success: false, error: error.message || '处理失败' })
  }
})

self.addEventListener('error', (event) => {
  console.error('Service Worker 全局错误:', event.error)
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker 未处理的 Promise 拒绝:', event.reason)
})
