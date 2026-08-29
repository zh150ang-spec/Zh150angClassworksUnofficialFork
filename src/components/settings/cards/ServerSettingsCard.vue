<template>
  <settings-card
    :loading="loading"
    :icon="ICON.DATABASE"
    title="服务器设置"
  >
    <v-form>
      <v-select
        v-model="serverSettings.provider"
        :items="[
          { title: '云端+本地双存储 (推荐)', value: 'dual-cloud' },
          { title: 'KV服务器+本地双存储', value: 'dual-server' },
          { title: '仅Classworks云端', value: 'classworkscloud' },
          { title: '仅KV本地存储', value: 'kv-local' },
          { title: '仅KV远程服务器', value: 'kv-server' }
        ]"
        class="mb-0"
        density="comfortable"
        item-title="title"
        item-value="value"
        label="数据提供者"
        :prepend-icon="ICON.DATABASE"
        variant="outlined"
      />

      <v-alert
        v-if="isDualMode"
        class="mt-0 mb-2"
        color="info"
        variant="tonal"
      >
        <v-alert-title>双存储模式</v-alert-title>
        <p>数据同时保存在云端和本地，云端不可用时自动使用本地数据。</p>
      </v-alert>

      <v-alert
        v-if="isKvProvider"
        class="mb-2"
        color="info"
        variant="tonal"
      >
        <v-alert-title>{{ kvProviderTitle }}</v-alert-title>
        <p>使用本机唯一标识符区分不同设备的数据。</p>
        <p v-if="currentProvider === 'kv-server' || currentProvider === 'dual-server'">
          服务器地址格式: <code>https://服务器域名/</code>（仅填写基础URL）
        </p>
      </v-alert>

      <v-alert
        v-if="isClassworksCloud"
        class="mb-2"
        color="info"
        variant="tonal"
      >
        <v-alert-title>Classworks 云端存储</v-alert-title>
        <p>官方提供的云端存储，自动配置访问设置。</p>
      </v-alert>

      <template v-if="isClassworksCloud || isDualCloud || currentProvider === 'kv-server' || currentProvider === 'dual-server'">
        <v-divider class="my-2" />

        <div v-if="isClassworksCloud || isDualCloud">
          <v-text-field
            v-model="serverSettings.kvToken"
            class="mb-2"
            density="comfortable"
            hint="令牌用于云端存储授权"
            label="KV 授权令牌"
            persistent-hint
            :prepend-icon="ICON.SHIELD_KEY"
            variant="outlined"
          />

          <cloud-namespace-info-card
            :visible="isClassworksCloud || isDualCloud"
            class="mt-4"
          />
        </div>

        <div v-else-if="currentProvider === 'kv-server' || currentProvider === 'dual-server'">
          <v-text-field
            v-model="serverSettings.domain"
            class="mb-2"
            density="comfortable"
            hint="例如: https://example.com (不需要路径)"
            label="服务器域名"
            persistent-hint
            :prepend-icon="ICON.WEB"
            variant="outlined"
          />

          <v-text-field
            v-model="serverSettings.kvToken"
            class="mb-2"
            density="comfortable"
            hint="令牌用于服务器验证"
            label="KV 授权令牌"
            persistent-hint
            :prepend-icon="ICON.SHIELD_KEY"
            variant="outlined"
          />
        </div>
      </template>

      <v-divider class="my-2" />

      <div class="d-flex align-center mb-2">
        <v-icon
          :icon="ICON.ACCOUNT_GROUP"
          class="mr-3"
        />
        <span class="text-body-large font-weight-bold">班级编号设置</span>
        <v-spacer />
        <v-radio-group
          v-if="useServer"
          v-model="serverSettings.classNumberSource"
          density="compact"
          hide-details
          inline
        >
          <v-radio
            value="cloud"
            label="云端"
          />
          <v-radio
            value="local"
            label="本地"
          />
        </v-radio-group>
      </div>

      <div
        v-if="serverSettings.classNumberSource === 'local'"
        class="d-flex align-center mb-2"
      >
        <v-icon
          :icon="ICON.ACCOUNT_GROUP"
          class="mr-3"
        />
        <v-text-field
          v-model="serverSettings.classNumber"
          class="flex-grow-1"
          density="comfortable"
          hint="例如: 高三八班"
          label="本地班级编号"
          persistent-hint
          variant="outlined"
        />
      </div>

      <v-alert
        v-if="useServer && serverSettings.classNumberSource === 'cloud'"
        class="mb-2"
        color="info"
        density="compact"
        variant="tonal"
      >
        当前使用云端提供的班级编号。如需修改，请切换到本地设置或联系管理员修改云端配置。
      </v-alert>
    </v-form>

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
import CloudNamespaceInfoCard from "@/components/settings/cards/CloudNamespaceInfoCard.vue";
import {getSetting, setSetting, watchSettings} from "@/utils/settings";
import BackgroundSyncService from "@/utils/backgroundSync";

