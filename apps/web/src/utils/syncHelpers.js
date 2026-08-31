/**
 * 同步辅助工具：分页加载全部键名 + 并发执行器
 * 抽取自 dataProvider 和 backgroundSync 的重复实现，保持策略一致
 */

// 分页加载全部键名时单页大小（突破单次 1000 条限制）
export const KEYS_PAGE_SIZE = 1000

// 批量并发执行时的默认并发度
export const SYNC_CONCURRENCY = 5

/**
 * 分页加载全部键名（突破 1000 限制）
 * 循环以 KEYS_PAGE_SIZE 分页拉取，直到累计数量达到 total_rows 或本页不足一页。
 * 任意一页失败返回 null，由调用方判断处理。
 * @param {Function} loadFn - 接收 {limit, skip} 参数、返回 {keys, total_rows, success} 的函数
 * @returns {Promise<{keys: string[], success: boolean} | null>}
 */
export async function loadAllKeys(loadFn) {
  const allKeys = []
  let skip = 0

  while (true) {
    const result = await loadFn({ limit: KEYS_PAGE_SIZE, skip }).catch(() => null)
    if (!result || result.success === false) return null

    const keys = result.keys || []
    allKeys.push(...keys)

    const totalRows = result.total_rows || 0
    if (allKeys.length >= totalRows || keys.length < KEYS_PAGE_SIZE) break

    skip += KEYS_PAGE_SIZE
  }

  return { keys: allKeys, success: true }
}

/**
 * 并发执行器：分批 Promise.all，批内并发、批间串行
 * @param {Array} items - 待处理项数组
 * @param {number} limit - 每批并发数
 * @param {Function} operation - 对每个项执行的异步函数
 * @returns {Promise<Array>} 所有操作的结果数组
 */
export async function runWithConcurrency(items, limit, operation) {
  const results = []
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit)
    const batchResults = await Promise.all(batch.map(operation))
    results.push(...batchResults)
  }
  return results
}
