<template>
  <v-snackbar
    v-model="showOfflineNotice"
    :color="snackbarColor"
    location="bottom"
    :timeout="-1"
    variant="tonal"
  >
    <div class="d-flex align-center">
      <v-icon class="mr-2" :icon="snackbarIcon" />
      <div>
        <div>{{ offlineMessage }}</div>
        <div v-if="pendingCount > 0" class="text-body-small mt-1">
          {{ pendingCount }} 项数据等待同步
        </div>
      </div>
    </div>
  </v-snackbar>
</template>

<script setup>
import { ICON } from '@/utils/icons'
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { networkStatus } from '@/utils/networkStatus'
import { kvLocalProvider } from '@/utils/providers/kvLocalProvider'

const showOfflineNotice = ref(false)
const offlineReason = ref('')
const pendingCount = ref(0)
let unsubscribe = null
let queuePollTimer = null

const snackbarColor = computed(() => 'warning')

const snackbarIcon = computed(() => {
  return offlineReason.value === 'server_unreachable' ? ICON.SERVER_OFF : ICON.WIFI_OFF
})

const offlineMessage = computed(() => {
  if (offlineReason.value === 'server_unreachable') {
    return '云端服务器暂时不可达 — 数据已保存到本地，恢复后自动同步'
  }
  return '离线模式 — 应用仍可使用所有本地功能'
})

const pollQueueCount = async () => {
  try {
    const result = await kvLocalProvider.getOfflineQueueCount()
    if (result && result.success !== false) {
      pendingCount.value = result.count || 0
    }
  } catch {
    pendingCount.value = 0
  }
}

const handleNetworkChange = (event) => {
  if (event.type === 'offline') {
    showOfflineNotice.value = true
    offlineReason.value = event.reason || 'browser_offline'
    // 任何离线状态都轮询队列计数（browser_offline 也会积压队列项）
    pollQueueCount()
    if (!queuePollTimer) {
      queuePollTimer = setInterval(pollQueueCount, 10000)
    }
  } else if (event.type === 'online') {
    showOfflineNotice.value = false
    offlineReason.value = ''
    pendingCount.value = 0
    if (queuePollTimer) {
      clearInterval(queuePollTimer)
      queuePollTimer = null
    }
  }
}

onMounted(() => {
  const isOffline = !networkStatus.isOnline()
  showOfflineNotice.value = isOffline
  if (isOffline) {
    offlineReason.value = networkStatus.isBrowserOnline() ? 'server_unreachable' : 'browser_offline'
    // 任何离线状态都启动队列轮询
    pollQueueCount()
    queuePollTimer = setInterval(pollQueueCount, 10000)
  }
  unsubscribe = networkStatus.subscribe(handleNetworkChange)
})

onBeforeUnmount(() => {
  if (unsubscribe) unsubscribe()
  if (queuePollTimer) clearInterval(queuePollTimer)
})
</script>
