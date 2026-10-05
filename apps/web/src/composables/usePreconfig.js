import { reactive } from 'vue'
import { getUrlParam, cleanupUrlParams, parseBoolean } from '@/utils/urlParams'

/**
 * 预配数据 composable
 *
 * 解析 URL 中的预配参数（namespace / authCode / autoExecute），
 * 用于首次进入时自动打开初始化对话框并应用配置。
 *
 * 设计原则：
 * - 状态自管（preconfigData reactive 对象内部 own）
 * - 不自动注册 onMounted，由外部在合适时机调用 parsePreconfigData()
 *   （因为 index.vue 的 mounted 流程有严格时序，自动调用可能产生竞态）
 */
export function usePreconfig() {
  const preconfigData = reactive({
    namespace: null,
    authCode: null,
    autoOpen: false,
    autoExecute: false,
  })

  /**
   * @param {object} [routeQuery] vue-router 的 query（可选）。
   *   来自上游 5625842：仅读 window.location 时，经 router 跳转（而非整页加载）带来的
   *   预配链接可能拿不到参数，导致"预配认证链接不被自动处理"。
   */
  const parsePreconfigData = (routeQuery) => {
    try {
      const pickParam = (key) => getUrlParam(key) || routeQuery?.[key] || null
      const namespace = pickParam('namespace')
      const authCode = pickParam('authCode') || pickParam('auth_code')
      const autoExecute = pickParam('autoExecute') || pickParam('auto_execute')

      if (namespace) {
        preconfigData.namespace = namespace
        preconfigData.authCode = authCode
        preconfigData.autoOpen = true
        // 解析自动执行参数，支持 true/false、1/0、yes/no
        preconfigData.autoExecute = parseBoolean(autoExecute)

        console.log('检测到预配数据:', {
          namespace: preconfigData.namespace,
          hasAuthCode: !!preconfigData.authCode,
          autoExecute: preconfigData.autoExecute,
        })

        // 清理URL参数，避免重复处理
        cleanupUrlParams(['namespace', 'authCode', 'auth_code', 'autoExecute', 'auto_execute'])
      }
    } catch (error) {
      console.error('解析预配数据失败:', error)
    }
  }

  return { preconfigData, parsePreconfigData }
}
