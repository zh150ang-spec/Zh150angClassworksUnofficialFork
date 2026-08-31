/**
 * 日期时间统一工具
 * 项目内所有日期格式化都应使用此处函数，避免组件内手写拼接
 */

/**
 * 将任意日期输入规范化为 Date 对象
 * - Date 实例：原样返回
 * - 字符串：尝试解析
 * - 其他/无效：返回当前时间
 * @param {Date|string|*} dateInput
 * @returns {Date}
 */
export function ensureDate(dateInput) {
  if (dateInput instanceof Date) {
    return dateInput
  }
  if (typeof dateInput === 'string') {
    const date = new Date(dateInput)
    if (!isNaN(date.getTime())) {
      return date
    }
  }
  return new Date()
}

/**
 * 格式化为 YYYYMMDD 字符串（如 "20260704"）
 * @param {Date|string} dateInput
 * @returns {string}
 */
export function formatDateYYYYMMDD(dateInput) {
  const date = ensureDate(dateInput)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * 格式化为中文日期 "2026年7月4日"
 * @param {Date|string} dateInput
 * @returns {string}
 */
export function formatDateChinese(dateInput) {
  const date = ensureDate(dateInput)
  const year = date.getFullYear()
  const month = parseInt(date.getMonth() + 1, 10)
  const day = parseInt(date.getDate(), 10)
  return `${year}年${month}月${day}日`
}

/**
 * 格式化为 ISO 日期 "2026-07-04"
 * @param {Date|string} dateInput
 * @returns {string}
 */
export function formatDateISO(dateInput) {
  const date = ensureDate(dateInput)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 将 8 位日期字符串（YYYYMMDD）格式化为中文日期
 * 输入是字符串，与 formatDateChinese（输入 Date）语义不同，不可合并
 * @param {string} dateStr - 8 位日期字符串
 * @returns {string}
 */
export function formatDateDisplay8Char(dateStr) {
  if (!dateStr || dateStr.length !== 8) return dateStr
  const year = dateStr.slice(0, 4)
  const month = parseInt(dateStr.slice(4, 6), 10)
  const day = parseInt(dateStr.slice(6, 8), 10)
  return `${year}年${month}月${day}日`
}

/**
 * 格式化时间戳为本地完整时间字符串
 * @param {number|string|Date} timestamp
 * @returns {string}
 */
export function formatTime(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString()
}

/**
 * 格式化为 HH:MM（24 小时制）
 * @param {number|string|Date} timestamp
 * @returns {string}
 */
export function formatTimeOnly(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/**
 * 格式化为 HH:MM:SS（24 小时制）
 * @param {number|string|Date} timestamp
 * @returns {string}
 */
export function formatTimeWithSeconds(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}
