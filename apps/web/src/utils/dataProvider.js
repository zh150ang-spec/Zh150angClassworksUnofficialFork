import { kvLocalProvider } from '@/utils/providers/kvLocalProvider'
import { kvServerProvider } from '@/utils/providers/kvServerProvider'
import { getSetting, setSetting } from '@/utils/settings'
import { getEffectiveServerUrl } from '@/utils/serverRotation'
import { networkStatus } from '@/utils/networkStatus'
import backgroundSync from '@/utils/backgroundSync'
import { rmwWriteServer, computeDataHash } from '@/utils/rmw'
import { spoolWrite, setSpoolFlushHandler } from '@/utils/pendingWriteSpool'
import messageService from '@/utils/message'
import { loadAllKeys, runWithConcurrency, SYNC_CONCURRENCY } from '@/utils/syncHelpers'

// 云端单存储模式的暂存补写实现：用 RMW 补写，避免把云端已有数据直接覆盖
setSpoolFlushHandler((key, data) => rmwWriteServer(key, data))

/**
 * 本地副本写入失败登记表（P0-6）。
 *
 * 背景：双存储下"云端成功、本地失败"以前只是把 localFailed 放进返回值，而全仓没有任何消费方，
 * 于是本地副本静默过期（离线时读到旧数据），用户与设置页都看不到。
 * 这里记录失败项供设置页展示；不做应用内通知，以免违反"自动保存不得通知"的约定。
 */
const localWriteFailures = new Map()

function recordLocalWriteFailure(key) {
  const previous = localWriteFailures.get(key)
  localWriteFailures.set(key, {
    key,
    count: (previous?.count || 0) + 1,
    lastAt: Date.now(),
  })
}

function clearLocalWriteFailure(key) {
  if (localWriteFailures.has(key)) {
    localWriteFailures.delete(key)
  }
}

export const formatResponse = (data) => data

// 「重试有意义」的错误码：网络类故障与服务器 5xx。业务拒绝（未授权/无权限/不存在）不在此列，
// 它们必须快速失败并把错误码原样交给调用方，否则会被误判成「键不存在」而套用默认配置。
const RETRYABLE_ERROR_CODES = new Set([
  'NETWORK_ERROR',
  'SERVER_LOAD_ERROR',
  'SERVER_SAVE_ERROR',
  'SERVER_READ_FAILED',
  'RETRY_EXHAUSTED',
  'LOAD_ERROR',
  'QUEUE_ERROR',
])

export const formatError = (message, code = 'UNKNOWN_ERROR', options = {}) => {
  const { retryable, ...extra } = options
  return {
    success: false,
    error: {
      code,
      message,
      retryable: retryable ?? RETRYABLE_ERROR_CODES.has(code),
      ...extra,
    },
  }
}

const DEFAULT_RETRY_ATTEMPTS = 2
const RETRY_DELAY_BASE = 100

/**
 * 有限次重试。
 *
 * 修复点：此前循环耗尽后隐式返回 undefined，调用方把 undefined 一律折叠成 NOT_FOUND，
 * 于是「服务器拒绝（401/403/400）」被显示成「数据不存在」，甚至会触发默认配置回退。
 * 现在：**返回最后一次的错误对象（保留原错误码）**，并且只对 retryable 的失败重试
 * （NOT_FOUND 等确定性结果不再重复请求 3 次）。
 */
async function retryOperation(operation, maxRetries = DEFAULT_RETRY_ATTEMPTS) {
  let lastResult
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation()
      if (result && result.success !== false) {
        return result
      }
      lastResult = result
      const canRetry = attempt < maxRetries && result?.error?.retryable === true
      if (!canRetry) {
        return result ?? formatError('操作失败', 'RETRY_EXHAUSTED')
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_BASE * (attempt + 1)))
    } catch (error) {
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_BASE * (attempt + 1)))
      } else {
        throw error
      }
    }
  }
  return lastResult ?? formatError('操作失败', 'RETRY_EXHAUSTED')
}

let _isReadOnly = false

function isEmptyArray(value) {
  return Array.isArray(value) && value.length === 0
}

/**
 * 通知用户 RMW 合并冲突
 * @param {string} key - 数据键名
 * @param {Array} conflicts - 冲突列表
 * @param {*} localData - 本地原始数据
 * @param {*} serverData - 云端当前数据（合并前的）
 */
