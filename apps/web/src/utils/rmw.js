import { kvServerProvider } from '@/utils/providers/kvServerProvider'

const RMW_MAX_RETRIES = 2

export function computeDataHash(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data)
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(16)
}

function unionByIdentity(server, local) {
  const seen = new Set()
  const result = []
  const conflicts = []
  const identify = (item) => {
    if (typeof item !== 'object' || item === null) return JSON.stringify(item)
    if ('id' in item) return item.id
    if ('name' in item && typeof item.name === 'string') return item.name
    return JSON.stringify(item)
  }
  for (const item of server) {
    const id = identify(item)
    seen.add(id)
    result.push(item)
  }
  for (const item of local) {
    const id = identify(item)
    if (!seen.has(id)) {
      result.push(item)
    } else {
      // 检测冲突：云端和本地都有相同 id 的项，但内容不同
      const serverItem = server.find((s) => identify(s) === id)
      if (serverItem && computeDataHash(serverItem) !== computeDataHash(item)) {
        conflicts.push({
          id,
          serverValue: serverItem,
          localValue: item,
        })
      }
    }
  }
  return { mergedData: result, conflicts }
}

export function additiveMerge(server, local) {
  if (Array.isArray(server) && Array.isArray(local)) {
    return unionByIdentity(server, local)
  }
  if (local === null || server === null)
    return { mergedData: local ?? server ?? null, conflicts: [] }
  if (typeof server === 'object' && typeof local === 'object') {
    // 递归深合并对象
    const merged = { ...server }
    const conflicts = []
    for (const key of Object.keys(local)) {
      if (!(key in server)) {
        merged[key] = local[key]
      } else if (
        typeof server[key] === 'object' &&
        typeof local[key] === 'object' &&
        server[key] !== null &&
        local[key] !== null
      ) {
        // 递归合并嵌套对象
        const subResult = additiveMerge(server[key], local[key])
        merged[key] = subResult.mergedData
        // 收集子级冲突，添加路径前缀
        for (const conflict of subResult.conflicts) {
          conflicts.push({
            ...conflict,
            path: key + (conflict.path ? '.' + conflict.path : ''),
          })
        }
      } else if (server[key] !== local[key]) {
        // 标量值冲突：本地和云端都有但值不同
        conflicts.push({
          path: key,
          serverValue: server[key],
          localValue: local[key],
        })
        merged[key] = local[key] // 本地覆盖云端
      }
    }
    return { mergedData: merged, conflicts }
  }
  return { mergedData: local, conflicts: [] }
}

/**
 * 读-改-写云端。
 *
 * 关键修复（fail-closed）：此前任何读失败都被当成「云端没有数据」，直接跳过合并写入，
 * 于是一次云端读取故障就会把云端已有数据整份冲掉。
 * 现在只有两种情况允许写入：
 *   1. 读取成功 → 正常合并（additiveMerge）后写入；
 *   2. provider 明确返回 NOT_FOUND（404，键确实不存在）→ 新建写入。
 * 其余读失败一律拒绝写入并返回 SERVER_READ_FAILED，由离线队列 / 内存暂存稍后重试。
 *
 * @param {string} key
 * @param {any} data
 * @param {{loadData:Function, saveData:Function}} [provider] 可注入（测试用）
 * @param {{retryPolicy?:object, signal?:AbortSignal}} [requestOptions] 透传给 provider 的请求级选项
 *        （后台同步传 BACKGROUND_RETRY_POLICY，并带租约 signal 以便锁丢失时中止在途请求）
 */
export async function rmwWriteServer(key, data, provider = kvServerProvider, requestOptions = {}) {
  let attempt = 0
  while (attempt <= RMW_MAX_RETRIES) {
    const current = await provider.loadData(key, requestOptions)

    const readFailed =
      current === undefined ||
      current === null ||
      (current.success === false && current.error?.code !== 'NOT_FOUND')

    if (readFailed) {
      console.warn('RMW 读取失败，放弃覆盖写入以避免云端数据丢失:', key, current?.error?.code)
      return {
        success: false,
        error: {
          code: 'SERVER_READ_FAILED',
          message: current?.error?.message || '云端读取失败，已放弃覆盖写入',
          retryable: true,
        },
      }
    }

    if (current.success !== false && computeDataHash(current) === computeDataHash(data)) {
      return { success: true, skipped: true }
    }
    const mergeResult =
      current.success !== false ? additiveMerge(current, data) : { mergedData: data, conflicts: [] }
    const merged = mergeResult.mergedData
    const conflicts = mergeResult.conflicts
    const result = await provider.saveData(key, merged, requestOptions)
    if (result && result.success !== false) {
      return { ...result, conflicts, serverOriginal: current }
    }
    attempt++
  }
  return { success: false, error: { code: 'SERVER_SAVE_ERROR', message: '云端保存失败' } }
}
