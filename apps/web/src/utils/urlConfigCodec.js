/**
 * URL 配置编解码统一工具
 * 用于在 URL 中传递配置（如 ?config=xxx）
 *
 * 编码端：SettingsLinkGenerator.vue
 * 解码端：pages/index.vue
 *
 * 设计原则：
 * - 解码端必须接受所有配置项（用户明确分享即明确意图，无权替用户决定）
 * - 生成端的快捷按钮默认不勾选敏感项（仅 UX 防误操作，不构成硬性限制）
 * - SENSITIVE_BLOCKLIST 仅用于生成端默认勾选行为，解码端不读取
 */
import { encodeBase64Utf8, decodeBase64Utf8 } from '@/utils/encoding'

/**
 * 敏感配置项黑名单
 * 仅用于生成端"快捷勾选"按钮的默认行为（默认不勾选这些项，避免误放进 URL）
 * 用户仍可手动勾选强制选中
 * 解码端不读取此列表，必须接受所有内容
 */
export const SENSITIVE_BLOCKLIST = new Set(['server.kvToken'])

/**
 * 判断某个配置 key 是否在敏感黑名单中
 * @param {string} key
 * @returns {boolean}
 */
export function isSensitiveKey(key) {
  return SENSITIVE_BLOCKLIST.has(key)
}

/**
 * 将配置对象编码为 base64 字符串
 * @param {Object} obj
 * @returns {string}
 */
export function encodeConfigToBase64Url(obj) {
  const json = JSON.stringify(obj)
  return encodeBase64Utf8(json)
}

/**
 * 将 base64 字符串解码为配置对象
 * @param {string} str
 * @returns {Object|null} 解析失败返回 null，避免调用方未包裹 try/catch 时崩溃
 */
export function decodeConfigFromBase64Url(str) {
  if (!str) return null
  try {
    const json = decodeBase64Utf8(str)
    return JSON.parse(json)
  } catch (error) {
    // base64 损坏或解码后非合法 JSON 时返回 null，避免抛错导致调用方崩溃
    console.error('解码 URL 配置失败:', error.message)
    return null
  }
}
