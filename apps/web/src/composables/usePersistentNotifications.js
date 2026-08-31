import { ref, computed } from 'vue'
import dataProvider from '@/utils/dataProvider'
import { formatTime } from '@/utils/dateUtils'

/**
 * 常驻通知系统 composable
 *
 * 管理 notification-list 键下的常驻通知：加载、查看详情、删除。
 * 通知数据通过 dataProvider 持久化（KV 存储）。
 *
 * 设计原则：
 * - 状态自管（persistentNotifications / currentNotification / notificationDetailDialog 三个 ref）
 * - 派生状态自管（currentNotificationFormattedTime computed）
 * - 不自动注册 onMounted，由外部在合适时机调用 loadPersistentNotifications()
 * - 不改原 removePersistentNotification 的"空对象 hack"行为（后端兼容性，未知是否仍需要，保留不动）
 */
export function usePersistentNotifications() {
  const persistentNotifications = ref([])
  const currentNotification = ref(null)
  const notificationDetailDialog = ref(false)

  const currentNotificationFormattedTime = computed(() => {
    if (!currentNotification.value?.timestamp) return ''
    return formatTime(currentNotification.value.timestamp)
  })

  const loadPersistentNotifications = async () => {
    try {
      const res = await dataProvider.loadData('notification-list')
      if (res && Array.isArray(res)) {
        persistentNotifications.value = res
      } else if (res && res.success !== false && Array.isArray(res.data)) {
        persistentNotifications.value = res.data
      } else {
        persistentNotifications.value = []
      }
    } catch (e) {
      console.error('加载常驻通知失败', e)
    }
  }

  const showNotificationDetail = (notification) => {
    currentNotification.value = notification
    notificationDetailDialog.value = true
  }

  const removePersistentNotification = async (id) => {
    persistentNotifications.value = persistentNotifications.value.filter((n) => n.id !== id)
    // 当通知列表为空时，保存空对象 {} 而不是空数组 []，因为后端不接受空数组
    const dataToSave = persistentNotifications.value.length > 0 ? persistentNotifications.value : {}
    await dataProvider.saveData('notification-list', dataToSave)
    notificationDetailDialog.value = false
  }

  return {
    persistentNotifications,
    currentNotification,
    notificationDetailDialog,
    currentNotificationFormattedTime,
    loadPersistentNotifications,
    showNotificationDetail,
    removePersistentNotification,
  }
}
