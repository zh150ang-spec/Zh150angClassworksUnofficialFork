import { getSetting } from '@/utils/settings'
import { kvLocalProvider } from '@/utils/providers/kvLocalProvider'
import { kvServerProvider } from '@/utils/providers/kvServerProvider'
import { networkStatus } from '@/utils/networkStatus'
import { rmwWriteServer } from '@/utils/rmw'
import { loadAllKeys, runWithConcurrency, SYNC_CONCURRENCY } from '@/utils/syncHelpers'
import { acquireLock } from '@/utils/crossTabLock'
import { BACKGROUND_RETRY_POLICY } from '@/utils/netRetryPolicy'

const IMMEDIATE_BACKOFF_DELAYS = [30000, 60000, 120000, 300000]
const MAX_IMMEDIATE_ATTEMPTS = 4
// 跨标签页同步锁：租约超时后通知调用方停手，再给宽限期收尾（见 crossTabLock.js）
const SYNC_LOCK_TIMEOUT = 30000
const SYNC_LOCK_GRACE_MS = 15000
const SYNC_LOCK_NAME = 'classworks-background-sync'
// 密集保存时的最小同步间隔：避免"每次保存都立刻打一次服务器"（P1-8）
const IMMEDIATE_MIN_GAP_MS = 10000

/**
 * 后台同步的请求级选项：后台可以比交互慢一些（3 次 / 45s），
 * 并带上租约 signal —— 锁失效时在途请求会被中止，而不是跑完才停手。
 * @param {AbortSignal} [signal]
 */
const backgroundRequestOptions = (signal) => ({
  retryPolicy: BACKGROUND_RETRY_POLICY,
  signal,
})

