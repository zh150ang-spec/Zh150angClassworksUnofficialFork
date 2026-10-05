/**
 * 云端单存储模式（kv-server / classworkscloud）的内存写入暂存。
 *
 * 为什么需要：这两种模式**没有本地副本**，之前传输层「无限重试」把保存请求挂住，
 * 表面上像是「还没保存完」，实际上用户输入既没落盘也没报错。传输层改为有界快速失败后，
 * 必须给用户一个明确的落点：失败即暂存于本页 + 明确报错，联网后自动补写。
 *
 * 定位与边界：
 * - **仅内存**：刷新/关闭页面即丢失，这是刻意的取舍（不引入新的持久化结构）。
 *   需要跨会话不丢，应改用 dual-* 模式（本地 IndexedDB + 离线队列）。
 * - 写入用 RMW（rmwWriteServer）补写，避免把云端已有数据直接覆盖。
 * - 只暂存「重试有意义」的失败（网络/5xx）；401/403 这类确定性拒绝不入暂存，直接报错。
 */
import { networkStatus } from '@/utils/networkStatus'

/** key → 最后一次待写入的数据（同 key 后写覆盖前写） */
const spool = new Map()

let flushHandler = null
let flushing = false

/**
 * 注册补写实现（由 dataProvider 注入，避免 spool → provider → dataProvider 的循环依赖）
 * @param {(key:string, data:any) => Promise<any>} handler
 */
export function setSpoolFlushHandler(handler) {
  flushHandler = typeof handler === 'function' ? handler : null
}

/**
 * 暂存一次写入
 * @param {string} key
 * @param {any} data
 */
export function spoolWrite(key, data) {
  spool.set(key, data)
}

/** @returns {string[]} */
export function getSpooledKeys() {
  return [...spool.keys()]
}

/** @returns {number} */
export function getSpooledCount() {
  return spool.size
}

export function clearSpool() {
  spool.clear()
}

/**
 * 尝试把暂存内容补写到云端。
 * 遇到第一个仍失败的项就停手（保持顺序、避免打服务器），失败项保留在暂存里。
 * @returns {Promise<{flushed:number, remaining:number}>}
 */
export async function flushSpool() {
  if (flushing || !flushHandler || spool.size === 0) {
    return { flushed: 0, remaining: spool.size }
  }
  if (!networkStatus.isOnline()) {
    return { flushed: 0, remaining: spool.size }
  }

  flushing = true
  let flushed = 0
  try {
    // 快照遍历：补写过程中新增的 key 留到下一轮
    for (const [key, data] of [...spool.entries()]) {
      try {
        const result = await flushHandler(key, data)
        if (result && result.success !== false) {
          spool.delete(key)
          flushed++
        } else {
          break
        }
      } catch {
        break
      }
    }
  } finally {
    flushing = false
  }

  return { flushed, remaining: spool.size }
}

// 网络恢复（浏览器在线 + 服务器可达）时自动补写
networkStatus.subscribe((event) => {
  if (event.type === 'online') {
    flushSpool()
  }
})
