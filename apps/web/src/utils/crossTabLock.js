/**
 * 跨标签页互斥锁（基于 Web Locks API）
 *
 * 用途：防止多个浏览器标签页同时执行后台同步，避免冗余上传放大服务器负载。
 *
 * 设计：
 * - 优先使用 navigator.locks（Web Locks API，现代浏览器原生支持，原子性强）
 * - 不支持 Web Locks 的旧浏览器降级为无锁（保持原有单标签页 _isSyncing 行为）
 * - 锁持有超时自动释放，防止标签页崩溃导致死锁
 *
 * 兼容性：Chrome 69+ / Firefox 96+ / Safari 15.4+ / Edge 79+
 */

/**
 * 尝试获取跨标签页独占锁（非阻塞）。
 * @param {string} name - 锁名称
 * @param {number} [timeoutMs=30000] - 锁持有超时时间（毫秒），超时后自动释放防死锁
 * @returns {Promise<Function|null>} 成功返回 release 函数，失败（锁被占用）返回 null
 *
 * @example
 * const release = await acquireLock("backgroundSync", 30000);
 * if (!release) {
 *   // 其他标签页正在同步，跳过本次
 *   return;
 * }
 * try {
 *   await doWork();
 * } finally {
 *   release();
 * }
 */
export async function acquireLock(name, timeoutMs = 30000) {
  // 不支持 Web Locks API 时降级为无锁（返回空 release 函数）
  if (typeof navigator === 'undefined' || !navigator.locks?.request) {
    return () => {}
  }

  let releaseFn
  let acquired = false
  let timeoutId

  // AbortController 用于超时强制释放锁
  const controller = new AbortController()
  timeoutId = setTimeout(() => {
    controller.abort()
    if (releaseFn) {
      console.warn(`锁 "${name}" 持有超时（${timeoutMs}ms），强制释放`)
      releaseFn()
    }
  }, timeoutMs)

  try {
    await navigator.locks.request(
      name,
      { mode: 'exclusive', ifAvailable: true, signal: controller.signal },
      async (lock) => {
        if (!lock) return // 锁被其他标签页占用，ifAvailable 立即返回
        acquired = true
        // 持有锁直到 releaseFn 被调用或超时 abort
        await new Promise((resolve) => {
          releaseFn = resolve
        })
      },
    )
  } catch {
    // AbortError（超时）或其他错误：锁已释放，无需特殊处理
  }

  clearTimeout(timeoutId)

  if (!acquired) {
    return null
  }

  // 返回 release 函数，调用后释放锁
  return () => {
    clearTimeout(timeoutId)
    if (releaseFn) {
      releaseFn()
      releaseFn = null
    }
  }
}
