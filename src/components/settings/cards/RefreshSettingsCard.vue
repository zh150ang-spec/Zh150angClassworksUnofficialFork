<template>
  <settings-card
    :icon="ICON.SYNC"
    title="同步与刷新"
  >
    <v-form>
      <v-list>
        <v-list-subheader>自动刷新</v-list-subheader>
        <setting-item
          setting-key="refresh.auto"
          title="自动刷新"
        />
        <setting-item
          setting-key="refresh.interval"
          title="刷新间隔（秒）"
        />
        
        <v-divider class="my-2" />
        
        <v-list-subheader>双存储后台同步</v-list-subheader>
        <v-list-item>
          <template #prepend>
            <v-icon :icon="ICON.INFORMATION_OUTLINE" />
          </template>
          <v-list-item-title class="text-body-small text-medium-emphasis">
            自动将本地独有数据同步到云端，确保双存储数据一致性
          </v-list-item-title>
        </v-list-item>
        
        <!-- 非双存储模式提示 -->
        <v-alert
          v-if="!isDualMode"
          class="mb-2"
          color="warning"
          density="compact"
          :icon="ICON.ERROR"
          variant="tonal"
        >
          当前不是双存储模式，后台同步功能已自动关闭
        </v-alert>
        
        <v-list-item :disabled="!isDualMode">
          <template #prepend>
            <v-icon
              :color="isDualMode ? 'primary' : 'grey'"
              :icon="ICON.SYNC_CIRCLE"
            />
          </template>
          <v-list-item-title>启用同步</v-list-item-title>
          <v-list-item-subtitle v-if="!isDualMode">
            需要使用双存储模式才能启用
          </v-list-item-subtitle>
          <template #append>
            <v-switch
              v-model="syncEnabled"
              :disabled="!isDualMode"
              color="primary"
              density="compact"
              hide-details
            />
          </template>
        </v-list-item>
        
        <setting-item
          setting-key="sync.minInterval"
          title="最小间隔（秒）"
          :disabled="!isDualMode || !syncEnabled"
        />
        <setting-item
          setting-key="sync.maxInterval"
          title="最大间隔（秒）"
          :disabled="!isDualMode || !syncEnabled"
        />
        
        <v-divider class="my-2" />

        <v-list-subheader>在线状态</v-list-subheader>
        <v-list-item v-if="syncStatus">
          <template #prepend>
            <v-icon
              :color="syncStatus.browserOnline && syncStatus.serverReachable ? 'success' : 'warning'"
              :icon="syncStatus.browserOnline && syncStatus.serverReachable ? ICON.WIFI : ICON.WIFI_OFF"
            />
          </template>
          <v-list-item-title>
            {{ syncStatus.browserOnline && syncStatus.serverReachable ? '在线' : syncStatus.browserOnline ? '云端服务器不可达' : '网络已断开' }}
          </v-list-item-title>
          <v-list-item-subtitle v-if="!syncStatus.browserOnline">
            浏览器检测到网络断开
          </v-list-item-subtitle>
          <v-list-item-subtitle v-else-if="!syncStatus.serverReachable">
            服务器连接失败，数据暂存本地
          </v-list-item-subtitle>
        </v-list-item>

        <v-divider class="my-2" />

        <v-list-subheader>同步状态</v-list-subheader>
        <v-list-item v-if="isDualMode && syncStatus">
          <template #prepend>
            <v-icon
              :color="syncStatus.isRunning ? 'success' : 'grey'"
              :icon="ICON.CLOUD_SYNC"
            />
          </template>
          <v-list-item-title>
            {{ syncStatus.isRunning ? '同步服务运行中' : '同步服务已停止' }}
          </v-list-item-title>
          <v-list-item-subtitle v-if="syncStatus.lastSyncTime">
            上次同步: {{ formatTime(syncStatus.lastSyncTime) }}
          </v-list-item-subtitle>
        </v-list-item>
        <v-list-item v-else>
          <template #prepend>
            <v-icon
              color="medium-emphasis"
              :icon="ICON.CLOUD_OFF"
            />
          </template>
          <v-list-item-title>同步服务未启用</v-list-item-title>
          <v-list-item-subtitle>
            需要切换到双存储模式才能使用
          </v-list-item-subtitle>
        </v-list-item>

        <v-list-item v-if="isDualMode && syncStatus">
          <template #prepend>
            <v-icon
              :color="offlineQueueItems.length > 0 ? 'warning' : 'success'"
              :icon="offlineQueueItems.length > 0 ? ICON.PROGRESS_UPLOAD : ICON.CHECK_CIRCLE_OUTLINE"
            />
          </template>
          <v-list-item-title>
            离线队列: {{ offlineQueueItems.length }} 项
          </v-list-item-title>
          <v-list-item-subtitle v-if="offlineQueueItems.length > 0">
            等待同步到云端
          </v-list-item-subtitle>
          <v-list-item-subtitle v-else>
            所有数据已同步
          </v-list-item-subtitle>
          <template #append>
            <v-btn
              icon
              size="small"
              variant="text"
              :loading="queueLoading"
              title="刷新队列"
              @click="loadOfflineQueue"
            >
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
            <v-btn
              v-if="offlineQueueItems.length > 0"
              icon
              size="small"
              variant="text"
              :title="queueExpanded ? '收起' : '展开'"
              @click="queueExpanded = !queueExpanded"
            >
              <v-icon>{{ queueExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
            </v-btn>
          </template>
        </v-list-item>

        <!-- 队列内容展开区：显示每条记录的 key 和添加时间 -->
        <v-expand-transition>
          <div v-show="queueExpanded && offlineQueueItems.length > 0">
            <v-divider class="my-1" />
            <v-list density="compact">
              <v-list-item
                v-for="item in offlineQueueItems"
                :key="item.id"
              >
                <template #prepend>
                  <v-icon
                    size="small"
                    color="medium-emphasis"
                  >
                    mdi-key-variant
                  </v-icon>
                </template>
                <v-list-item-title class="text-body-medium font-mono">
                  {{ item.key }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-body-small text-medium-emphasis">
                  添加于 {{ formatTime(item.addedAt) }}
                </v-list-item-subtitle>
                <template #append>
                  <v-btn
                    icon
                    size="x-small"
                    variant="text"
                    color="error"
                    title="从队列移除（不影响本地数据）"
                    @click="removeQueueItem(item.id)"
                  >
                    <v-icon size="small">
                      mdi-close
                    </v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-expand-transition>

        <v-list-item v-if="syncStatus && syncStatus.syncedCount > 0">
          <template #prepend>
            <v-icon
              color="success"
              :icon="ICON.COUNTER"
            />
          </template>
          <v-list-item-title>
            累计已同步: {{ syncStatus.syncedCount }} 项
          </v-list-item-title>
        </v-list-item>
        <v-list-item>
          <v-btn
            :disabled="!isDualMode"
            color="primary"
            :prepend-icon="ICON.SYNC"
            variant="tonal"
            @click="forceSync"
          >
            立即同步
          </v-btn>
        </v-list-item>
      </v-list>
    </v-form>
  </settings-card>
</template>

<script>
import { ICON } from '@/utils/icons'
import SettingsCard from '@/components/SettingsCard.vue';
import SettingItem from '@/components/settings/SettingItem.vue';
import BackgroundSyncService from '@/utils/backgroundSync';
import { kvLocalProvider } from '@/utils/providers/kvLocalProvider';
import { watchSettings, getSetting, setSetting } from '@/utils/settings';
import { formatTime } from '@/utils/dateUtils';

export default {
  name: 'RefreshSettingsCard',
  components: {SettingsCard, SettingItem},
  data() {
    return {
      ICON,
      syncStatus: null,
      statusInterval: null,
      unwatchSettings: null,
      internalSyncEnabled: null,
      currentProviderValue: null,
      // 离线队列真实内容（直接从 IndexedDB 读取，不依赖 backgroundSync 缓存计数）
      offlineQueueItems: [],
      queueExpanded: false,
      queueLoading: false
    };
  },
  computed: {
    isDualMode() {
      return this.currentProviderValue === 'dual-cloud' || this.currentProviderValue === 'dual-server';
    },
    syncEnabled: {
      get() {
        if (this.internalSyncEnabled !== null) {
          return this.internalSyncEnabled;
        }
        return getSetting('sync.enabled') !== false;
      },
      set(value) {
        this.internalSyncEnabled = value;
        setSetting('sync.enabled', value);
        if (value && this.isDualMode) {
          BackgroundSyncService.start();
        } else {
          BackgroundSyncService.stop();
        }
        this.updateSyncStatus();
      }
    }
  },
  mounted() {
    this.currentProviderValue = getSetting('server.provider');
    this.lastProvider = this.currentProviderValue;
    this.internalSyncEnabled = getSetting('sync.enabled') !== false;
    this.updateSyncStatus();
    this.loadOfflineQueue();
    this.statusInterval = setInterval(this.updateSyncStatus, 5000);
    this.unwatchSettings = watchSettings(() => {
      this.currentProviderValue = getSetting('server.provider');
      this.updateSyncStatus();
    });
  },
  beforeUnmount() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }
    if (this.unwatchSettings) {
      this.unwatchSettings();
    }
  },
  methods: {
    updateSyncStatus() {
      this.syncStatus = BackgroundSyncService.getStatus();
      this.internalSyncEnabled = getSetting('sync.enabled') !== false;
      // 同步刷新离线队列真实内容（不 await，避免阻塞状态轮询）
      this.loadOfflineQueue();
    },
    // 直接从 IndexedDB 读取离线队列真实内容，避免 backgroundSync 缓存计数不准
    async loadOfflineQueue() {
      this.queueLoading = true;
      try {
        const result = await kvLocalProvider.getOfflineQueue();
        if (result && result.success !== false && Array.isArray(result.data)) {
          // 按 addedAt 升序排列（先入队的在前）
          this.offlineQueueItems = result.data.slice().sort((a, b) => {
            return (a.addedAt || 0) - (b.addedAt || 0);
          });
        } else {
          this.offlineQueueItems = [];
        }
      } catch (e) {
        console.warn('加载离线队列失败:', e);
        this.offlineQueueItems = [];
      } finally {
        this.queueLoading = false;
      }
    },
    // 从队列移除单项（仅移除队列记录，不删除本地 kv 数据）
    async removeQueueItem(id) {
      try {
        await kvLocalProvider.removeFromOfflineQueue(id);
        this.offlineQueueItems = this.offlineQueueItems.filter(item => item.id !== id);
        this.$message.success('已移除', '该条目已从离线队列移除');
      } catch (e) {
        console.warn('移除队列项失败:', e);
        this.$message.error('移除失败', e.message || '请重试');
      }
    },
    formatTime(timestamp) {
      if (!timestamp) return '从未';
      return formatTime(timestamp);
    },
    async forceSync() {
      await BackgroundSyncService.forceSyncNow();
      this.updateSyncStatus();
      await this.loadOfflineQueue();
      this.$message.success('同步成功', '数据已同步完成');
    }
  }
};
</script>