function notifyRmwConflict(key, conflicts, localData, serverData) {
  if (!conflicts || conflicts.length === 0) return

  const conflictDescriptions = conflicts
    .map((c) => {
      if (c.id !== undefined) {
        // 数组项冲突
        const serverDisplay = extractHumanDescription(c.serverValue)
        const localDisplay = extractHumanDescription(c.localValue)
        return `ID "${c.id}": 云端为 "${serverDisplay}",你的为 "${localDisplay}"`
      } else {
        // 对象字段冲突
        const serverDisplay = extractHumanDescription(c.serverValue)
        const localDisplay = extractHumanDescription(c.localValue)
        return `字段 "${c.path}": 云端为 "${serverDisplay}",你的为 "${localDisplay}"`
      }
    })
    .join('; ')

  // 创建操作按钮
  const actions = [
    {
      label: '使用云端',
      color: 'primary',
      variant: 'flat',
      onClick: async () => {
        try {
          // 用云端数据覆盖本地
          await kvLocalProvider.saveData(key, serverData)
          messageService.success('已使用云端数据', '本地数据已更新为云端版本')
        } catch (error) {
          messageService.error('操作失败', '无法更新本地数据: ' + error.message)
        }
      },
    },
    {
      label: '换用我的修改',
      color: 'warning',
      variant: 'flat',
      onClick: async () => {
        try {
          // 用本地数据覆盖云端
          const result = await kvServerProvider.saveData(key, localData)
          if (result && result.success !== false) {
            messageService.success('已使用你的修改', '云端数据已更新为你的版本')
          } else {
            messageService.error('操作失败', '无法更新云端数据')
          }
        } catch (error) {
          messageService.error('操作失败', '无法更新云端数据: ' + error.message)
        }
      },
    },
  ]

  messageService.warning(
    '数据冲突',
    `你刚才修改的内容已被他人先修改过，已按「你的修改优先」合并写入云端。${conflictDescriptions}`,
    {
      // 冲突结果**已经落地**，15s 自动消失会让用户来不及选择就默认接受本地覆盖云端。
      // 因此改为常驻，直到用户明确选择「使用云端」或「换用我的修改」。
      timeout: -1,
      closable: false,
      actions,
    },
  )
}

/**
 * 提取人类可读的描述
 * @param {*} value - 要描述的值
 * @returns {string} - 人类可读的描述
 */
function extractHumanDescription(value) {
  if (value === null || value === undefined) return '空'
  if (typeof value === 'string') return value.length > 50 ? value.substring(0, 50) + '...' : value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `数组(${value.length}项)`
  if (typeof value === 'object') {
    // 尝试提取有意义的字段
    if (value.name) return value.name
    if (value.title) return value.title
    if (value.id) return `ID:${value.id}`
    return '对象'
  }
  return '未知'
}

function mergeData(local, cloud, isReadOnly) {
  if (!cloud) return local
  if (!local) return cloud

  if (Array.isArray(local) && Array.isArray(cloud)) {
    if (isReadOnly) {
      if (isEmptyArray(cloud) && !isEmptyArray(local)) return [...local]
      return [...cloud]
    }
    if (isEmptyArray(local) && !isEmptyArray(cloud)) return [...cloud]
    return [...local]
  }

  if (typeof local === 'object' && typeof cloud === 'object') {
    if (isReadOnly) {
      const merged = { ...cloud }
      for (const key of Object.keys(local)) {
        if (!(key in cloud)) {
          merged[key] = local[key]
        } else if (typeof local[key] === 'object' && typeof cloud[key] === 'object') {
          merged[key] = mergeData(local[key], cloud[key], isReadOnly)
        }
      }
      return merged
    }
    const merged = { ...local }
    for (const key of Object.keys(cloud)) {
      if (!(key in local)) {
        merged[key] = cloud[key]
      } else if (typeof local[key] === 'object' && typeof cloud[key] === 'object') {
        merged[key] = mergeData(local[key], cloud[key], isReadOnly)
      }
    }
    return merged
  }

  return isReadOnly ? cloud : local
}

function isDualMode(provider) {
  return provider === 'dual-cloud' || provider === 'dual-server'
}

