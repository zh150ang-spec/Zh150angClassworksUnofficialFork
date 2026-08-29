import {kvLocalProvider} from "./providers/kvLocalProvider";
import {kvServerProvider} from "./providers/kvServerProvider";
import {getSetting, setSetting} from "./settings";
import {getEffectiveServerUrl} from "./serverRotation";
import {networkStatus} from "./networkStatus";
import backgroundSync from "./backgroundSync";
import {rmwWriteServer, computeDataHash} from "./rmw";
import messageService from "./message";
import {loadAllKeys, runWithConcurrency, SYNC_CONCURRENCY} from "./syncHelpers";

export const formatResponse = (data) => data;

export const formatError = (message, code = "UNKNOWN_ERROR") => ({
  success: false,
  error: {code, message},
});

const DEFAULT_RETRY_ATTEMPTS = 2;
const RETRY_DELAY_BASE = 100;

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

/**
 * 通知用户 RMW 合并冲突
 * @param {string} key - 数据键名
 * @param {Array} conflicts - 冲突列表
 * @param {*} localData - 本地原始数据
 * @param {*} serverData - 云端当前数据（合并前的）
 */
function notifyRmwConflict(key, conflicts, localData, serverData) {
  if (!conflicts || conflicts.length === 0) return;

  const conflictDescriptions = conflicts.map(c => {
    if (c.id !== undefined) {
      // 数组项冲突
      const serverDisplay = extractHumanDescription(c.serverValue);
      const localDisplay = extractHumanDescription(c.localValue);
      return `ID "${c.id}": 云端为 "${serverDisplay}",你的为 "${localDisplay}"`;
    } else {
      // 对象字段冲突
      const serverDisplay = extractHumanDescription(c.serverValue);
      const localDisplay = extractHumanDescription(c.localValue);
      return `字段 "${c.path}": 云端为 "${serverDisplay}",你的为 "${localDisplay}"`;
    }
  }).join("; ");

  // 创建操作按钮
  const actions = [
    {
      label: "使用云端",
      color: "primary",
      variant: "flat",
      onClick: async () => {
        try {
          // 用云端数据覆盖本地
          await kvLocalProvider.saveData(key, serverData);
          messageService.success("已使用云端数据", "本地数据已更新为云端版本");
        } catch (error) {
          messageService.error("操作失败", "无法更新本地数据: " + error.message);
        }
      }
    },
    {
      label: "换用我的修改",
      color: "warning",
      variant: "flat",
      onClick: async () => {
        try {
          // 用本地数据覆盖云端
          const result = await kvServerProvider.saveData(key, localData);
          if (result && result.success !== false) {
            messageService.success("已使用你的修改", "云端数据已更新为你的版本");
          } else {
            messageService.error("操作失败", "无法更新云端数据");
          }
        } catch (error) {
          messageService.error("操作失败", "无法更新云端数据: " + error.message);
        }
      }
    }
  ];

  messageService.warning(
    "数据冲突",
    `你刚才修改的内容已被他人先修改过。${conflictDescriptions}`,
    { timeout: 15000, closable: false, actions }
  );
}

/**
 * 提取人类可读的描述
 * @param {*} value - 要描述的值
 * @returns {string} - 人类可读的描述
 */
function extractHumanDescription(value) {
  if (value === null || value === undefined) return "空";
  if (typeof value === "string") return value.length > 50 ? value.substring(0, 50) + "..." : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `数组(${value.length}项)`;
  if (typeof value === "object") {
    // 尝试提取有意义的字段
    if (value.name) return value.name;
    if (value.title) return value.title;
    if (value.id) return `ID:${value.id}`;
    return "对象";
  }
  return "未知";
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

export default {
  setReadOnlyState(isReadOnly) {
    _isReadOnly = !!isReadOnly;
  },

  isReadOnly() {
    return _isReadOnly;
  },

  checkNamespaceChange() {
    const currentNamespace = getSetting("device.uuid") || "";
    const lastKnown = getSetting("device.lastKnownNamespace") || "";

    if (!currentNamespace) {
      return { changed: false, current: "", previous: lastKnown };
    }

    if (!lastKnown) {
      setSetting("device.lastKnownNamespace", currentNamespace);
      return { changed: false, current: currentNamespace, previous: "" };
    }

    if (currentNamespace !== lastKnown) {
      return { changed: true, current: currentNamespace, previous: lastKnown };
    }

    return { changed: false, current: currentNamespace, previous: lastKnown };
  },

  confirmNamespaceChange() {
    const currentNamespace = getSetting("device.uuid") || "";
    setSetting("device.lastKnownNamespace", currentNamespace);
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
            if (computeDataHash(merged) !== computeDataHash(localResult)) {
              await kvLocalProvider.saveData(key, merged).catch(() => {});
            }
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
          // 检查并通知冲突
          if (result.conflicts && result.conflicts.length > 0) {
            notifyRmwConflict(key, result.conflicts, data, result.serverOriginal);
          }
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
            // 检查并通知冲突
            if (serverResult.conflicts && serverResult.conflicts.length > 0) {
              notifyRmwConflict(key, serverResult.conflicts, data, serverResult.serverOriginal);
            }
            return { success: true, source: "dual" };
          }

          if (serverOk) {
            // 检查并通知冲突
            if (serverResult.conflicts && serverResult.conflicts.length > 0) {
              notifyRmwConflict(key, serverResult.conflicts, data, serverResult.serverOriginal);
            }
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
          const localData = await kvLocalProvider.loadData(key).catch(() => null);
          if (localData && localData.success !== false && computeDataHash(localData) === computeDataHash(data)) {
            return;
          }
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
