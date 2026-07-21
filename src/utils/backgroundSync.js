import {getSetting} from "./settings";
import {kvLocalProvider} from "./providers/kvLocalProvider";
import {kvServerProvider} from "./providers/kvServerProvider";
import {networkStatus} from "./networkStatus";
import {rmwWriteServer} from "./rmw";

const SYNC_CONCURRENCY = 5
const KEYS_PAGE_SIZE = 1000
const IMMEDIATE_BACKOFF_DELAYS = [30000, 60000, 120000, 300000]
const MAX_IMMEDIATE_ATTEMPTS = 4

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
  _networkUnsubscribe: null,

  _getMinInterval() {
    const seconds = getSetting("sync.minInterval") || 600;
    return seconds * 1000;
  },

  _getMaxInterval() {
    const seconds = getSetting("sync.maxInterval") || 1200;
    return seconds * 1000;
  },

  _isEnabled() {
    return getSetting("sync.enabled") !== false;
  },

  _isDualMode() {
    const provider = getSetting("server.provider");
    return provider === "dual-cloud" || provider === "dual-server";
  },

  _getRandomInterval() {
    const min = this._getMinInterval();
    const max = this._getMaxInterval();
    return Math.floor(Math.random() * (max - min)) + min;
  },

  setReadOnlyState(isReadOnly) {
    this._isReadOnly = !!isReadOnly;
  },

  async _runWithConcurrency(items, limit, operation) {
    const results = [];
    for (let i = 0; i < items.length; i += limit) {
      const batch = items.slice(i, i + limit);
      const batchResults = await Promise.all(batch.map(operation));
      results.push(...batchResults);
    }
    return results;
  },

  async _loadAllKeys(loadFn) {
    const allKeys = [];
    let skip = 0;

    while (true) {
      const result = await loadFn({limit: KEYS_PAGE_SIZE, skip}).catch(() => null);
      if (!result || result.success === false) {
        return null;
      }

      const keys = result.keys || [];
      allKeys.push(...keys);

      const totalRows = result.total_rows || 0;
      if (allKeys.length >= totalRows || keys.length < KEYS_PAGE_SIZE) {
        break;
      }

      skip += KEYS_PAGE_SIZE;
    }

    return {keys: allKeys, success: true};
  },

  async _retryWithBackoff(operation, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        if (result && result.success !== false) {
          return result;
        }
      } catch (error) {
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    return null;
  },

  async _checkAndSync() {
    if (this._isSyncing) return;
    if (!this._isDualMode()) return;
    if (!networkStatus.isBrowserOnline()) return;

    this._isSyncing = true;
    try {
      await this._doSyncPhases();
    } catch (error) {
      console.error("后台同步出错:", error);
    } finally {
      this._isSyncing = false;
    }
  },

  async _doSyncPhases() {
    // 阶段1：处理离线队列（上行，仅非只读角色）
    if (!this._isReadOnly) {
      await this._syncOfflineQueue();
    }

    // 获取双方键列表（阶段2和阶段3共用）
    const [cloudKeysResult, localKeysResult] = await Promise.all([
      this._loadAllKeys((opts) => kvServerProvider.loadKeys(opts)),
      this._loadAllKeys((opts) => kvLocalProvider.loadKeys(opts))
    ]);

    if (!cloudKeysResult || cloudKeysResult.success === false ||
        !localKeysResult || localKeysResult.success === false) {
      return;
    }

    networkStatus.markServerReachable();

    const cloudKeys = cloudKeysResult.keys || [];
    const localKeys = localKeysResult.keys || [];
    const cloudKeysSet = new Set(cloudKeys);
    const localKeysSet = new Set(localKeys);

    // 阶段2：上行 - 本地有云端没有的，上传（仅非只读角色）
    if (!this._isReadOnly) {
      await this._syncMissingToCloud(localKeys, cloudKeysSet);
    }

    // 阶段3：下行 - 云端有本地没有的，下载到本地（所有角色）
    await this._syncMissingToLocal(cloudKeys, localKeysSet);
  },

  async _syncOfflineQueue() {
    const offlineQueueResult = await kvLocalProvider.getOfflineQueue();
    if (!offlineQueueResult || offlineQueueResult.success === false || !offlineQueueResult.data || offlineQueueResult.data.length === 0) {
      this._lastQueueLength = 0;
      return;
    }

    this._lastQueueLength = offlineQueueResult.data.length;

    const results = await this._runWithConcurrency(
      offlineQueueResult.data,
      SYNC_CONCURRENCY,
      async (item) => {
        try {
          const localData = await kvLocalProvider.loadData(item.key);
          if (localData && localData.success !== false) {
            const saveResult = await this._retryWithBackoff(
              () => rmwWriteServer(item.key, localData),
              1
            );
            if (saveResult && saveResult.success !== false) {
              await kvLocalProvider.removeFromOfflineQueue(item.id);
              return 1;
            }
          }
        } catch (e) {
          console.warn(`同步离线队列键 ${item.key} 失败:`, e);
        }
        return 0;
      }
    );

    const queueSynced = results.reduce((sum, val) => sum + val, 0);
    if (queueSynced > 0) {
      this._syncedCount += queueSynced;
      this._lastSyncTime = Date.now();
      networkStatus.markServerReachable();
    }

    const remainingResult = await kvLocalProvider.getOfflineQueue();
    if (remainingResult && remainingResult.success !== false && remainingResult.data) {
      this._lastQueueLength = remainingResult.data.length;
    }
  },

  async _syncMissingToCloud(localKeys, cloudKeysSet) {
    const missingInCloud = localKeys.filter(key => !cloudKeysSet.has(key));
    if (missingInCloud.length === 0) return;

    const results = await this._runWithConcurrency(
      missingInCloud,
      SYNC_CONCURRENCY,
      async (key) => {
        try {
          const localData = await kvLocalProvider.loadData(key);
          if (localData && localData.success !== false) {
            const saveResult = await this._retryWithBackoff(
              () => rmwWriteServer(key, localData),
              1
            );
            if (saveResult && saveResult.success !== false) {
              return 1;
            }
          }
        } catch (e) {
          console.warn(`上传键 ${key} 失败:`, e);
        }
        return 0;
      }
    );

    const synced = results.reduce((sum, val) => sum + val, 0);
    if (synced > 0) {
      this._syncedCount += synced;
      this._lastSyncTime = Date.now();
    }
  },

  async _syncMissingToLocal(cloudKeys, localKeysSet) {
    const missingInLocal = cloudKeys.filter(key => !localKeysSet.has(key));
    if (missingInLocal.length === 0) return;

    const results = await this._runWithConcurrency(
      missingInLocal,
      SYNC_CONCURRENCY,
      async (key) => {
        try {
          const cloudData = await this._retryWithBackoff(
            () => kvServerProvider.loadData(key),
            this._maxRetryAttempts
          );
          if (cloudData && cloudData.success !== false) {
            await kvLocalProvider.saveData(key, cloudData).catch(() => {});
            return 1;
          }
        } catch (e) {
          console.warn(`下载键 ${key} 失败:`, e);
        }
        return 0;
      }
    );

    const downloaded = results.reduce((sum, val) => sum + val, 0);
    if (downloaded > 0) {
      this._syncedCount += downloaded;
      this._lastSyncTime = Date.now();
    }
  },

  scheduleImmediate() {
    if (!this._isDualMode() || !this._isEnabled()) return;
    if (!networkStatus.isBrowserOnline()) return;

    if (this._immediateTimerId) {
      clearTimeout(this._immediateTimerId);
      this._immediateTimerId = null;
    }

    this._immediateAttempts = 0;
    this._doImmediateSync();
  },

  async _doImmediateSync() {
    await this._checkAndSync();

    const queueResult = await kvLocalProvider.getOfflineQueue().catch(() => null);
    const queueLen = (queueResult && queueResult.data) ? queueResult.data.length : 0;

    if (queueLen > 0 && this._immediateAttempts < MAX_IMMEDIATE_ATTEMPTS && networkStatus.isBrowserOnline()) {
      this._immediateAttempts++;
      const delay = IMMEDIATE_BACKOFF_DELAYS[Math.min(this._immediateAttempts - 1, IMMEDIATE_BACKOFF_DELAYS.length - 1)];
      this._immediateTimerId = setTimeout(() => {
        this._immediateTimerId = null;
        this._doImmediateSync();
      }, delay);
    } else {
      this._immediateAttempts = 0;
    }
  },

  _scheduleNext() {
    if (this._intervalId) {
      clearTimeout(this._intervalId);
    }

    const delay = this._getRandomInterval();
    this._intervalId = setTimeout(async () => {
      if (this._isRunning && this._isEnabled()) {
        await this._checkAndSync();
        this._scheduleNext();
      }
    }, delay);
  },

  start() {
    if (this._isRunning) return;

    if (!this._isEnabled()) return;

    this._isRunning = true;
    this._scheduleNext();

    this._networkUnsubscribe = networkStatus.subscribe((event) => {
      if (event.type === 'online' && event.wasOffline) {
        this.scheduleImmediate();
      }
    });
  },

  stop() {
    this._isRunning = false;
    if (this._intervalId) {
      clearTimeout(this._intervalId);
      this._intervalId = null;
    }
    if (this._immediateTimerId) {
      clearTimeout(this._immediateTimerId);
      this._immediateTimerId = null;
    }
    this._immediateAttempts = 0;
    if (this._networkUnsubscribe) {
      this._networkUnsubscribe();
      this._networkUnsubscribe = null;
    }
  },

  restart() {
    this.stop();
    this.start();
  },

  isActive() {
    return this._isRunning;
  },

  getLastSyncTime() {
    return this._lastSyncTime;
  },

  getSyncedCount() {
    return this._syncedCount;
  },

  async forceSyncNow() {
    if (this._isDualMode()) {
      await this._checkAndSync();
    }
  },

  getStatus() {
    const netStatus = networkStatus.getEffectiveStatus();
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
      browserOnline: netStatus.browserOnline,
      serverReachable: netStatus.serverReachable
    };
  }
};

export default BackgroundSyncService;
