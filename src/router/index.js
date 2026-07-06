/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */

// Composables
import {createRouter, createWebHistory} from 'vue-router/auto'
import {setupLayouts} from 'virtual:generated-layouts'
import {routes} from 'vue-router/auto-routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: setupLayouts(routes),
})

const DYNAMIC_RELOAD_KEY = 'vuetify:dynamic-reload'
const MAX_RELOAD_ATTEMPTS = 3
const RELOAD_COOLDOWN_MS = 5000

const getReloadAttempts = () => {
  try {
    const data = localStorage.getItem(DYNAMIC_RELOAD_KEY)
    if (!data) return { count: 0, timestamp: 0 }
    const parsed = JSON.parse(data)
    if (Date.now() - parsed.timestamp > RELOAD_COOLDOWN_MS * 2) {
      return { count: 0, timestamp: 0 }
    }
    return parsed
  } catch {
    return { count: 0, timestamp: 0 }
  }
}

const setReloadAttempts = (count) => {
  localStorage.setItem(DYNAMIC_RELOAD_KEY, JSON.stringify({ count, timestamp: Date.now() }))
}

const clearReloadAttempts = () => {
  localStorage.removeItem(DYNAMIC_RELOAD_KEY)
}

// Workaround for https://github.com/vitejs/vite/issues/11804
router.onError((err, to) => {
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    const { count } = getReloadAttempts()
    
    if (count < MAX_RELOAD_ATTEMPTS) {
      console.log(`Reloading page to fix dynamic import error (attempt ${count + 1}/${MAX_RELOAD_ATTEMPTS})`)
      setReloadAttempts(count + 1)
      setTimeout(() => {
        location.assign(to.fullPath)
      }, 500)
    } else {
      console.error('Dynamic import error: max reload attempts reached', err)
      clearReloadAttempts()
      const app = document.getElementById('app')
      if (app) {
        app.innerHTML = `
          <div style="padding: 20px; text-align: center; font-family: sans-serif;">
            <h2 style="color: #ff5252;">加载失败</h2>
            <p style="color: #888;">页面资源加载失败，请检查网络连接后刷新页面</p>
            <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 24px; cursor: pointer;">
              刷新页面
            </button>
          </div>
        `
      }
    }
  } else {
    console.error(err)
  }
})

router.isReady().then(() => {
  clearReloadAttempts()
})

export default router
