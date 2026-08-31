import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * 全屏控制 composable
 *
 * 封装 Fullscreen API（标准 + webkit 前缀），自动注册/清理事件监听。
 * 状态与方法对等替换 index.vue 中原有的 state.isFullscreen / enterFullscreen / exitFullscreen / toggleFullscreen / fullscreenChangeHandler。
 *
 * 设计原则：
 * - 状态自管（isFullscreen ref 内部 own）
 * - 生命周期自管（onMounted/onBeforeUnmount 自动注册/清理监听）
 * - 不依赖外部状态，零耦合
 */
export function useFullscreen() {
  const isFullscreen = ref(false)

  const enterFullscreen = () => {
    const docElm = document.documentElement
    if (docElm.requestFullscreen) {
      docElm.requestFullscreen()
    } else if (docElm.webkitRequestFullScreen) {
      docElm.webkitRequestFullScreen()
    }
  }

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen()
    }
  }

  const toggleFullscreen = () => {
    if (!isFullscreen.value) {
      enterFullscreen()
    } else {
      exitFullscreen()
    }
  }

  const fullscreenChangeHandler = () => {
    isFullscreen.value = !!(document.fullscreenElement || document.webkitFullscreenElement)
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', fullscreenChangeHandler)
    document.addEventListener('webkitfullscreenchange', fullscreenChangeHandler)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', fullscreenChangeHandler)
    document.removeEventListener('webkitfullscreenchange', fullscreenChangeHandler)
  })

  return { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen }
}
