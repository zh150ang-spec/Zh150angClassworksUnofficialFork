/**
 * main.js
 *
 * 精简启动流水线：快速挂载 Vue app，重型依赖（Sentry/Clarity）异步加载
 */

// Fonts — Apple Design System (DM Sans + JetBrains Mono)
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/dm-sans/700.css'
import '@fontsource/jetbrains-mono/400.css'

// 核心插件（Vuetify / Router / Pinia）
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'
import GlobalMessage from '@/components/GlobalMessage.vue'

// Composables
import { createApp } from 'vue'
import { ICON } from '@/utils/icons'

import messageService from './utils/message'
import { watchSettings } from './utils/settings'
import BackgroundSyncService from './utils/backgroundSync'

const app = createApp(App)

// make ICON available globally — used by Options API data() and templates
globalThis.ICON = ICON

registerPlugins(app)
app.use(messageService)

app.component('GlobalMessage', GlobalMessage)

// 先异步加载 Sentry 并初始化，再挂载 app
// 这样 Sentry.init() 在 app.mount() 之前执行，避免 Misconfigured SDK 警告
import('./utils/sentry').then(({ initSentry }) => {
  const router = app.config.globalProperties.$router
  initSentry(app, router)
}).catch((err) => {
  console.warn('Sentry 初始化失败:', err)
}).finally(() => {
  // 挂载 Vue app
  app.mount('#app')
})

// ====== 以下全部异步，不阻塞首屏渲染 ======

// 异步加载 Clarity（在页面完全加载后）
const loadClarity = async () => {
  try {
    const { getVisitorId } = await import('./utils/visitorId')
    const Clarity = (await import('@microsoft/clarity')).default
    Clarity.init('rhp8uqoc3l')

    const visitorId = await getVisitorId()
    console.log('Visitor ID:', visitorId)
    Clarity.identify(visitorId)
    Clarity.setTag('fingerprintjs', visitorId)
  } catch (error) {
    console.warn('Clarity 加载或标识设置失败:', error)
  }
}

if (document.readyState === 'complete') {
  loadClarity()
} else {
  window.addEventListener('load', loadClarity, { once: true })
}

// 后台同步服务（延迟启动，避免阻塞首屏）
setTimeout(() => {
  BackgroundSyncService.start()

  watchSettings((settings) => {
    const syncKeys = ['sync.enabled', 'sync.minInterval', 'sync.maxInterval']
    const hasSyncChange = syncKeys.some(key => key in settings)
    if (hasSyncChange) {
      BackgroundSyncService.restart()
    }
  })
}, 3000)