const BackgroundSyncService = {
  _intervalId: null,
  _isRunning: false,
  _lastSyncTime: null,
  _syncedCount: 0,
  _maxRetryAttempts: 3,
  _lastQueueLength: 0,
  _isReadOnly: false,
  _isSyncing: false,
  _immediateTimerId: null,
  _immediateAttempts: 0,
  _immediateRunning: false,
  _lastImmediateAt: 0,
  _lastLeaseLostReason: null,
  _networkUnsubscribe: null,

  _getMinInterval() {
    const seconds = getSetting('sync.minInterval') || 600
    return seconds * 1000
  },

  _getMaxInterval() {
    const seconds = getSetting('sync.maxInterval') || 1200
    return seconds * 1000
  },

  _isEnabled() {
    return getSetting('sync.enabled') !== false
  },

  _isDualMode() {
    const provider = getSetting('server.provider')
    return provider === 'dual-cloud' || provider === 'dual-server'
  },

  _getRandomInterval() {
    const min = this._getMinInterval()
    const max = this._getMaxInterval()
    return Math.floor(Math.random() * (max - min)) + min
  },

  setReadOnlyState(isReadOnly) {
    this._isReadOnly = !!isReadOnly
  },

  async _retryWithBackoff(operation, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation()
        if (result && result.success !== false) {
          return result
        }
      } catch (error) {
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
          await new Promise((resolve) => setTimeout(resolve, delay))
        } else {
          throw error
        }
      }
    }
    return null
  },

  async _checkAndSync() {
    if (this._isSyncing) return
    if (!this._isDualMode()) return
    if (!networkStatus.isBrowserOnline()) return

    // 可中止租约：超时只通知调用方停手，锁由本函数在 finally 里真正释放。
    // 不允许"超时就替调用方释放锁"——那会让两个标签页同时同步（P1-7）。
    const lease = await acquireLock(SYNC_LOCK_NAME, {
      timeoutMs: SYNC_LOCK_TIMEOUT,
      graceMs: SYNC_LOCK_GRACE_MS,
      onLeaseLost: (reason) => {
        this._lastLeaseLostReason = reason
      },
    })
    if (!lease) {
      // 其他标签页正在同步，跳过本次（数据一致性由 RMW 保障）
      return
    }

    this._isSyncing = true
    try {
      await this._doSyncPhases(lease.signal)
    } catch (error) {
      console.error('后台同步出错:', error)
    } finally {
      this._isSyncing = false
      lease.release()
    }
  },

  async _doSyncPhases(signal) {
    const aborted = () => signal?.aborted === true

    // 阶段1：处理离线队列（上行，仅非只读角色）
    if (!this._isReadOnly && !aborted()) {
      await this._syncOfflineQueue(signal)
    }
    if (aborted()) return

    // 获取双方键列表（阶段2和阶段3共用）
    const requestOptions = backgroundRequestOptions(signal)
    const [cloudKeysResult, localKeysResult] = await Promise.all([
      loadAllKeys((opts) => kvServerProvider.loadKeys(opts, requestOptions)),
      loadAllKeys((opts) => kvLocalProvider.loadKeys(opts)),
    ])

    if (
      !cloudKeysResult ||
      cloudKeysResult.success === false ||
      !localKeysResult ||
      localKeysResult.success === false
    ) {
      return
    }

    networkStatus.markServerReachable()

    const cloudKeys = cloudKeysResult.keys || []
    const localKeys = localKeysResult.keys || []
    const cloudKeysSet = new Set(cloudKeys)
    const localKeysSet = new Set(localKeys)

    // 阶段2：上行 - 本地有云端没有的，上传（仅非只读角色）
    if (!this._isReadOnly && !aborted()) {
      await this._syncMissingToCloud(localKeys, cloudKeysSet, signal)
    }
    if (aborted()) return

    // 阶段3：下行 - 云端有本地没有的，下载到本地（所有角色）
    await this._syncMissingToLocal(cloudKeys, localKeysSet, signal)
  },

  async _syncOfflineQueue(signal) {
    const offlineQueueResult = await kvLocalProvider.getOfflineQueue()
    if (
      !offlineQueueResult ||
      offlineQueueResult.success === false ||
      !offlineQueueResult.data ||
      offlineQueueResult.data.length === 0
    ) {
      this._lastQueueLength = 0
      return
    }

    this._lastQueueLength = offlineQueueResult.data.length

    const requestOptions = backgroundRequestOptions(signal)
    const results = await runWithConcurrency(
      offlineQueueResult.data,
      SYNC_CONCURRENCY,
      async (item) => {
        // 租约失效：尽快停手，不再发起新的请求
        if (signal?.aborted) return 0
        try {
          const localData = await kvLocalProvider.loadData(item.key)
          if (localData && localData.success !== false) {
            const saveResult = await this._retryWithBackoff(
              () => rmwWriteServer(item.key, localData, kvServerProvider, requestOptions),
              1,
            )
            if (saveResult && saveResult.success !== false) {
              await kvLocalProvider.removeFromOfflineQueue(item.id)
              return 1
            }
          }
        } catch (e) {
          console.warn(`同步离线队列键 ${item.key} 失败:`, e)
        }
        return 0
      },
    )

    const queueSynced = results.reduce((sum, val) => sum + val, 0)
    if (queueSynced > 0) {
      this._syncedCount += queueSynced
      this._lastSyncTime = Date.now()
      networkStatus.markServerReachable()
    }

    const remainingResult = await kvLocalProvider.getOfflineQueue()
    if (remainingResult && remainingResult.success !== false && remainingResult.data) {
      this._lastQueueLength = remainingResult.data.length
    }
  },

  async _syncMissingToCloud(localKeys, cloudKeysSet, signal) {
    const missingInCloud = localKeys.filter((key) => !cloudKeysSet.has(key))
    if (missingInCloud.length === 0) return

    const requestOptions = backgroundRequestOptions(signal)
    const results = await runWithConcurrency(missingInCloud, SYNC_CONCURRENCY, async (key) => {
      if (signal?.aborted) return 0
      try {
        const localData = await kvLocalProvider.loadData(key)
        if (localData && localData.success !== false) {
          const saveResult = await this._retryWithBackoff(
            () => rmwWriteServer(key, localData, kvServerProvider, requestOptions),
            1,
          )
          if (saveResult && saveResult.success !== false) {
            return 1
          }
        }
      } catch (e) {
        console.warn(`上传键 ${key} 失败:`, e)
      }
      return 0
    })

    const synced = results.reduce((sum, val) => sum + val, 0)
    if (synced > 0) {
      this._syncedCount += synced
      this._lastSyncTime = Date.now()
    }
  },

  async _syncMissingToLocal(cloudKeys, localKeysSet, signal) {
    const missingInLocal = cloudKeys.filter((key) => !localKeysSet.has(key))
    if (missingInLocal.length === 0) return

    const requestOptions = backgroundRequestOptions(signal)
    const results = await runWithConcurrency(missingInLocal, SYNC_CONCURRENCY, async (key) => {
      if (signal?.aborted) return 0
      try {
        const cloudData = await this._retryWithBackoff(
          () => kvServerProvider.loadData(key, requestOptions),
          this._maxRetryAttempts,
        )
        if (cloudData && cloudData.success !== false) {
          await kvLocalProvider.saveData(key, cloudData).catch(() => {})
          return 1
        }
      } catch (e) {
        console.warn(`下载键 ${key} 失败:`, e)
      }
      return 0
    })

    const downloaded = results.reduce((sum, val) => sum + val, 0)
    if (downloaded > 0) {
      this._syncedCount += downloaded
      this._lastSyncTime = Date.now()
    }
  },

  scheduleImmediate() {
    if (!this._isDualMode() || !this._isEnabled()) return
    if (!networkStatus.isBrowserOnline()) return

    // ⚠️ 这里**不重置** _immediateAttempts。退避是"失败回合"的状态，
    // 每次编辑都归零会让 30s→60s→120s→300s 的阶梯永远爬不上去（P1-8），
    // 表现为持续编辑时每 30s（甚至每次保存）就打一次服务器。
    const sinceLast = Date.now() - this._lastImmediateAt
    if (sinceLast < IMMEDIATE_MIN_GAP_MS) {
      // 已有待跑的同步（退避定时器或补跑定时器）→ 吸收本次触发，不动退避状态
      if (this._immediateTimerId) return
      this._immediateTimerId = setTimeout(() => {
        this._immediateTimerId = null
        this._doImmediateSync()
      }, IMMEDIATE_MIN_GAP_MS - sinceLast)
      return
    }

    // 立刻执行：先清掉待跑的退避定时器，避免叠加出多个并发同步
    if (this._immediateTimerId) {
      clearTimeout(this._immediateTimerId)
      this._immediateTimerId = null
    }
    this._lastImmediateAt = Date.now()
    this._doImmediateSync()
  },

  /** 开启新的失败回合：退避从 30s 重新起算（仅网络恢复 / 手动同步时调用） */
  _resetImmediateBackoff() {
    this._immediateAttempts = 0
    this._lastImmediateAt = 0
  },

  async _doImmediateSync() {
    // 重入保护：本轮未结束时不再并发发起（否则会排出多个定时器）
    if (this._immediateRunning) return
    this._immediateRunning = true
    try {
      await this._checkAndSync()

      const queueResult = await kvLocalProvider.getOfflineQueue().catch(() => null)
      const queueLen = queueResult && queueResult.data ? queueResult.data.length : 0

      if (
        queueLen > 0 &&
        this._immediateAttempts < MAX_IMMEDIATE_ATTEMPTS &&
        networkStatus.isBrowserOnline()
      ) {
        this._immediateAttempts++
        const delay =
          IMMEDIATE_BACKOFF_DELAYS[
            Math.min(this._immediateAttempts - 1, IMMEDIATE_BACKOFF_DELAYS.length - 1)
          ]
        // 防叠加：覆盖前先清掉可能已存在的定时器
        if (this._immediateTimerId) {
          clearTimeout(this._immediateTimerId)
        }
        this._immediateTimerId = setTimeout(() => {
          this._immediateTimerId = null
          this._doImmediateSync()
        }, delay)
      } else {
        // 队列已清空 / 达到尝试上限 / 离线 → 结束本轮失败回合
        this._immediateAttempts = 0
      }
    } finally {
      this._immediateRunning = false
    }
  },

  _scheduleNext() {
    if (this._intervalId) {
      clearTimeout(this._intervalId)
    }

    const delay = this._getRandomInterval()
    this._intervalId = setTimeout(async () => {
      if (this._isRunning && this._isEnabled()) {
        await this._checkAndSync()
        this._scheduleNext()
      }
    }, delay)
  },

  start() {
    if (this._isRunning) return

    if (!this._isEnabled()) return

    this._isRunning = true
    this._scheduleNext()

    this._networkUnsubscribe = networkStatus.subscribe((event) => {
      if (event.type === 'online' && event.wasOffline) {
        // 网络恢复是新的失败回合：退避重新从 30s 起算
        this._resetImmediateBackoff()
        this.scheduleImmediate()
      }
    })
  },

  stop() {
    this._isRunning = false
    if (this._intervalId) {
      clearTimeout(this._intervalId)
      this._intervalId = null
    }
    if (this._immediateTimerId) {
      clearTimeout(this._immediateTimerId)
      this._immediateTimerId = null
    }
    this._resetImmediateBackoff()
    if (this._networkUnsubscribe) {
      this._networkUnsubscribe()
      this._networkUnsubscribe = null
    }
  },

  restart() {
    this.stop()
    this.start()
  },

  isActive() {
    return this._isRunning
  },

  getLastSyncTime() {
    return this._lastSyncTime
  },

  getSyncedCount() {
    return this._syncedCount
  },

  async forceSyncNow() {
    if (this._isDualMode()) {
      // 用户手动同步视为新的失败回合
      this._resetImmediateBackoff()
      await this._checkAndSync()
    }
  },

  getStatus() {
    const netStatus = networkStatus.getEffectiveStatus()
    return {
      isRunning: this._isRunning,
      isEnabled: this._isEnabled(),
      lastSyncTime: this._lastSyncTime,
      syncedCount: this._syncedCount,
      queueLength: this._lastQueueLength,
      minInterval: this._getMinInterval(),
      maxInterval: this._getMaxInterval(),
      isDualMode: this._isDualMode(),
      isReadOnly: this._isReadOnly,
      isSyncing: this._isSyncing,
      immediateAttempts: this._immediateAttempts,
      lastLeaseLostReason: this._lastLeaseLostReason,
      browserOnline: netStatus.browserOnline,
      serverReachable: netStatus.serverReachable,
    }
  },
}

export default BackgroundSyncService
