<template>
  <settings-card
    :icon="ICON.DATABASE_COG"
    title="数据源维护与诊断"
  >
    <v-list>
      <template
        v-if="
          currentProvider === 'kv-server' ||
            currentProvider === 'classworkscloud' ||
            currentProvider === 'dual-cloud' ||
            currentProvider === 'dual-server'
        "
      >
        <v-list-item>
          <template #prepend>
            <v-icon
              class="mr-3"
              :icon="ICON.LAN_CONNECT"
            />
          </template>
          <v-list-item-title>检查服务器连接</v-list-item-title>
          <template #append>
            <v-btn
              :loading="loading"
              color="neutral-surface"
              variant="elevated"
              @click="checkServerConnection"
            >
              测试连接
            </v-btn>
          </template>
        </v-list-item>
      </template>

      <template v-if="currentProvider === 'kv-local'">
        <v-list-item>
          <template #prepend>
            <v-icon
              class="mr-3"
              :icon="ICON.DATABASE"
            />
          </template>
          <v-list-item-title>清除数据库缓存</v-list-item-title>
          <v-list-item-subtitle>这将清除所有本地数据库中的数据</v-list-item-subtitle>
          <template #append>
            <v-btn
              color="error"
              variant="elevated"
              @click="confirmClearIndexedDB"
            >
              清除
            </v-btn>
          </template>
        </v-list-item>
        <v-list-item>
          <template #prepend>
            <v-icon
              class="mr-3"
              :icon="ICON.DATABASE_EXPORT"
            />
          </template>
          <v-list-item-title>导出数据库</v-list-item-title>
          <template #append>
            <v-btn
              :loading="exporting"
              color="neutral-surface"
              variant="elevated"
              @click="exportData"
            >
              导出
            </v-btn>
          </template>
        </v-list-item>
      </template>

      <v-list-item>
        <template #prepend>
          <v-icon
            class="mr-3"
            :icon="ICON.LAN_CONNECT"
          />
        </template>
        <v-list-item-title>查看本地缓存</v-list-item-title>
        <template #append>
          <v-btn
            color="neutral-surface"
            to="/cachemanagement"
            variant="elevated"
          >
            查看
          </v-btn>
        </template>
      </v-list-item>
    </v-list>

    <v-dialog
      v-model="confirmDialog"
      max-width="400"
    >
      <v-card>
        <v-card-title>{{ confirmTitle }}</v-card-title>
        <v-card-text>{{ confirmMessage }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <div class="d-flex gap-2">
            <v-btn
              color="neutral-surface"
              variant="elevated"
              @click="confirmDialog = false"
            >
              取消
            </v-btn>
            <v-btn
              color="error"
              variant="elevated"
              @click="handleConfirm"
            >
              确认
            </v-btn>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="showEnableSyncDialog"
      max-width="400"
      persistent
    >
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon
            class="mr-2"
            color="primary"
            :icon="ICON.SYNC_CIRCLE"
          />
          推荐开启双存储同步
        </v-card-title>
        <v-card-text>
          检测到您已切换到双存储模式，推荐开启后台同步功能以获得更好的体验和稳定性。
          <br>
          <br>
          开启后，系统会自动将本地独有数据同步到云端，确保数据一致性。
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <div class="d-flex gap-2">
            <v-btn
              color="neutral-surface"
              variant="elevated"
              @click="handleEnableSyncDialog(false)"
            >
              取消
            </v-btn>
            <v-btn
              color="success"
              variant="elevated"
              @click="handleEnableSyncDialog(true)"
            >
              允许
            </v-btn>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </settings-card>
</template>

<script>
import { ICON } from '@/utils/icons'
import SettingsCard from "@/components/settings/SettingsCard.vue";
import {getSetting, setSetting, watchSettings} from "@/utils/settings";
import axios from "axios";
import {tryWithRotation, isRotationEnabled} from "@/utils/serverRotation";
import BackgroundSyncService from "@/utils/backgroundSync";

export default {
  name: "DataProviderSettingsCard",
  components: {SettingsCard},

  data() {
    return {
      ICON,
      loading: false,
      exporting: false,
      serverchecktime: {},
      confirmDialog: false,
      confirmTitle: "",
      confirmMessage: "",
      confirmAction: null,
      machineId: null,
      migrateLoading: false,
      lastProvider: null,
      unwatchSettings: null,
      showEnableSyncDialog: false,
    };
  },

  computed: {
    currentProvider() {
      return getSetting("server.provider");
    },

    isKvProvider() {
      return ['kv-local', 'kv-server', 'classworkscloud', 'dual-cloud', 'dual-server'].includes(this.currentProvider);
    },

    isDualMode() {
      return this.currentProvider === 'dual-cloud' || this.currentProvider === 'dual-server';
    },
  },

  created() {
    this.machineId = getSetting("device.uuid");
    this.lastProvider = this.currentProvider;
    this.unwatchSettings = watchSettings(() => {
      this.checkProviderChange();
    });
  },

  beforeUnmount() {
    if (this.unwatchSettings) {
      this.unwatchSettings();
    }
  },

  methods: {
    checkProviderChange() {
      if (this.currentProvider !== this.lastProvider) {
        const wasDualMode = this.lastProvider === 'dual-cloud' || this.lastProvider === 'dual-server';
        this.lastProvider = this.currentProvider;

        if (wasDualMode && !this.isDualMode) {
          if (BackgroundSyncService.isActive()) {
            BackgroundSyncService.stop();
          }
          setSetting('sync.enabled', false);
          this.$message.warning('已自动关闭双存储同步', '当前不是双存储模式');
        } else if (!wasDualMode && this.isDualMode) {
          const syncEnabled = getSetting('sync.enabled') !== false;
          if (!syncEnabled) {
            this.showEnableSyncDialog = true;
          } else {
            BackgroundSyncService.start();
          }
        }
      }
    },

    handleEnableSyncDialog(enable) {
      this.showEnableSyncDialog = false;
      if (enable) {
        setSetting('sync.enabled', true);
        BackgroundSyncService.start();
        this.$message.success('已开启双存储同步', '数据将自动同步到云端');
      }
    },

    async checkServerConnection() {
      this.loading = true;
      this.serverchecktime = new Date();
      const triedServers = [];
      
      try {
        const siteKey = getSetting("server.siteKey");
        
        // Prepare headers including site key if available
        const headers = {Accept: "application/json"};
        if (siteKey) {
          headers["x-site-key"] = siteKey;
        }

        // Use rotation for classworkscloud provider
        if (isRotationEnabled()) {
          await tryWithRotation(
            async (serverUrl) => {
              const res = await axios.get(`${serverUrl}/check`, {
                method: "GET",
                headers,
              });
              if (res.data.status !== "success") {
                throw new Error("服务器响应异常");
              }
              return res;
            },
            {
              onServerTried: ({tried}) => {
                triedServers.length = 0;
                triedServers.push(...tried);
              }
            }
          );

          // Build success message with tried servers info
          const latency = new Date() - this.serverchecktime;
          const successServer = triedServers.find(s => s.status === "success");
          let message = `服务器连接正常 延迟${latency}ms`;
          
          if (triedServers.length > 1) {
            const serverList = triedServers.map((s, i) => 
              `${i + 1}. ${s.url} (${s.status === "success" ? "成功" : "失败"})`
            ).join("\n");
            message += `\n\n依次尝试的服务器:\n${serverList}`;
          } else if (successServer) {
            message += `\n服务器: ${successServer.url}`;
          }

          this.$message.success("连接成功", message);
        } else {
          // Standard single-server check for other providers
          const domain = getSetting("server.domain");
          const response = await axios.get(`${domain}/check`, {
            method: "GET",
            headers,
          });

          if (response.data.status === "success") {
            this.$message.success(
              "连接成功",
              "服务器连接正常 延迟" + (new Date() - this.serverchecktime) + "ms"
            );
          } else {
            throw new Error("服务器响应异常");
          }
        }
      } catch (error) {
        // Build error message with tried servers info
        let errorMessage = error.message || "无法连接到服务器";
        
        if (triedServers.length > 0) {
          const serverList = triedServers.map((s, i) => 
            `${i + 1}. ${s.url} (失败${s.error ? `: ${s.error}` : ""})`
          ).join("\n");
          errorMessage += `\n\n依次尝试的服务器:\n${serverList}\n\n所有服务器均连接失败`;
        }
        
        this.$message.error("连接失败", errorMessage);
      } finally {
        this.loading = false;
      }
    },

    confirmClearLocalStorage() {
      this.confirmTitle = "确认清除";
      this.confirmMessage = "此操作将清除所有本地存储的数据，确定要继续吗？";
      this.confirmAction = this.clearLocalStorage;
      this.confirmDialog = true;
    },

    clearLocalStorage() {
      try {
        localStorage.clear();
        this.$message.success("清除成功", "本地存储数据已清除");
        this.confirmDialog = false;
      } catch (error) {
        this.$message.error("清除失败", error.message);
      }
    },

    confirmClearIndexedDB() {
      this.confirmTitle = "确认清除";
      this.confirmMessage = "此操作将清除所有IndexedDB中的数据，确定要继续吗？";
      this.confirmAction = this.clearIndexedDB;
      this.confirmDialog = true;
    },

    async clearIndexedDB() {
      try {
        const DBName = "ClassworksDB";
        // 删除整个数据库
        await window.indexedDB.deleteDatabase(DBName);
        this.$message.success("清除成功", "数据库缓存已清除");
        this.confirmDialog = false;

        // 如果是KV提供者，需要刷新页面以生成新的UUID
        if (this.isKvProvider) {
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (error) {
        this.$message.error("清除失败", error.message);
      }
    },

    async exportData() {
      this.exporting = true;
      try {
        const DBName = "ClassworksDB";
        const data = {indexedDB: {}};

        // 打开数据库
        const db = await new Promise((resolve, reject) => {
          const request = window.indexedDB.open(DBName);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        });

        // 获取所有存储对象
        const stores = Array.from(db.objectStoreNames);

        // 导出每个存储对象的数据
        for (const storeName of stores) {
          const transaction = db.transaction(storeName, "readonly");
          const store = transaction.objectStore(storeName);

          // 获取存储对象中的所有数据
          const storeData = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
          });

          data.indexedDB[storeName] = storeData;
        }

        // 创建并下载文件
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const timestamp = new Date().toISOString().split("T")[0];
        a.href = url;
        a.download = `homework-indexeddb-${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.$message.success("导出成功", "IndexedDB数据已导出");
      } catch (error) {
        console.error("导出失败:", error);
        this.$message.error("导出失败", error.message || "无法导出数据库数据");
      } finally {
        this.exporting = false;
      }
    },

    async migrateData() {
      this.migrateLoading = true;
      this.$router.push("/datamigration");
      this.migrateLoading = false;
    },

    handleConfirm() {
      if (this.confirmAction) {
        this.confirmAction();
      }
    },
  },
};
</script>
