/**
 * 跨标签页互斥锁（基于 Web Locks API）
 *
 * 用途：防止多个浏览器标签页同时执行后台同步，避免冗余上传放大服务器负载。
 *
 * 设计（**可中止租约**）：
 * - 优先使用 navigator.locks（Web Locks API，现代浏览器原生支持，原子性强）
 * - 不支持 Web Locks 的旧浏览器降级为无锁（保持原有单标签页行为）
 * - 租约超时只**通知**调用方停手（`signal` 中止 + `onLeaseLost` 回调），
 *   **不替调用方释放锁**——只要调用方还在工作，锁就必须真的被持有
 * - 超时后再等 `graceMs` 仍未释放，才强制释放并告警（防调用方彻底卡死导致锁泄漏）
 * - **不把 AbortSignal 传给 Web Locks**：交给浏览器的话，abort 会让浏览器直接释放锁，
 *   于是又会退化成"调用方以为持有、实际已释放"的假租约
 *
 * 历史缺陷（勿回退）：
 * - 旧实现 `await navigator.locks.request(...)` 把**整个持锁过程**都 await 了，
 *   而持锁回调又在等 `release()`；`release()` 却要等 acquireLock 返回后才可能被调用，
 *   形成循环等待：acquireLock 直到 30s 超时才返回，且那时锁已被超时回调释放，
 *   结果是"每次后台同步延迟 30s 才开始，并且全程无锁"。
 *
 * 兼容性：Chrome 69+ / Firefox 96+ / Safari 15.4+ / Edge 79+
 */

const DEFAULT_TIMEOUT_MS = 30000
const DEFAULT_GRACE_MS = 10000

/**
 * 无 Web Locks 时的降级租约：永不中止、release 为空操作。
 * @returns {{release:Function, signal:AbortSignal, lost:Function, lostReason:Function}}
 */
function createFallbackLease() {
  return {
    release: () => {},
    signal: new AbortController().signal,
    lost: () => false,
    lostReason: () => null,
  }
}

/**
 * 尝试获取跨标签页独占锁（非阻塞）。
 *
 * @param {string} name - 锁名称
 * @param {object|number} [options] - 配置，或直接传 timeoutMs（兼容旧签名）
 * @param {number} [options.timeoutMs=30000] - 租约时长；到时通知调用方"该停手了"
 * @param {number} [options.graceMs=10000] - 超时后等待调用方收尾的时间，之后强制释放
 * @param {(reason:string)=>void} [options.onLeaseLost] - 租约失效回调
 * @returns {Promise<null|{release:Function, signal:AbortSignal, lost:Function, lostReason:Function}>}
 *          成功返回租约；锁被其他标签页占用返回 null
 *
 * @example
 * const lease = await acquireLock('backgroundSync', { timeoutMs: 30000 });
 * if (!lease) return;                       // 其他标签页正在同步，跳过本次
 * try {
 *   for (const key of keys) {
 *     if (lease.signal.aborted) break;      // 租约失效：尽快停手
 *     await work(key);
 *   }
 * } finally {
 *   lease.release();                        // 停手之后才真正释放
 * }
 */
export async function acquireLock(name, options = {}) {
  const config = typeof options === 'number' ? { timeoutMs: options } : options || {}
  const timeoutMs = Number.isFinite(config.timeoutMs) ? config.timeoutMs : DEFAULT_TIMEOUT_MS
  const graceMs = Number.isFinite(config.graceMs) ? config.graceMs : DEFAULT_GRACE_MS
  const onLeaseLost = typeof config.onLeaseLost === 'function' ? config.onLeaseLost : null

  if (typeof navigator === 'undefined' || !navigator.locks?.request) {
    return createFallbackLease()
  }

  const controller = new AbortController()
  let leaseLost = false
  let lostReason = null
  let releaseHolder = null
  let acquired = false
  let released = false
  let timeoutId = null
  let graceId = null
  let settleAcquired = null

  const acquiredSignal = new Promise((resolve) => {
    settleAcquired = resolve
  })

  const clearTimers = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (graceId) {
      clearTimeout(graceId)
      graceId = null
    }
  }

  const markLost = (reason) => {
    if (leaseLost) return
    leaseLost = true
    lostReason = reason
    controller.abort()
    console.warn(`锁 "${name}" 租约失效（${reason}），调用方应尽快停手`)
    if (onLeaseLost) {
      try {
        onLeaseLost(reason)
      } catch (error) {
        console.error('onLeaseLost 回调异常:', error)
      }
    }
  }

  const release = () => {
    if (released) return
    released = true
    clearTimers()
    if (releaseHolder) {
      const resolve = releaseHolder
      releaseHolder = null
      resolve()
    }
  }

  // 注意：这里**不** await request()，否则会等到锁释放才返回（见文件头"历史缺陷"）
  const requestPromise = navigator.locks
    .request(name, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
      if (!lock) {
        settleAcquired(false)
        return
      }
      acquired = true
      settleAcquired(true)

      // 租约计时从真正拿到锁开始
      timeoutId = setTimeout(() => {
        markLost('timeout')
        graceId = setTimeout(() => {
          if (!released) {
            console.warn(`锁 "${name}" 超过宽限期（${graceMs}ms）仍未释放，强制释放`)
            release()
          }
        }, graceMs)
      }, timeoutMs)

      await new Promise((resolve) => {
        releaseHolder = resolve
      })
      clearTimers()
    })
    .catch((error) => {
      console.warn(`锁 "${name}" 请求失败:`, error)
      if (!acquired) settleAcquired(false)
    })

  const obtained = await acquiredSignal

  if (!obtained) {
    // requestPromise 的 rejection 已在上方 catch 处理，这里仅确保不产生未处理拒绝
    requestPromise.catch(() => {})
    return null
  }

  return {
    release,
    signal: controller.signal,
    lost: () => leaseLost,
    lostReason: () => lostReason,
  }
}

export default acquireLock
