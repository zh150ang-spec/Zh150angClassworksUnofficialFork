/**
 * 应用更新门禁（未保存内容登记）
 *
 * 用途：SW 更新后刷新页面会丢掉尚未保存的编辑内容（例如正在编辑的看板）。
 * `SwUpdateNotification` 在刷新前通过这里询问"是否有未保存内容"，
 * 有则拒绝刷新并提示用户先保存。
 *
 * 约定：注册的检查函数必须是**纯同步、无副作用、快速**的；
 * 任一项返回 true 即视为"有未保存内容"。
 */

/** @type {Set<() => boolean>} */
const checks = new Set()

/**
 * 注册一个"是否有未保存内容"检查函数。
 * @param {() => boolean} check
 * @returns {() => void} 注销函数
 */
export function registerUnsavedCheck(check) {
  if (typeof check !== 'function') return () => {}
  checks.add(check)
  return () => {
    checks.delete(check)
  }
}

/**
 * 是否存在未保存内容。
 * @returns {boolean}
 */
export function hasUnsavedWork() {
  for (const check of checks) {
    try {
      if (check()) return true
    } catch (error) {
      // 检查函数异常不应阻止更新流程，但必须留痕
      console.error('未保存内容检查失败:', error)
    }
  }
  return false
}

/** 清空登记（测试与页面销毁时使用） */
export function clearUnsavedChecks() {
  checks.clear()
}

export default { registerUnsavedCheck, hasUnsavedWork, clearUnsavedChecks }
