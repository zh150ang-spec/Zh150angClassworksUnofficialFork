/**
 * useConfigDefaults — 配置加载兜底 + 软件预设判定
 *
 * 封装科目管理 / 作业模板配置两类卡片重复的兜底逻辑：
 * 1. loadConfig 检测「键缺失 / 内容为空」→ 自动回退到默认配置（applyDefault）
 * 2. "当前是否为软件自带预设，无需提示未保存" 的判定
 *
 * 纯逻辑函数，Options API 与 Composition API 均可复用。
 * applyLoaded / applyDefault 由调用方传入，以适配各自数据结构与文案（不重写调用方 API 风格）。
 */
import dataProvider from '@/utils/dataProvider'
import { networkStatus } from '@/utils/networkStatus'

// 「确证缺失」：数据源明确回答「这个键不存在」（服务端 404）。
// 只有这种情况才允许回退默认配置。
const CONFIRMED_MISSING_CODES = ['NOT_FOUND']
// 「离线无法判定」：离线时本地没有副本，无法知道云端到底有没有这个键。
// 仅在当前确实离线时才当作缺失——否则一旦把认证失败/网络故障当成缺失，
// 就会静默套用默认配置，用户下一次保存即用默认值覆盖云端真实配置。
const OFFLINE_INDETERMINATE_CODES = ['DATA_NOT_FOUND']

export function useConfigDefaults({ configKey, kind = 'object' } = {}) {
  // 分析 loadData 响应：是否有效 / 内容是否为空 / 键是否缺失
  function analyzeResponse(response) {
    const loaded = response && response.success !== false
    let isEmpty = false
    if (loaded) {
      if (kind === 'array') {
        isEmpty = !Array.isArray(response) || response.length === 0
      } else {
        isEmpty =
          typeof response !== 'object' || response === null || Object.keys(response).length === 0
      }
    }
    const code = response?.error?.code
    const isMissing =
      CONFIRMED_MISSING_CODES.includes(code) ||
      (!networkStatus.isOnline() && OFFLINE_INDETERMINATE_CODES.includes(code))
    return { loaded, isEmpty, isMissing }
  }

  /**
   * 加载配置：键缺失/为空时自动回退到默认配置。
   * @param {object} validParameters
   *   applyLoaded(response)  有效数据 → 由调用方填充配置并同步「快照」
   *   applyDefault()         键缺失/为空 → 由调用方回退默认配置
   * @returns {Promise<{result:'loaded'|'default'|'error', response?:*, message?:string}>}
   */
  async function loadConfig({ applyLoaded, applyDefault } = {}) {
    try {
      const response = await dataProvider.loadData(configKey)
      const { loaded, isEmpty, isMissing } = analyzeResponse(response)
      if (loaded && !isEmpty) {
        if (applyLoaded) applyLoaded(response)
        return { result: 'loaded', response }
      }
      if (isEmpty || isMissing) {
        if (applyDefault) applyDefault()
        return { result: 'default', response }
      }
      return { result: 'error', response, message: response?.error?.message || '' }
    } catch (error) {
      console.error('Failed to load config:', error)
      return { result: 'error', error }
    }
  }

  // 软件自带预设置位后视为已保存状态，无需「未保存」提示
  function isPreset(result) {
    return result === 'default'
  }

  // 生成默认配置快照（深拷贝，避免污染内置默认值）
  function defaultSnapshot(source) {
    return JSON.parse(JSON.stringify(source))
  }

  return { loadConfig, isPreset, defaultSnapshot }
}
