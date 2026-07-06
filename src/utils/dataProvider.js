import {kvLocalProvider} from "./providers/kvLocalProvider";
import {kvServerProvider} from "./providers/kvServerProvider";
import {getSetting, setSetting} from "./settings";
import {getEffectiveServerUrl} from "./serverRotation";
import {networkStatus} from "./networkStatus";
import backgroundSync from "./backgroundSync";

export const formatResponse = (data) => data;

export const formatError = (message, code = "UNKNOWN_ERROR") => ({
  success: false,
  error: {code, message},
});

const DEFAULT_RETRY_ATTEMPTS = 2;
const RETRY_DELAY_BASE = 100;

const RMW_MAX_RETRIES = 2;

function unionByIdentity(server, local) {
  const seen = new Set()
  const result = []
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
    }
  }
  return result
}

function additiveMerge(server, local) {
  if (Array.isArray(server) && Array.isArray(local)) return unionByIdentity(server, local)
  if (local === null || server === null) return local ?? server ?? null
  if (typeof server === 'object' && typeof local === 'object') return { ...server, ...local }
  return local
}

async function rmwWriteServer(key, data) {
  let attempt = 0
  while (attempt <= RMW_MAX_RETRIES) {
    const current = await kvServerProvider.loadData(key)
    const merged = (current && current.success !== false) ? additiveMerge(current, data) : data
    const result = await kvServerProvider.saveData(key, merged)
    if (result && result.success !== false) return result
    attempt++
  }
  return formatError("云端保存失败", "SERVER_SAVE_ERROR")
}

async function retryOperation(operation, maxRetries = DEFAULT_RETRY_ATTEMPTS) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (result && result.success !== false) {
        return result;
      }
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_BASE * (attempt + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_BASE * (attempt + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

let _isReadOnly = false;

function isEmptyArray(value) {
  return Array.isArray(value) && value.length === 0;
}

function mergeData(local, cloud, isReadOnly) {
  if (!cloud) return local;
  if (!local) return cloud;

  if (Array.isArray(local) && Array.isArray(cloud)) {
    if (isReadOnly) {
      if (isEmptyArray(cloud) && !isEmptyArray(local)) return [...local];
      return [...cloud];
    }
    if (isEmptyArray(local) && !isEmptyArray(cloud)) return [...cloud];
    return [...local];
  }

  if (typeof local === 'object' && typeof cloud === 'object') {
    if (isReadOnly) {
      const merged = { ...cloud };
      for (const key of Object.keys(local)) {
        if (!(key in cloud)) {
          merged[key] = local[key];
        } else if (typeof local[key] === 'object' && typeof cloud[key] === 'object') {
          merged[key] = mergeData(local[key], cloud[key], isReadOnly);
        }
      }
      return merged;
    }
    const merged = { ...local };
    for (const key of Object.keys(cloud)) {
      if (!(key in local)) {
        merged[key] = cloud[key];
      } else if (typeof local[key] === 'object' && typeof cloud[key] === 'object') {
        merged[key] = mergeData(local[key], cloud[key], isReadOnly);
      }
    }
    return merged;
  }

  return isReadOnly ? cloud : local;
}

function isDualMode(provider) {
  return provider === "dual-cloud" || provider === "dual-server";
}

// 分页加载全部键名（突破 1000 限制），与 backgroundSync._loadAllKeys 策略一致
const KEYS_PAGE_SIZE = 1000
async function loadAllKeys(loadFn) {
  const allKeys = [];
  let skip = 0;
  while (true) {
    const result = await loadFn({limit: KEYS_PAGE_SIZE, skip}).catch(() => null);
    if (!result || result.success === false) return null;
    const keys = result.keys || [];
    allKeys.push(...keys);
    const totalRows = result.total_rows || 0;
    if (allKeys.length >= totalRows || keys.length < KEYS_PAGE_SIZE) break;
    skip += KEYS_PAGE_SIZE;
  }
  return {keys: allKeys, success: true};
}

// 并发执行器（与 backgroundSync._runWithConcurrency 策略一致）
const SYNC_CONCURRENCY = 5
async function runWithConcurrency(items, limit, operation) {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map(operation));
    results.push(...batchResults);
  }
  return results;
}

