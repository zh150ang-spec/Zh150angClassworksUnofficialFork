import {openDB} from "idb";
import {formatResponse, formatError} from "../dataProvider";

const DB_NAME = "ClassworksDB";
const DB_VERSION = 5;

const EXPECTED_STORES = {
  "kv": null,
  "system": null,
  "offline-queue": { keyPath: "id", autoIncrement: true },
  "metadata": null
};

const MIGRATIONS = {
  1: (db) => {
    if (!db.objectStoreNames.contains("kv")) {
      db.createObjectStore("kv");
    }
    if (!db.objectStoreNames.contains("system")) {
      db.createObjectStore("system");
    }
  },
  2: (db) => {
    if (!db.objectStoreNames.contains("offline-queue")) {
      db.createObjectStore("offline-queue", { keyPath: "id", autoIncrement: true });
    }
  },
  3: (db) => {
    if (!db.objectStoreNames.contains("metadata")) {
      db.createObjectStore("metadata");
    }
  },
  4: (db) => {
    for (const [storeName, options] of Object.entries(EXPECTED_STORES)) {
      if (!db.objectStoreNames.contains(storeName)) {
        if (options) {
          db.createObjectStore(storeName, options);
        } else {
          db.createObjectStore(storeName);
        }
        console.log(`迁移版本 4: 创建缺失的 store "${storeName}"`);
      }
    }
  },
  // 版本5：给 offline-queue 加 key 索引
  // 注意：upgrade 回调里不能用 db.transaction()（会抛 TypeError: db.transaction.objectStore is not a function）
  // 必须用 upgrade 回调提供的 transaction 参数
  5: (db, transaction) => {
    if (db.objectStoreNames.contains("offline-queue")) {
      const store = transaction.objectStore("offline-queue");
      if (store && !store.indexNames.contains("key")) {
        store.createIndex("key", "key", {unique: false});
        console.log('迁移版本 5: 为 offline-queue 添加 key 索引');
      }
    }
  }
};

const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`IndexedDB 升级: ${oldVersion} -> ${newVersion}`);

      for (let version = oldVersion + 1; version <= newVersion; version++) {
        const migration = MIGRATIONS[version];
        if (migration) {
          try {
            migration(db, transaction);
            console.log(`迁移版本 ${version} 完成`);
          } catch (error) {
            console.error(`迁移版本 ${version} 失败:`, error);
            throw error;
          }
        }
      }
    },
    blocked() {
      console.warn('IndexedDB 被其他标签页阻塞，请关闭其他标签页后刷新');
    },
    blocking() {
      console.warn('IndexedDB 正在被其他标签页使用');
    },
    terminated() {
      console.error('IndexedDB 连接意外终止');
    }
  });
};

const safeJsonParse = (data, fallback = null) => {
  if (data === null || data === undefined) {
    return fallback;
  }
  
  if (typeof data === 'object') {
    return data;
  }
  
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('JSON 解析失败:', error, '原始数据:', data);
    return fallback;
  }
};

let dbInstance = null;
let dbInitPromise = null;
const getDB = async () => {
  if (!dbInitPromise) {
    dbInitPromise = initDB().then(db => {
      dbInstance = db;
      return db;
    });
  }
  return dbInitPromise;
};

const ensureStoresExist = async () => {
  try {
    const db = await getDB();
    const existingStores = Array.from(db.objectStoreNames);
    const missingStores = Object.keys(EXPECTED_STORES).filter(
      name => !existingStores.includes(name)
    );

    if (missingStores.length > 0) {
      console.warn(`检测到缺失的 stores: ${missingStores.join(', ')}，尝试修复...`);
      db.close();
      dbInstance = null;
      dbInitPromise = null;
      dbInitPromise = openDB(DB_NAME, DB_VERSION + 1, {
        upgrade(db) {
          for (const [storeName, options] of Object.entries(EXPECTED_STORES)) {
            if (!db.objectStoreNames.contains(storeName)) {
              if (options) {
                db.createObjectStore(storeName, options);
              } else {
                db.createObjectStore(storeName);
              }
              console.log(`修复: 创建缺失的 store "${storeName}"`);
            }
          }
        }
      });
      dbInstance = await dbInitPromise;
      return true;
    }
    return false;
  } catch (error) {
    console.error('检查/修复数据库 stores 失败:', error);
    return false;
  }
};

