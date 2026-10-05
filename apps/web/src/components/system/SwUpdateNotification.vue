<template>
  <v-snackbar
    v-model="showUpdateBanner"
    :timeout="-1"
    color="info"
    location="top right"
    class="elevation-5"
    rounded="lg"
  >
    <div class="d-flex align-center">
      <v-icon class="mr-3" :icon="ICON.UPDATE" />
      <div>
        <div class="font-weight-bold">发现新版本</div>
        <div class="text-body-small">点击更新按钮以使用最新版本</div>
      </div>
    </div>
    <template #actions>
      <v-btn color="primary" variant="elevated" :loading="isUpdating" @click="updateServiceWorker">
        更新
      </v-btn>
      <v-btn variant="text" @click="dismissUpdate"> 稍后 </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup>
import { ICON } from '@/utils/icons'
import { ref, onMounted, onBeforeUnmount } from 'vue'

const showUpdateBanner = ref(false)
const isUpdating = ref(false)
let registration = null
let refreshing = false
// 保存定时器 ID 以便在组件卸载时清理，避免内存泄漏和在已卸载组件上访问 ref
let updateCheckTimeoutId = null
let updateCheckIntervalId = null

const handleNewServiceWorker = (waitingWorker) => {
  if (waitingWorker) {
    showUpdateBanner.value = true
  }
}

const updateServiceWorker = async () => {
  isUpdating.value = true

  if (registration && registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  setTimeout(() => {
    window.location.reload()
  }, 1000)
}

const dismissUpdate = () => {
  showUpdateBanner.value = false
}

const checkForUpdate = async () => {
  if ('serviceWorker' in navigator) {
    try {
      registration = await navigator.serviceWorker.ready

      if (registration.waiting) {
        handleNewServiceWorker(registration.waiting)
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              handleNewServiceWorker(newWorker)
            }
          })
        }
      })

      await registration.update()
    } catch (error) {
      console.error('Service Worker 更新检查失败:', error)
    }
  }
}

const handleControllerChange = () => {
  if (refreshing) return
  refreshing = true
  window.location.reload()
}

onMounted(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    updateCheckTimeoutId = setTimeout(checkForUpdate, 3000)

    updateCheckIntervalId = setInterval(checkForUpdate, 60 * 60 * 1000)
  }
})

onBeforeUnmount(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
  }
  // 清理定时器，避免在已卸载组件上访问 ref 或造成内存泄漏
  if (updateCheckTimeoutId !== null) {
    clearTimeout(updateCheckTimeoutId)
    updateCheckTimeoutId = null
  }
  if (updateCheckIntervalId !== null) {
    clearInterval(updateCheckIntervalId)
    updateCheckIntervalId = null
  }
})

defineExpose({
  checkForUpdate,
  showUpdateBanner,
})
</script>
