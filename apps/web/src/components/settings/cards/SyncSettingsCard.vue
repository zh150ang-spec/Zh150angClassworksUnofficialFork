<template>
  <div class="sync-settings-group">
    <!-- 双存储同步卡片 -->
    <settings-card :icon="ICON.SYNC_CIRCLE" title="双存储同步">
      <v-list>
        <!-- 非双存储模式提示 -->
        <v-alert v-if="!isDualMode" class="mb-2" color="warning" density="compact" variant="tonal">
          当前不是双存储模式，后台同步功能已自动关闭
        </v-alert>

        <v-list-item :disabled="!isDualMode">
          <template #prepend>
            <v-icon :color="isDualMode ? 'primary' : 'grey'" :icon="ICON.SYNC_CIRCLE" />
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
              density="comfortable"
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

        <!-- 在线状态 -->
        <v-list-item v-if="syncStatus">
          <template #prepend>
            <v-icon
              :color="
                syncStatus.browserOnline && syncStatus.serverReachable ? 'success' : 'warning'
              "
              :icon="
                syncStatus.browserOnline && syncStatus.serverReachable ? ICON.WIFI : ICON.WIFI_OFF
              "
            />
          </template>
          <v-list-item-title>
            {{ onlineLabel }}
          </v-list-item-title>
        </v-list-item>

        <v-divider class="my-2" />

        <!-- 同步状态 -->
        <v-list-item v-if="isDualMode && syncStatus">
          <template #prepend>
            <v-icon
              :color="syncStatus.isRunning ? 'success' : 'grey'"
              :icon="syncStatus.isRunning ? ICON.CLOUD_SYNC : ICON.CLOUD_OFF"
            />
          </template>
          <v-list-item-title>
            {{ syncStatus.isRunning ? '同步服务运行中' : '同步服务已停止' }}
          </v-list-item-title>
          <v-list-item-subtitle v-if="syncStatus.lastSyncTime">
            上次同步: {{ formatTime(syncStatus.lastSyncTime) }}
          </v-list-item-subtitle>
        </v-list-item>

        <!-- 离线队列 -->
        <v-list-item v-if="isDualMode && syncStatus">
          <template #prepend>
            <v-icon
              :color="offlineQueueItems.length > 0 ? 'warning' : 'success'"
              :icon="
                offlineQueueItems.length > 0 ? ICON.PROGRESS_UPLOAD : ICON.CHECK_CIRCLE_OUTLINE
              "
            />
          </template>
          <v-list-item-title> 离线队列: {{ offlineQueueItems.length }} 项 </v-list-item-title>
          <v-list-item-subtitle>
            {{ offlineQueueItems.length > 0 ? '等待同步到云端' : '所有数据已同步' }}
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
              <v-icon :icon="ICON.REFRESH" />
            </v-btn>
            <v-btn
              v-if="offlineQueueItems.length > 0"
              icon
              size="small"
              variant="text"
              :title="queueExpanded ? '收起' : '展开'"
              @click="queueExpanded = !queueExpanded"
            >
              <v-icon :icon="queueExpanded ? ICON.CHEVRON_UP : ICON.CHEVRON_DOWN" />
            </v-btn>
          </template>
        </v-list-item>

        <!-- 本地副本写入异常（P0-6：本地写失败不再静默） -->
        <v-list-item v-if="isDualMode && localWriteFailures.length > 0">
          <template #prepend>
            <v-icon color="error" :icon="ICON.ALERT_CIRCLE_OUTLINE" />
          </template>
          <v-list-item-title>
            本地副本写入异常: {{ localWriteFailures.length }} 项
          </v-list-item-title>
          <v-list-item-subtitle>
            云端已保存，但本地存储写入失败；离线时可能读到旧内容
          </v-list-item-subtitle>
          <template #append>
            <v-btn icon size="small" variant="text" title="刷新状态" @click="updateSyncStatus">
              <v-icon :icon="ICON.REFRESH" />
            </v-btn>
          </template>
        </v-list-item>

        <!-- 队列展开区 -->
        <v-expand-transition>
          <div v-show="queueExpanded && offlineQueueItems.length > 0">
            <v-divider class="my-1" />
            <v-list density="compact">
              <v-list-item v-for="item in offlineQueueItems" :key="item.id">
                <template #prepend>
                  <v-icon size="small" color="medium-emphasis" :icon="ICON.KEY_VARIANT" />
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
                    size="small"
                    variant="text"
                    color="error"
                    title="从队列移除（不影响本地数据）"
                    @click="removeQueueItem(item.id)"
                  >
                    <v-icon size="small" :icon="ICON.CLOSE" />
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-expand-transition>

        <v-list-item v-if="syncStatus && syncStatus.syncedCount > 0">
          <template #prepend>
            <v-icon color="success" :icon="ICON.COUNTER" />
          </template>
          <v-list-item-title> 累计已同步: {{ syncStatus.syncedCount }} 项 </v-list-item-title>
        </v-list-item>

        <v-list-item>
          <v-btn
            :disabled="!isDualMode"
            color="primary"
            :prepend-icon="ICON.SYNC"
            variant="elevated"
            @click="forceSync"
          >
            立即同步
          </v-btn>
        </v-list-item>
      </v-list>
    </settings-card>
  </div>
