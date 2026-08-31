import { ref, onBeforeUnmount } from 'vue'
import { getSetting } from '@/utils/settings'

/**
 * 自动刷新调度 composable
 *
 * 根据 refresh.auto / refresh.interval 设置项，
 * 周期性触发数据下载（除非满足跳过条件）。
 *
 * 设计原则：
 * - 状态自管（refreshInterval）
 * - 外部依赖（shouldSkipRefresh / downloadData / loadPersistentNotifications）
 *   通过 setAutoRefreshContext 延迟绑定
 * - 定时器在 onBeforeUnmount 自动清理
 * - 不自动注册 onMounted，由外部在合适时机调用 setupAutoRefresh()
 *
 * 外部依赖说明：
 * - shouldSkipRefresh()：返回 true 时跳过本次刷新
 * - downloadData()：触发数据下载
 * - loadPersistentNotifications()：触发通知列表刷新
 *
 * 安全保证：
 * - ctx 未设置时，setupAutoRefresh 静默返回
 * - 重新调用 setupAutoRefresh 时，会先清理旧定时器
 */
export function useAutoRefresh() {
  // own 状态（用 ref 而非挂在外部 state 上）
  const refreshInterval = ref(null)

  // 延迟绑定的外部上下文
  let ctx = null

  const setAutoRefreshContext = (context) => {
    ctx = context
  }

  const setupAutoRefresh = () => {
    if (!ctx) return
    const autoRefresh = getSetting('refresh.auto')
    const interval = getSetting('refresh.interval')
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value)
      refreshInterval.value = null
    }
    if (autoRefresh) {
      refreshInterval.value = setInterval(() => {
        if (!ctx.shouldSkipRefresh()) {
          ctx.downloadData()
          ctx.loadPersistentNotifications()
        }
      }, interval * 1000)
    }
  }

  // 自动清理定时器
  onBeforeUnmount(() => {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value)
      refreshInterval.value = null
    }
  })

  return {
    refreshInterval,
    setAutoRefreshContext,
    setupAutoRefresh,
  }
}