export default {
  setReadOnlyState(isReadOnly) {
    _isReadOnly = !!isReadOnly
  },

  isReadOnly() {
    return _isReadOnly
  },

  /** 本地副本写入失败的 key 列表（P0-6 可见性；设置页读取） */
  getLocalWriteFailures() {
    return [...localWriteFailures.values()]
  },

  getLocalWriteFailureCount() {
    return localWriteFailures.size
  },

  /** 清空本地写失败登记（例如用户主动全量同步后） */
  clearLocalWriteFailures() {
    localWriteFailures.clear()
  },

  checkNamespaceChange() {
    const currentNamespace = getSetting('device.uuid') || ''
    const lastKnown = getSetting('device.lastKnownNamespace') || ''

    if (!currentNamespace) {
      return { changed: false, current: '', previous: lastKnown }
    }

    if (!lastKnown) {
      setSetting('device.lastKnownNamespace', currentNamespace)
      return { changed: false, current: currentNamespace, previous: '' }
    }

    if (currentNamespace !== lastKnown) {
      return { changed: true, current: currentNamespace, previous: lastKnown }
    }

    return { changed: false, current: currentNamespace, previous: lastKnown }
  },

  confirmNamespaceChange() {
    const currentNamespace = getSetting('device.uuid') || ''
    setSetting('device.lastKnownNamespace', currentNamespace)
  },

  async exportLocalData() {
    try {
      const keysResult = await loadAllKeys((opts) => kvLocalProvider.loadKeys(opts))
      if (!keysResult) return null

      const allData = {}
      for (const key of keysResult.keys) {
        const result = await kvLocalProvider.loadData(key)
        if (result && result.success !== false) {
          allData[key] = result
        }
      }
      return allData
    } catch (e) {
      console.warn('导出本地数据失败:', e)
      return null
    }
  },

  loadData: async (key) => {
    const provider = getSetting('server.provider')

    // 严格模式：仅本地
    if (provider === 'local') {
      try {
        const result = await kvLocalProvider.loadData(key)
        if (result && result.success !== false) {
          return result
        }
        // 本地存储对「缺失」是权威的：保留 provider 的 NOT_FOUND（确证缺失），
        // 否则上层（useConfigDefaults）无法区分「键不存在」与「读取故障」。
        return result ?? formatError('本地数据不存在', 'DATA_NOT_FOUND')
      } catch (error) {
        return formatError('本地数据加载失败: ' + error.message, 'LOCAL_LOAD_ERROR')
      }
    }

    // 严格模式：仅云端（不访问本地）
    if (provider === 'kv-server' || provider === 'classworkscloud') {
      if (!networkStatus.isOnline()) {
        return formatError('网络不可用', 'NETWORK_OFFLINE')
      }
      try {
        const result = await retryOperation(() => kvServerProvider.loadData(key))
        if (result && result.success !== false) {
          networkStatus.noteRequestSuccess()
          return result
        }
        // 错误码保真：只有 provider 明确返回 NOT_FOUND 才是「不存在」，
        // 其余失败（401/403/5xx/网络）必须原样上抛，不能被折叠成「数据不存在」。
        return result ?? formatError('云端数据加载失败', 'SERVER_LOAD_ERROR')
      } catch (error) {
        return formatError('云端数据加载失败: ' + error.message, 'SERVER_LOAD_ERROR')
      }
    }

    // 双模式：云端和本地都存储完整数据
    if (isDualMode(provider)) {
      if (networkStatus.isOnline()) {
        try {
          const [localResult, serverResult] = await Promise.all([
            kvLocalProvider.loadData(key).catch(() => null),
            retryOperation(() => kvServerProvider.loadData(key)),
          ])

          const localOk = localResult && localResult.success !== false
          const serverOk = serverResult && serverResult.success !== false

          if (serverOk) {
            networkStatus.noteRequestSuccess()
          }

          if (serverOk && localOk) {
            const merged = mergeData(localResult, serverResult, _isReadOnly)
            if (computeDataHash(merged) !== computeDataHash(localResult)) {
              await kvLocalProvider.saveData(key, merged).catch(() => {})
            }
            return merged
          }

          if (serverOk) {
            await kvLocalProvider.saveData(key, serverResult).catch(() => {})
            return serverResult
          }

          if (localOk) {
            // 只是「本次云端读取失败」，不足以判定整个服务器不可达：
            // 交给 noteRequestFailure 记录证据 + 触发一次去抖探测，由心跳决定是否进入离线模式。
            networkStatus.noteRequestFailure()
            return localResult
          }

          // 双失败：区分「两边都确认没有该键（真缺失）」与「两边都故障」。
          // 前者必须返回 NOT_FOUND，后者的错误码不得被上层当成缺失（否则会套用默认配置覆盖云端）。
          const localMissing = localResult?.error?.code === 'NOT_FOUND'
          const serverMissing = serverResult?.error?.code === 'NOT_FOUND'
          if (localMissing && serverMissing) {
            return formatError('数据不存在', 'NOT_FOUND')
          }
          return formatError('无法加载数据：云端和本地均不可用', 'DATA_UNAVAILABLE', {
            retryable: true,
          })
        } catch (error) {
          networkStatus.noteRequestFailure()
          try {
            const localResult = await kvLocalProvider.loadData(key)
            if (localResult && localResult.success !== false) {
              return localResult
            }
          } catch (e) {
            console.warn('本地数据加载失败:', e)
          }
          return formatError('数据加载失败: ' + error.message, 'LOAD_ERROR')
        }
      } else {
        // 离线时：双模式可使用本地缓存
        try {
          const localResult = await kvLocalProvider.loadData(key)
          if (localResult && localResult.success !== false) {
            return localResult
          }
          return formatError('离线且本地无数据', 'DATA_NOT_FOUND')
        } catch (error) {
          return formatError('离线数据加载失败: ' + error.message, 'LOCAL_LOAD_ERROR')
        }
      }
    }

    // 默认：本地模式
    try {
      const result = await kvLocalProvider.loadData(key)
      if (result && result.success !== false) {
        return result
      }
      return result ?? formatError('本地数据不存在', 'DATA_NOT_FOUND')
    } catch (error) {
      return formatError('本地数据加载失败: ' + error.message, 'LOCAL_LOAD_ERROR')
    }
  },

  saveData: async (key, data) => {
    const provider = getSetting('server.provider')

    // 严格模式：仅本地
    if (provider === 'local') {
      try {
        const result = await kvLocalProvider.saveData(key, data)
        if (result && result.success !== false) {
          return { success: true, source: 'local' }
        }
        return formatError('本地保存失败', 'LOCAL_SAVE_ERROR')
      } catch (error) {
        return formatError('本地保存失败: ' + error.message, 'LOCAL_SAVE_ERROR')
      }
    }

    // 严格模式：仅云端（不访问本地）
    if (provider === 'kv-server' || provider === 'classworkscloud') {
      if (!networkStatus.isOnline()) {
        return formatError('网络不可用', 'NETWORK_OFFLINE')
      }
      try {
        const result = await rmwWriteServer(key, data)
        if (result && result.success !== false) {
          networkStatus.noteRequestSuccess()
          // 检查并通知冲突
          if (result.conflicts && result.conflicts.length > 0) {
            notifyRmwConflict(key, result.conflicts, data, result.serverOriginal)
          }
          return { success: true, source: 'cloud' }
        }

        // 该模式没有本地副本：确认无法写入时把数据暂存在本页，避免用户输入直接丢失。
        // 只暂存可重试的失败；401/403 这类确定性拒绝入暂存只会永远补写不上。
        const retryable = result?.error?.retryable === true
        if (retryable) {
          networkStatus.noteRequestFailure()
          spoolWrite(key, data)
          return formatError(
            '云端保存失败，内容已暂存于本页，联网后自动补写',
            'SERVER_SAVE_ERROR',
            {
              retryable: true,
              spooled: true,
            },
          )
        }
        return formatError(
          result?.error?.message || '云端保存失败',
          result?.error?.code || 'SERVER_SAVE_ERROR',
        )
      } catch (error) {
        networkStatus.noteRequestFailure()
        spoolWrite(key, data)
        return formatError(
          '云端保存失败，内容已暂存于本页，联网后自动补写：' + error.message,
          'SERVER_SAVE_ERROR',
          { retryable: true, spooled: true },
        )
      }
    }

    // 双模式：云端和本地都存储完整数据
    if (isDualMode(provider)) {
      if (networkStatus.isOnline()) {
        try {
          const [localResult, serverResult] = await Promise.all([
            kvLocalProvider.saveData(key, data),
            rmwWriteServer(key, data),
          ])

          const localOk = localResult && localResult.success !== false
          const serverOk = serverResult && serverResult.success !== false

          if (serverOk) {
            networkStatus.noteRequestSuccess()
          }

          if (serverOk && localOk) {
            await kvLocalProvider.removeKeyFromOfflineQueue(key).catch(() => {})
            clearLocalWriteFailure(key)
            // 检查并通知冲突
            if (serverResult.conflicts && serverResult.conflicts.length > 0) {
              notifyRmwConflict(key, serverResult.conflicts, data, serverResult.serverOriginal)
            }
            return { success: true, source: 'dual' }
          }

          if (serverOk) {
            // 云端已成功、本地失败：先原地重试一次（IndexedDB 失败常是瞬时/配额问题）
            const retryLocal = await kvLocalProvider.saveData(key, data).catch(() => null)
            if (retryLocal && retryLocal.success !== false) {
              await kvLocalProvider.removeKeyFromOfflineQueue(key).catch(() => {})
              clearLocalWriteFailure(key)
              if (serverResult.conflicts && serverResult.conflicts.length > 0) {
                notifyRmwConflict(key, serverResult.conflicts, data, serverResult.serverOriginal)
              }
              return { success: true, source: 'dual', localRetried: true }
            }

            // 重试仍失败 → 登记（设置页可见），但不做应用内通知（遵守自动保存不通知的约定）
            recordLocalWriteFailure(key)
            // 检查并通知冲突
            if (serverResult.conflicts && serverResult.conflicts.length > 0) {
              notifyRmwConflict(key, serverResult.conflicts, data, serverResult.serverOriginal)
            }
            // 本地写失败（IndexedDB 异常等）不再静默：数据在云端是安全的，
            // 但本地副本已过期，必须让上层可见（localFailed 由调用方决定如何提示）
            return { success: true, source: 'cloud', localFailed: true }
          }

          if (localOk) {
            await kvLocalProvider.addToOfflineQueue(key).catch(() => {})
            backgroundSync.scheduleImmediate()
            // 产品要求：**云端写入失败 + 本地写入成功 → 立即把整个应用标记为离线**。
            // 目的：立刻切到「离线：仅本地 + 入队」快路径，后续保存不必每次都为云端失败等满超时，
            // 同时让离线横幅明确告知"数据已保存到本地"。恢复交给心跳（≤30s，一次成功即恢复）。
            // 例外说明：读取失败（loadData）不走这条路，只记证据，避免一次读故障就宣告离线。
            networkStatus.markServerUnreachable()
            return { success: true, source: 'local', serverFailed: true }
          }

          return formatError('保存失败：云端和本地均不可用', 'SAVE_FAILED', { retryable: true })
        } catch (error) {
          networkStatus.noteRequestFailure()
          try {
            const localResult = await kvLocalProvider.saveData(key, data)
            if (localResult && localResult.success !== false) {
              await kvLocalProvider.addToOfflineQueue(key).catch(() => {})
              backgroundSync.scheduleImmediate()
              // 与上一分支同义：云端写入抛错 + 本地写入成功 → 立即标记离线，切本地优先快路径
              networkStatus.markServerUnreachable()
              return { success: true, source: 'local', serverFailed: true }
            }
          } catch (e) {
            console.warn('本地数据保存失败:', e)
          }
          return formatError('保存失败: ' + error.message, 'SAVE_ERROR')
        }
      } else {
        // 离线时：仅保存到本地，加入离线队列
        try {
          const localResult = await kvLocalProvider.saveData(key, data)
          if (localResult && localResult.success !== false) {
            await kvLocalProvider.addToOfflineQueue(key).catch(() => {})
            backgroundSync.scheduleImmediate()
            return { success: true, source: 'local-offline' }
          }
          return formatError('本地保存失败', 'LOCAL_SAVE_ERROR')
        } catch (error) {
          return formatError('本地保存失败: ' + error.message, 'LOCAL_SAVE_ERROR')
        }
      }
    }

    // 默认：本地模式
    try {
      const result = await kvLocalProvider.saveData(key, data)
      if (result && result.success !== false) {
        return { success: true, source: 'local' }
      }
      return formatError('本地保存失败', 'LOCAL_SAVE_ERROR')
    } catch (error) {
      return formatError('本地保存失败: ' + error.message, 'LOCAL_SAVE_ERROR')
    }
  },

  loadKeys: async (options = {}) => {
    const provider = getSetting('server.provider')
    const isDual = isDualMode(provider)
    const isCloudOnly = provider === 'kv-server' || provider === 'classworkscloud'
    const useServer = isDual || isCloudOnly

    if (useServer && isDual) {
      const [cloudResult, localResult] = await Promise.all([
        kvServerProvider.loadKeys(options).catch(() => null),
        kvLocalProvider.loadKeys(options).catch(() => null),
      ])

      const cloudKeys = cloudResult?.keys || []
      const localKeys = localResult?.keys || []
      const allKeys = [...new Set([...cloudKeys, ...localKeys])]

      return { keys: allKeys, total_rows: allKeys.length }
    }

    if (useServer) {
      return kvServerProvider.loadKeys(options)
    }
    return kvLocalProvider.loadKeys(options)
  },

  async getKeyCloudUrl(key, options = {}) {
    const { migrateFromLocal = true, autoConfigureCloud = true } = options

    try {
      const provider = getSetting('server.provider')
      let serverUrl

      if (provider === 'classworkscloud' || provider === 'dual-cloud') {
        serverUrl = getEffectiveServerUrl()
      } else {
        serverUrl = getSetting('server.domain')
      }

      let siteKey = getSetting('server.siteKey')
      const machineId = getSetting('device.uuid')
      let configured = false

      if (!serverUrl || !machineId) {
        if (autoConfigureCloud) {
          const classworksCloudDefaults = {
            'server.domain':
              import.meta.env.VITE_DEFAULT_KV_SERVER || 'https://kv-service.houlang.cloud',
            'server.siteKey': '',
          }

          if (!serverUrl) {
            setSetting('server.domain', classworksCloudDefaults['server.domain'])
            serverUrl = classworksCloudDefaults['server.domain']
            configured = true
          }

          if (!siteKey) {
            setSetting('server.siteKey', classworksCloudDefaults['server.siteKey'])
            siteKey = classworksCloudDefaults['server.siteKey']
          }

          setSetting('server.provider', 'classworkscloud')
          serverUrl = getEffectiveServerUrl()
        } else {
          return formatError('云端配置无效，请检查服务器域名和设备UUID', 'CONFIG_ERROR')
        }
      }

      let migrated = false

      if (migrateFromLocal) {
        try {
          const localData = await kvLocalProvider.loadData(key)

          if (localData && localData.success !== false) {
            const cloudData = await kvServerProvider.loadData(key)

            if (cloudData && cloudData.success === false && cloudData.error?.code === 'NOT_FOUND') {
              const saveResult = await kvServerProvider.saveData(key, localData)
              if (saveResult && saveResult.success !== false) {
                migrated = true
                console.log(`已成功将键 ${key} 的数据从本地迁移到云端`)
              }
            }
          }
        } catch (error) {
          console.warn(`迁移键 ${key} 的数据时出错:`, error)
        }
      }
      const authtoken = getSetting('server.kvToken')
      let url = `${serverUrl}/kv/${key}?token=${authtoken}`

      return {
        success: true,
        url,
        migrated,
        configured,
      }
    } catch (error) {
      console.error('获取键云端地址时出错:', error)
      return formatError(error.message || '获取键云端地址失败', 'CLOUD_URL_ERROR')
    }
  },

  async syncAllToLocal() {
    const provider = getSetting('server.provider')
    const useServer =
      provider === 'kv-server' ||
      provider === 'classworkscloud' ||
      provider === 'dual-cloud' ||
      provider === 'dual-server'
    if (!useServer) {
      return formatError('当前不是云端模式', 'CONFIG_ERROR')
    }

    const keysResult = await loadAllKeys((opts) => kvServerProvider.loadKeys(opts))
    if (!keysResult) {
      return formatError('获取云端键列表失败', 'SYNC_ERROR')
    }

    const total = keysResult.keys.length
    let synced = 0
    let failed = 0
    const failedKeys = []

    await runWithConcurrency(keysResult.keys, SYNC_CONCURRENCY, async (key) => {
      try {
        const data = await kvServerProvider.loadData(key)
        if (data && data.success !== false) {
          const localData = await kvLocalProvider.loadData(key).catch(() => null)
          if (
            localData &&
            localData.success !== false &&
            computeDataHash(localData) === computeDataHash(data)
          ) {
            return
          }
          await kvLocalProvider.saveData(key, data)
          synced++
        } else {
          failed++
          failedKeys.push(key)
        }
      } catch {
        failed++
        failedKeys.push(key)
      }
    })

    return { success: true, synced, failed, failedKeys, total }
  },

  async syncAllToCloud() {
    const provider = getSetting('server.provider')
    const useServer =
      provider === 'kv-server' ||
      provider === 'classworkscloud' ||
      provider === 'dual-cloud' ||
      provider === 'dual-server'
    if (!useServer) {
      return formatError('当前不是云端模式', 'CONFIG_ERROR')
    }

    const keysResult = await loadAllKeys((opts) => kvLocalProvider.loadKeys(opts))
    if (!keysResult) {
      return formatError('获取本地键列表失败', 'SYNC_ERROR')
    }

    const total = keysResult.keys.length
    let synced = 0
    let failed = 0
    const failedKeys = []

    await runWithConcurrency(keysResult.keys, SYNC_CONCURRENCY, async (key) => {
      try {
        const data = await kvLocalProvider.loadData(key)
        if (data && data.success !== false) {
          const result = await kvServerProvider.saveData(key, data)
          if (result && result.success !== false) {
            synced++
          } else {
            failed++
            failedKeys.push(key)
          }
        } else {
          failed++
          failedKeys.push(key)
        }
      } catch {
        failed++
        failedKeys.push(key)
      }
    })

    return { success: true, synced, failed, failedKeys, total }
  },

  async getSyncStatus() {
    const provider = getSetting('server.provider')
    const useServer =
      provider === 'kv-server' ||
      provider === 'classworkscloud' ||
      provider === 'dual-cloud' ||
      provider === 'dual-server'

    if (!useServer) {
      return { mode: 'local-only' }
    }

    // 本地键列表（本地一定可用）
    const localKeysResult = await loadAllKeys((opts) => kvLocalProvider.loadKeys(opts)).catch(
      () => null,
    )
    const localKeySet = new Set(localKeysResult?.keys || [])

    // 云端键列表（可能不可达）
    const cloudKeysResult = await loadAllKeys((opts) => kvServerProvider.loadKeys(opts)).catch(
      () => null,
    )
    if (!cloudKeysResult) {
      return {
        mode: 'dual',
        cloudCount: 0,
        localCount: localKeySet.size,
        cloudAvailable: false,
      }
    }

    const cloudKeySet = new Set(cloudKeysResult.keys || [])
    const onlyInCloud = [...cloudKeySet].filter((k) => !localKeySet.has(k))
    const onlyInLocal = [...localKeySet].filter((k) => !cloudKeySet.has(k))
    const inBoth = [...cloudKeySet].filter((k) => localKeySet.has(k))

    return {
      mode: 'dual',
      cloudCount: cloudKeySet.size,
      localCount: localKeySet.size,
      synced: inBoth.length,
      onlyInCloud: onlyInCloud.length,
      onlyInLocal: onlyInLocal.length,
      cloudAvailable: true,
    }
  },

  async loadStorageInfo() {
    return kvLocalProvider.getStorageInfo()
  },
}

export const ErrorCodes = {
  NOT_FOUND: '数据不存在',
  NETWORK_ERROR: '网络连接失败',
  SERVER_ERROR: '服务器错误',
  SAVE_ERROR: '保存失败',
  CONFIG_ERROR: '配置错误',
  PERMISSION_DENIED: '无权限访问',
  UNAUTHORIZED: '认证失败',
  CLOUD_URL_ERROR: '云端地址获取失败',
  SYNC_ERROR: '同步错误',
  UNKNOWN_ERROR: '未知错误',
}
