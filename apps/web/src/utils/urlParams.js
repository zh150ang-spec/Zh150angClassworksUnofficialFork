/**
 * URL 查询参数统一工具
 * 项目内所有读取/清理 URL 参数都应使用此处函数
 */

/**
 * 读取单个 URL 查询参数
 * @param {string} name - 参数名
 * @returns {string|null}
 */
export function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name)
}

/**
 * 读取所有 URL 查询参数
 * @returns {URLSearchParams}
 */
export function getAllUrlParams() {
  return new URLSearchParams(window.location.search)
}

/**
 * 清理 URL 中的指定查询参数（使用 replaceState 不产生历史记录）
 * 注意：此函数有 URL 副作用
 * @param {string[]} params - 要清理的参数名列表
 */
export function cleanupUrlParams(params) {
  try {
    const url = new URL(window.location)
    let hasChanged = false

    params.forEach((param) => {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param)
        hasChanged = true
      }
    })

    if (hasChanged) {
      window.history.replaceState({}, document.title, url.toString())
    }
  } catch (error) {
    console.error('清理URL参数失败:', error)
  }
}

/**
 * 宽松布尔值解析（支持 true/1/yes 字符串，不区分大小写）
 * @param {string|*} value
 * @returns {boolean}
 */
export function parseBoolean(value) {
  if (!value) return false
  const lowerValue = String(value).toLowerCase()
  return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes'
}
