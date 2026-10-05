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
        <div class="text-body-small">{{ bannerHint }}</div>
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
import { hasUnsavedWork } from '@/utils/updateGate'

const showUpdateBanner = ref(false)
const isUpdating = ref(false)
const bannerHint = ref('点击更新按钮以使用最新版本')
let registration = null
let refreshing = false
// 只有用户确认（或确认过）才允许刷新；否则任何 controllerchange 都不许打断课堂
let reloadApproved = false
let updateCheckTimeoutId = null
let updateCheckIntervalId = null
// 监听器只注册一次：checkForUpdate 每小时调用，注册在函数体内会持续累积
let updateFoundHandler = null

const refreshNow = () => {
  if (refreshing) return
  refreshing = true
  window.location.reload()
}

const markUpdateAvailable = (worker) => {
  if (!worker) return
  bannerHint.value = hasUnsavedWork()
    ? '有未保存的内容，请先保存后再更新'
    : '点击更新按钮以使用最新版本'
  showUpdateBanner.value = true
}

const updateServiceWorker = async () => {
  if (hasUnsavedWork()) {
    bannerHint.value = '有未保存的内容，请先保存后再更新'
    return
  }

  isUpdating.value = true
  reloadApproved = true

  if (registration && registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  // 兜底：controllerchange 未触发时（浏览器差异/无等待中的 SW）也完成更新
  setTimeout(() => {
    if (!refreshing) refreshNow()
  }, 2000)
}

const dismissUpdate = () => {
  showUpdateBanner.value = false
}

const checkForUpdate = async () => {
  if (!('serviceWorker' in navigator)) return

  // 离线时直接跳过：更新探测的 fetch 必然失败，而浏览器只会给出
  // "An unknown error occurred when fetching the script" 这种无从排查的模糊信息，
  // 当成故障刷屏会误导人。
  if (navigator.onLine === false) {
    console.info('Service Worker 更新检查已跳过：当前处于离线状态')
    return
  }

  try {
    registration = await navigator.serviceWorker.ready

    if (registration.waiting) {
      markUpdateAvailable(registration.waiting)
    }

    if (!updateFoundHandler) {
      updateFoundHandler = () => {
        const newWorker = registration.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            markUpdateAvailable(newWorker)
          }
        })
      }
      registration.addEventListener('updatefound', updateFoundHandler)
    }

    await registration.update()
  } catch (error) {
    // registration.update() 的失败原因由浏览器规范化，message 往往很含糊。
    // 这里补上可判别的上下文（错误名 / 作用域 / 脚本地址 / 在线状态），
    // 让日志能定位问题，而不是只剩一句“未知错误”。
    const details = {
      name: error?.name || 'UnknownError',
      message: error?.message || String(error),
      online: navigator.onLine,
      scope: registration?.scope,
      scriptURL:
        registration?.active?.scriptURL ||
        registration?.installing?.scriptURL ||
        registration?.waiting?.scriptURL,
    }
    if (error?.name === 'TypeError') {
      // 浏览器在网络不可达、脚本暂时取不到等情况下统一抛 TypeError
      console.warn('Service Worker 更新检查失败（通常为网络不可达）:', details)
    } else {
      console.error('Service Worker 更新检查失败:', details)
    }
  }
}

const handleControllerChange = () => {
  if (refreshing) return

  if (reloadApproved) {
    refreshNow()
    return
  }

  // 未经本页用户确认就换了 controller（例如另一个标签页点了更新）：
  // 只在"没有未保存内容且页面不可见"时静默刷新，绝不打断正在使用的大屏
  markUpdateAvailable(navigator.serviceWorker.controller)
  if (!hasUnsavedWork() && document.visibilityState === 'hidden') {
    refreshNow()
  }
}

onMounted(() => {
  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
  updateCheckTimeoutId = setTimeout(checkForUpdate, 3000)
  updateCheckIntervalId = setInterval(checkForUpdate, 60 * 60 * 1000)
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