export default {
  setReadOnlyState(isReadOnly) {
    _isReadOnly = !!isReadOnly;
  },

  isReadOnly() {
    return _isReadOnly;
  },

  checkNamespaceChange() {
    const currentNamespace = getSetting("device.uuid") || "";
    const lastKnown = getSetting("lastKnownNamespace") || "";

    if (!currentNamespace) {
      return { changed: false, current: "", previous: lastKnown };
    }

    if (!lastKnown) {
      setSetting("lastKnownNamespace", currentNamespace);
      return { changed: false, current: currentNamespace, previous: "" };
    }

    if (currentNamespace !== lastKnown) {
      return { changed: true, current: currentNamespace, previous: lastKnown };
    }

    return { changed: false, current: currentNamespace, previous: lastKnown };
  },

  confirmNamespaceChange() {
    const currentNamespace = getSetting("device.uuid") || "";
    setSetting("lastKnownNamespace", currentNamespace);
  },

  async exportLocalData() {
    try {
      const keysResult = await loadAllKeys((opts) => kvLocalProvider.loadKeys(opts));
      if (!keysResult) return null;

      const allData = {};
      for (const key of keysResult.keys) {
        const result = await kvLocalProvider.loadData(key);
        if (result && result.success !== false) {
          allData[key] = result;
        }
      }
      return allData;
    } catch (e) {
      console.warn("导出本地数据失败:", e);
      return null;
    }
  },

  loadData: async (key) => {
    const provider = getSetting("server.provider");

    // 严格模式：仅本地
    if (provider === "local") {
      try {
        const result = await kvLocalProvider.loadData(key);
        if (result && result.success !== false) {
          return result;
        }
        return formatError("本地数据不存在", "DATA_NOT_FOUND");
      } catch (error) {
        return formatError("本地数据加载失败: " + error.message, "LOCAL_LOAD_ERROR");
      }
    }

    // 严格模式：仅云端（不访问本地）
    if (provider === "kv-server" || provider === "classworkscloud") {
      if (!networkStatus.isOnline()) {
        return formatError("网络不可用", "NETWORK_OFFLINE");
      }
      try {
        const result = await retryOperation(() => kvServerProvider.loadData(key));
        if (result && result.success !== false) {
          return result;
        }
        return formatError("云端数据不存在", "DATA_NOT_FOUND");
      } catch (error) {
        return formatError("云端数据加载失败: " + error.message, "SERVER_LOAD_ERROR");
      }
    }

    // 双模式：云端和本地都存储完整数据
    if (isDualMode(provider)) {
      if (networkStatus.isOnline()) {
        try {
          const [localResult, serverResult] = await Promise.all([
            kvLocalProvider.loadData(key).catch(() => null),
            retryOperation(() => kvServerProvider.loadData(key))
          ]);

          const localOk = localResult && localResult.success !== false;
          const serverOk = serverResult && serverResult.success !== false;

          if (serverOk && localOk) {
            const merged = mergeData(localResult, serverResult, _isReadOnly);
            await kvLocalProvider.saveData(key, merged).catch(() => {});
            return merged;
          }

          if (serverOk) {
            await kvLocalProvider.saveData(key, serverResult).catch(() => {});
            return serverResult;
          }

          if (localOk) {
            networkStatus.markServerUnreachable();
            return localResult;
          }

          return formatError("无法加载数据：云端和本地均不可用", "DATA_UNAVAILABLE");
        } catch (error) {
          networkStatus.markServerUnreachable();
          try {
            const localResult = await kvLocalProvider.loadData(key);
            if (localResult && localResult.success !== false) {
              return localResult;
            }
          } catch (e) {
            console.warn('本地数据加载失败:', e);
          }
          return formatError("数据加载失败: " + error.message, "LOAD_ERROR");
        }
      } else {
        // 离线时：双模式可使用本地缓存
        try {
          const localResult = await kvLocalProvider.loadData(key);
          if (localResult && localResult.success !== false) {
            return localResult;
          }
          return formatError("离线且本地无数据", "DATA_NOT_FOUND");
        } catch (error) {
          return formatError("离线数据加载失败: " + error.message, "LOCAL_LOAD_ERROR");
        }
      }
    }

    // 默认：本地模式
    try {
      const result = await kvLocalProvider.loadData(key);
      if (result && result.success !== false) {
        return result;
      }
      return formatError("本地数据不存在", "DATA_NOT_FOUND");
    } catch (error) {
      return formatError("本地数据加载失败: " + error.message, "LOCAL_LOAD_ERROR");
    }
  },

  saveData: async (key, data) => {
    const provider = getSetting("server.provider");

    // 严格模式：仅本地
    if (provider === "local") {
      try {
        const result = await kvLocalProvider.saveData(key, data);
        if (result && result.success !== false) {
          return { success: true, source: "local" };
        }
        return formatError("本地保存失败", "LOCAL_SAVE_ERROR");
      } catch (error) {
        return formatError("本地保存失败: " + error.message, "LOCAL_SAVE_ERROR");
      }
    }

    // 严格模式：仅云端（不访问本地）
    if (provider === "kv-server" || provider === "classworkscloud") {
      if (!networkStatus.isOnline()) {
        return formatError("网络不可用", "NETWORK_OFFLINE");
      }
      try {
        const result = await rmwWriteServer(key, data);
        if (result && result.success !== false) {
          return { success: true, source: "cloud" };
        }
        return formatError("云端保存失败", "SERVER_SAVE_ERROR");
      } catch (error) {
        return formatError("云端保存失败: " + error.message, "SERVER_SAVE_ERROR");
      }
    }

    // 双模式：云端和本地都存储完整数据
    if (isDualMode(provider)) {
      if (networkStatus.isOnline()) {
        try {
          const [localResult, serverResult] = await Promise.all([
            kvLocalProvider.saveData(key, data),
            rmwWriteServer(key, data)
          ]);

          const localOk = localResult && localResult.success !== false;
          const serverOk = serverResult && serverResult.success !== false;

          if (serverOk && localOk) {
            await kvLocalProvider.removeKeyFromOfflineQueue(key).catch(() => {});
            return { success: true, source: "dual" };
          }

          if (serverOk) {
            return { success: true, source: "cloud", localFailed: true };
          }

          if (localOk) {
            await kvLocalProvider.addToOfflineQueue(key).catch(() => {});
            backgroundSync.scheduleImmediate();
            networkStatus.markServerUnreachable();
            return { success: true, source: "local", serverFailed: true };
          }

          return formatError("保存失败：云端和本地均不可用", "SAVE_FAILED");
        } catch (error) {
          networkStatus.markServerUnreachable();
          try {
            const localResult = await kvLocalProvider.saveData(key, data);
            if (localResult && localResult.success !== false) {
              await kvLocalProvider.addToOfflineQueue(key).catch(() => {});
              backgroundSync.scheduleImmediate();
              return { success: true, source: "local", serverFailed: true };
            }
          } catch (e) {
            console.warn('本地数据保存失败:', e);
          }
          return formatError("保存失败: " + error.message, "SAVE_ERROR");
        }
      } else {
        // 离线时：仅保存到本地，加入离线队列
        try {
          const localResult = await kvLocalProvider.saveData(key, data);
          if (localResult && localResult.success !== false) {
            await kvLocalProvider.addToOfflineQueue(key).catch(() => {});
            backgroundSync.scheduleImmediate();
            return { success: true, source: "local-offline" };
          }
          return formatError("本地保存失败", "LOCAL_SAVE_ERROR");
        } catch (error) {
          return formatError("本地保存失败: " + error.message, "LOCAL_SAVE_ERROR");
        }
      }
    }

    // 默认：本地模式
    try {
      const result = await kvLocalProvider.saveData(key, data);
      if (result && result.success !== false) {
        return { success: true, source: "local" };
      }
      return formatError("本地保存失败", "LOCAL_SAVE_ERROR");
    } catch (error) {
      return formatError("本地保存失败: " + error.message, "LOCAL_SAVE_ERROR");
    }
  },

  loadKeys: async (options = {}) => {
    const provider = getSetting("server.provider");
    const isDual = isDualMode(provider);
    const isCloudOnly = provider === "kv-server" || provider === "classworkscloud";
    const useServer = isDual || isCloudOnly;

    if (useServer && isDual) {
      const [cloudResult, localResult] = await Promise.all([
        kvServerProvider.loadKeys(options).catch(() => null),
        kvLocalProvider.loadKeys(options).catch(() => null)
      ]);

      const cloudKeys = cloudResult?.keys || [];
      const localKeys = localResult?.keys || [];
      const allKeys = [...new Set([...cloudKeys, ...localKeys])];

      return { keys: allKeys, total_rows: allKeys.length };
    }

    if (useServer) {
      return kvServerProvider.loadKeys(options);
    }
    return kvLocalProvider.loadKeys(options);
  },

  async getKeyCloudUrl(key, options = {}) {
    const {
      migrateFromLocal = true,
      autoConfigureCloud = true
    } = options;

    try {
      const provider = getSetting("server.provider");
      let serverUrl;

      if (provider === "classworkscloud" || provider === "dual-cloud") {
        serverUrl = getEffectiveServerUrl();
      } else {
        serverUrl = getSetting("server.domain");
      }

      let siteKey = getSetting("server.siteKey");
      const machineId = getSetting("device.uuid");
      let configured = false;

      if (!serverUrl || !machineId) {
        if (autoConfigureCloud) {
          const classworksCloudDefaults = {
            "server.domain": import.meta.env.VITE_DEFAULT_KV_SERVER || "https://kv-service.houlang.cloud",
            "server.siteKey": "",
          };

          if (!serverUrl) {
            setSetting("server.domain", classworksCloudDefaults["server.domain"]);
            serverUrl = classworksCloudDefaults["server.domain"];
            configured = true;
          }

          if (!siteKey) {
            setSetting("server.siteKey", classworksCloudDefaults["server.siteKey"]);
            siteKey = classworksCloudDefaults["server.siteKey"];
          }

          setSetting("server.provider", "classworkscloud");
          serverUrl = getEffectiveServerUrl();
        } else {
          return formatError("云端配置无效，请检查服务器域名和设备UUID", "CONFIG_ERROR");
        }
      }

      let migrated = false;

      if (migrateFromLocal) {
        try {
          const localData = await kvLocalProvider.loadData(key);

          if (localData && localData.success !== false) {
            const cloudData = await kvServerProvider.loadData(key);

            if (cloudData && cloudData.success === false && cloudData.error?.code === "NOT_FOUND") {
              const saveResult = await kvServerProvider.saveData(key, localData);
              if (saveResult && saveResult.success !== false) {
                migrated = true;
                console.log(`已成功将键 ${key} 的数据从本地迁移到云端`);
              }
            }
          }
        } catch (error) {
          console.warn(`迁移键 ${key} 的数据时出错:`, error);
        }
      }
      const authtoken = getSetting("server.kvToken");
      let url = `${serverUrl}/kv/${key}?token=${authtoken}`;

      return {
        success: true,
        url,
        migrated,
        configured
      };

    } catch (error) {
      console.error('获取键云端地址时出错:', error);
      return formatError(
        error.message || "获取键云端地址失败",
        "CLOUD_URL_ERROR"
      );
    }
  },

  async syncAllToLocal() {
    const provider = getSetting("server.provider");
    const useServer = provider === "kv-server" || provider === "classworkscloud" || provider === "dual-cloud" || provider === "dual-server";
    if (!useServer) {
      return formatError("当前不是云端模式", "CONFIG_ERROR");
    }

    const keysResult = await loadAllKeys((opts) => kvServerProvider.loadKeys(opts));
    if (!keysResult) {
      return formatError("获取云端键列表失败", "SYNC_ERROR");
    }

    const total = keysResult.keys.length;
    let synced = 0;
    let failed = 0;
    const failedKeys = [];

    await runWithConcurrency(keysResult.keys, SYNC_CONCURRENCY, async (key) => {
      try {
        const data = await kvServerProvider.loadData(key);
        if (data && data.success !== false) {
          await kvLocalProvider.saveData(key, data);
          synced++;
        } else {
          failed++;
          failedKeys.push(key);
        }
      } catch {
        failed++;
        failedKeys.push(key);
      }
    });

    return { success: true, synced, failed, failedKeys, total };
  },

  async syncAllToCloud() {
    const provider = getSetting("server.provider");
    const useServer = provider === "kv-server" || provider === "classworkscloud" || provider === "dual-cloud" || provider === "dual-server";
    if (!useServer) {
      return formatError("当前不是云端模式", "CONFIG_ERROR");
    }

    const keysResult = await loadAllKeys((opts) => kvLocalProvider.loadKeys(opts));
    if (!keysResult) {
      return formatError("获取本地键列表失败", "SYNC_ERROR");
    }

    const total = keysResult.keys.length;
    let synced = 0;
    let failed = 0;
    const failedKeys = [];

    await runWithConcurrency(keysResult.keys, SYNC_CONCURRENCY, async (key) => {
      try {
        const data = await kvLocalProvider.loadData(key);
        if (data && data.success !== false) {
          const result = await kvServerProvider.saveData(key, data);
          if (result && result.success !== false) {
            synced++;
          } else {
            failed++;
            failedKeys.push(key);
          }
        } else {
          failed++;
          failedKeys.push(key);
        }
      } catch {
        failed++;
        failedKeys.push(key);
      }
    });

    return { success: true, synced, failed, failedKeys, total };
  },

  async getSyncStatus() {
    const provider = getSetting("server.provider");
    const useServer = provider === "kv-server" || provider === "classworkscloud" || provider === "dual-cloud" || provider === "dual-server";

    if (!useServer) {
      return { mode: "local-only" };
    }

    // 本地键列表（本地一定可用）
    const localKeysResult = await loadAllKeys((opts) => kvLocalProvider.loadKeys(opts)).catch(() => null);
    const localKeySet = new Set(localKeysResult?.keys || []);

    // 云端键列表（可能不可达）
    const cloudKeysResult = await loadAllKeys((opts) => kvServerProvider.loadKeys(opts)).catch(() => null);
    if (!cloudKeysResult) {
      return {
        mode: "dual",
        cloudCount: 0,
        localCount: localKeySet.size,
        cloudAvailable: false
      };
    }

    const cloudKeySet = new Set(cloudKeysResult.keys || []);
    const onlyInCloud = [...cloudKeySet].filter(k => !localKeySet.has(k));
    const onlyInLocal = [...localKeySet].filter(k => !cloudKeySet.has(k));
    const inBoth = [...cloudKeySet].filter(k => localKeySet.has(k));

    return {
      mode: "dual",
      cloudCount: cloudKeySet.size,
      localCount: localKeySet.size,
      synced: inBoth.length,
      onlyInCloud: onlyInCloud.length,
      onlyInLocal: onlyInLocal.length,
      cloudAvailable: true
    };
  },

  async loadStorageInfo() {
    return kvLocalProvider.getStorageInfo();
  },
};


export const ErrorCodes = {
  NOT_FOUND: "数据不存在",
  NETWORK_ERROR: "网络连接失败",
  SERVER_ERROR: "服务器错误",
  SAVE_ERROR: "保存失败",
  CONFIG_ERROR: "配置错误",
  PERMISSION_DENIED: "无权限访问",
  UNAUTHORIZED: "认证失败",
  CLOUD_URL_ERROR: "云端地址获取失败",
  SYNC_ERROR: "同步错误",
  UNKNOWN_ERROR: "未知错误",
};