export const kvLocalProvider = {
  async loadData(key) {
    try {
      const db = await getDB();
      const data = await db.get("kv", key);

      if (!data) {
        return formatError("数据不存在", "NOT_FOUND");
      }

      const parsedData = safeJsonParse(data);
      if (parsedData === null) {
        console.warn(`键 ${key} 的数据损坏，返回空对象`);
        return formatResponse({});
      }

      return formatResponse(parsedData);
    } catch (error) {
      console.error("读取本地数据失败:", error);
      
      if (error.name === 'QuotaExceededError') {
        return formatError("存储空间不足，请清理缓存", "QUOTA_EXCEEDED");
      }
      
      if (error.name === 'VersionError') {
        return formatError("数据库版本不兼容，请刷新页面", "VERSION_ERROR");
      }
      
      return formatError("读取本地数据失败：" + error.message, "READ_ERROR");
    }
  },

  async saveData(key, data) {
    try {
      const db = await getDB();
      const jsonData = JSON.stringify(data);
      await db.put("kv", jsonData, key);
      
      return formatResponse(true);
    } catch (error) {
      console.error("保存本地数据失败:", error);
      
      if (error.name === 'QuotaExceededError') {
        return formatError("存储空间不足，无法保存数据", "QUOTA_EXCEEDED");
      }
      
      if (error.name === 'InvalidStateError') {
        dbInstance = null;
        dbInitPromise = null;
        return formatError("数据库连接已断开，请重试", "DB_DISCONNECTED");
      }
      
      return formatError("保存本地数据失败：" + error.message, "SAVE_ERROR");
    }
  },

  async deleteData(key) {
    try {
      const db = await getDB();
      await db.delete("kv", key);
      return formatResponse(true);
    } catch (error) {
      console.error("删除本地数据失败:", error);
      return formatError("删除本地数据失败：" + error.message, "DELETE_ERROR");
    }
  },
  
  async getStorageInfo() {
    try {
      const db = await getDB();
      const transaction = db.transaction(["kv"], "readonly");
      const store = transaction.objectStore("kv");
      const allKeys = await store.getAllKeys();
      
      let totalSize = 0;
      for (const key of allKeys) {
        const data = await store.get(key);
        if (data) {
          totalSize += new Blob([typeof data === 'string' ? data : JSON.stringify(data)]).size;
        }
      }
      
      const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
      return { 
        ok: true, 
        size: totalSize,
        sizeMB: `${sizeMB} MB`,
        keyCount: allKeys.length
      };
    } catch (error) {
      console.warn('无法获取存储信息:', error);
      return { ok: false, size: 0, sizeMB: '0 MB', keyCount: 0 };
    }
  },
  
  async repairDatabase() {
    try {
      if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
      }
      dbInitPromise = null;
      
      const databases = await indexedDB.databases();
      const dbExists = databases.some(db => db.name === DB_NAME);
      
      if (dbExists) {
        await indexedDB.deleteDatabase(DB_NAME);
        console.log('数据库已重置');
      }
      
      dbInstance = await initDB();
      return formatResponse({ repaired: true });
    } catch (error) {
      console.error('修复数据库失败:', error);
      return formatError('修复数据库失败: ' + error.message, 'REPAIR_ERROR');
    }
  },

  async clearAll() {
    try {
      const db = await getDB();
      const tx = db.transaction(["kv", "offline-queue"], "readwrite");
      await tx.objectStore("kv").clear();
      await tx.objectStore("offline-queue").clear();
      await tx.done;
      return formatResponse({ cleared: true });
    } catch (error) {
      console.error('清空本地数据失败:', error);
      return formatError('清空本地数据失败: ' + error.message, 'CLEAR_ERROR');
    }
  },

  async countKeys() {
    try {
      const db = await getDB();
      const tx = db.transaction(["kv"], "readonly");
      const count = await tx.objectStore("kv").count();
      return count;
    } catch (error) {
      console.warn('统计键数失败:', error);
      return 0;
    }
  },

  /**
   * 获取本地存储的键名列表
   * @param {Object} options - 查询选项
   * @param {string} options.sortBy - 排序字段，默认为 "key"
   * @param {string} options.sortDir - 排序方向，"asc" 或 "desc"，默认为 "asc"
   * @param {number} options.limit - 每页返回的记录数，默认为 100
   * @param {number} options.skip - 跳过的记录数，默认为 0
   * @returns {Promise<Object>} 包含键名列表和分页信息的响应对象
   *
   * 返回值示例:
   * {
   *   keys: ["key1", "key2", "key3"],
   *   total_rows: 150,
   *   current_page: {
   *     limit: 10,
   *     skip: 0,
   *     count: 10
   *   },
   *   load_more: null // 本地存储不需要分页URL
   * }
   */
  async loadKeys(options = {}) {
    try {
      const db = await getDB();
      const transaction = db.transaction(["kv"], "readonly");
      const store = transaction.objectStore("kv");

      const allKeys = await store.getAllKeys();

      const {
        sortDir = "asc",
        limit = 100,
        skip = 0
      } = options;
      
      const sortedKeys = [...allKeys].sort((a, b) => {
        if (sortDir === "desc") {
          return b.localeCompare(a);
        }
        return a.localeCompare(b);
      });

      const totalRows = sortedKeys.length;
      const paginatedKeys = sortedKeys.slice(skip, skip + limit);

      const responseData = {
        keys: paginatedKeys,
        total_rows: totalRows,
        current_page: {
          limit,
          skip,
          count: paginatedKeys.length
        },
        load_more: null
      };

      return formatResponse(responseData);
    } catch (error) {
      console.error("获取本地键名列表失败:", error);
      return formatError("获取本地键名列表失败：" + error.message, "LOAD_KEYS_ERROR");
    }
  },

  async addToOfflineQueue(key) {
    try {
      const db = await getDB();
      // 用 key 索引查询替代全表扫去重
      const tx = db.transaction("offline-queue", "readwrite");
      const index = tx.store.index("key");
      const existing = await index.get(key);
      if (existing) {
        await tx.done;
        return formatResponse({ added: false, reason: "already_exists" });
      }
      await tx.store.add({ key, addedAt: Date.now() });
      await tx.done;
      return formatResponse({ added: true });
    } catch (error) {
      console.error("添加到离线队列失败:", error);
      return formatError("添加到离线队列失败：" + error.message, "QUEUE_ERROR");
    }
  },

  async getOfflineQueue() {
    try {
      const db = await getDB();
      const items = await db.getAll("offline-queue");
      return formatResponse({ success: true, data: items });
    } catch (error) {
      console.error("获取离线队列失败:", error);
      if (error.name === 'NotFoundError') {
        const repaired = await ensureStoresExist();
        if (repaired) {
          try {
            const db = await getDB();
            const items = await db.getAll("offline-queue");
            return formatResponse({ success: true, data: items });
          } catch (retryError) {
            console.error("修复后重试获取离线队列仍失败:", retryError);
          }
        }
      }
      return formatError("获取离线队列失败：" + error.message, "QUEUE_ERROR");
    }
  },

  async getOfflineQueueCount() {
    try {
      const db = await getDB();
      const count = await db.count("offline-queue");
      return formatResponse({ success: true, count });
    } catch {
      return formatResponse({ success: true, count: 0 });
    }
  },

  async removeFromOfflineQueue(id) {
    try {
      const db = await getDB();
      await db.delete("offline-queue", id);
      return formatResponse({ removed: true });
    } catch (error) {
      console.error("从离线队列移除失败:", error);
      return formatError("从离线队列移除失败：" + error.message, "QUEUE_ERROR");
    }
  },

  async removeKeyFromOfflineQueue(key) {
    try {
      const db = await getDB();
      const items = await db.getAll("offline-queue");
      const item = items.find(i => i.key === key);
      if (item) {
        await db.delete("offline-queue", item.id);
        return formatResponse({ removed: true });
      }
      return formatResponse({ removed: false, reason: "not_found" });
    } catch (error) {
      console.error("从离线队列移除键失败:", error);
      return formatError("从离线队列移除键失败：" + error.message, "QUEUE_ERROR");
    }
  },
};