export default {
  name: "ServerSettingsCard",
  components: {SettingsCard, CloudNamespaceInfoCard},
  props: {
    loading: Boolean,
  },
  data() {
    return {
      ICON,
      unwatch: null,
      serverSettings: {
        provider: getSetting("server.provider"),
        domain: getSetting("server.domain"),
        classNumber: getSetting("server.classNumber"),
        classNumberSource: getSetting("server.classNumberSource") || "cloud",
        kvToken: getSetting("server.kvToken"),
      },
      settingsChangeTimeout: null,
      lastProvider: null,
      showEnableSyncDialog: false
    };
  },
  computed: {
    currentProvider() {
      return this.serverSettings.provider;
    },
    isDualMode() {
      return this.currentProvider === 'dual-cloud' || this.currentProvider === 'dual-server';
    },
    isDualCloud() {
      return this.currentProvider === 'dual-cloud';
    },
    isKvProvider() {
      return ['kv-local', 'kv-server', 'dual-server'].includes(this.currentProvider);
    },
    isLocalKvProvider() {
      return this.currentProvider === 'kv-local';
    },
    kvProviderTitle() {
      if (this.isLocalKvProvider) return '本地 KV 存储';
      return 'KV 存储';
    },
    isClassworksCloud() {
      return this.currentProvider === 'classworkscloud';
    },
    useServer() {
      return this.currentProvider === 'server' || this.currentProvider === 'kv-server' || this.currentProvider === 'classworkscloud' || this.isDualMode;
    }
  },
  watch: {
    // 监视 serverSettings 的深层变化
    serverSettings: {
      handler() {
        // 使用防抖处理，避免频繁刷新
        if (this.settingsChangeTimeout) {
          clearTimeout(this.settingsChangeTimeout);
        }
        // 延迟保存，提供更好的用户体验
        this.settingsChangeTimeout = setTimeout(() => {
          this.saveAllSettings();
        }, 100);
      },
      deep: true
    }
  },
  mounted() {
    // 加载所有设置
    this.loadAllSettings();
    this.lastProvider = this.currentProvider;

    // 订阅全局设置变更事件
    this.unwatch = watchSettings(() => {
      // 当设置从其他地方（如其他标签页、其他组件）改变时，刷新本地状态
      this.loadAllSettings();
      // 检查数据提供者是否变化
      this.checkProviderChange();
    });
  },
  beforeUnmount() {
    if (this.unwatch) this.unwatch();
  },
  methods: {
    // 检查数据提供者是否变化
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

    // 从全局设置加载所有设置到本地
    loadAllSettings() {
      this.serverSettings = {
        provider: getSetting("server.provider"),
        domain: getSetting("server.domain"),
        classNumber: getSetting("server.classNumber"),
        classNumberSource: getSetting("server.classNumberSource") || "cloud",
        kvToken: getSetting("server.kvToken"),
      };
    },

    // 保存所有本地设置到全局
    saveAllSettings() {
      Object.entries(this.serverSettings).forEach(([key, value]) => {
        const settingKey = `server.${key}`;
        const currentValue = getSetting(settingKey);

        // 只有当值发生变化时才进行设置
        if (value !== currentValue) {
          const success = setSetting(settingKey, value);
          if (success) {
            console.log(`设置已更新: ${settingKey} = ${value}`);
          } else {
            console.error(`设置失败: ${settingKey}`);
            // 如果设置失败，恢复值
            this.serverSettings[key] = currentValue;
          }
        }
      });
    },


  }
};
</script>