</template>

<script>
import { ICON } from '@/utils/icons'
import SettingsCard from '@/components/settings/SettingsCard.vue'
import SettingItem from '@/components/settings/SettingItem.vue'
import BackgroundSyncService from '@/utils/backgroundSync'
import dataProvider from '@/utils/dataProvider'
import { kvLocalProvider } from '@/utils/providers/kvLocalProvider'
import { watchSettings, getSetting, setSetting } from '@/utils/settings'
import { formatTime as formatDate } from '@/utils/dateUtils'

export default {
  name: 'SyncSettingsCard',
  components: { SettingsCard, SettingItem },
  data() {
    return {
      ICON,
      syncStatus: null,
      statusInterval: null,
      unwatchSettings: null,
      internalSyncEnabled: null,
      settingsRevision: 0,
      lastProvider: null,
      offlineQueueItems: [],
      localWriteFailures: [],
      queueExpanded: false,
      queueLoading: false,
    }
  },
  computed: {
    isDualMode() {
      this.settingsRevision
      const provider = getSetting('server.provider')
      return provider === 'dual-cloud' || provider === 'dual-server'
    },
    syncEnabled: {
      get() {
        if (this.internalSyncEnabled !== null) {
          return this.internalSyncEnabled
        }
        return getSetting('sync.enabled') !== false
      },
      set(value) {
        this.internalSyncEnabled = value
        setSetting('sync.enabled', value)
        if (value && this.isDualMode) {
          BackgroundSyncService.start()
        } else {
          BackgroundSyncService.stop()
        }
        this.updateSyncStatus()
      },
    },
    onlineLabel() {
      if (!this.syncStatus) return '检测中...'
      if (this.syncStatus.browserOnline && this.syncStatus.serverReachable) return '在线'
      if (this.syncStatus.browserOnline) return '云端服务器不可达'
      return '网络已断开'
    },
  },
  mounted() {
    this.lastProvider = getSetting('server.provider')
    this.internalSyncEnabled = getSetting('sync.enabled') !== false
    this.updateSyncStatus()
    this.loadOfflineQueue()
    this.statusInterval = setInterval(this.updateSyncStatus, 5000)
    this.unwatchSettings = watchSettings(() => {
      this.settingsRevision++
      if (this.providerChanged()) {
        if (!this.isDualMode && this.syncEnabled) {
          this.internalSyncEnabled = false
        }
      }
      this.updateSyncStatus()
    })
  },
  beforeUnmount() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval)
    }
    if (this.unwatchSettings) {
      this.unwatchSettings()
    }
  },
  methods: {
    updateSyncStatus() {
      this.syncStatus = BackgroundSyncService.getStatus()
      this.internalSyncEnabled = getSetting('sync.enabled') !== false
      this.localWriteFailures = dataProvider.getLocalWriteFailures()
      this.loadOfflineQueue()
    },
    async loadOfflineQueue() {
      this.queueLoading = true
      try {
        const result = await kvLocalProvider.getOfflineQueue()
        if (result && result.success !== false && Array.isArray(result.data)) {
          this.offlineQueueItems = result.data.slice().sort((a, b) => {
            return (a.addedAt || 0) - (b.addedAt || 0)
          })
        } else {
          this.offlineQueueItems = []
        }
      } catch (e) {
        console.warn('加载离线队列失败:', e)
        this.offlineQueueItems = []
      } finally {
        this.queueLoading = false
      }
    },
    async removeQueueItem(id) {
      try {
        await kvLocalProvider.removeFromOfflineQueue(id)
        this.offlineQueueItems = this.offlineQueueItems.filter((item) => item.id !== id)
        this.$message.success('已移除', '该条目已从离线队列移除')
      } catch (e) {
        console.warn('移除队列项失败:', e)
        this.$message.error('移除失败', e.message || '请重试')
      }
    },
    providerChanged() {
      const current = getSetting('server.provider')
      if (current !== this.lastProvider) {
        this.lastProvider = current
        return true
      }
      return false
    },
    formatTime(timestamp) {
      if (!timestamp) return '从未'
      return formatDate(timestamp)
    },
    async forceSync() {
      await BackgroundSyncService.forceSyncNow()
      this.updateSyncStatus()
      await this.loadOfflineQueue()
      this.$message.success('同步成功', '数据已同步完成')
    },
  },
}
</script>

<style scoped>
.sync-settings-group {
  width: 100%;
}
</style>
