<template>
  <div class="settings-explorer">
    <div>
      <v-text-field
        v-model="searchQuery"
        class="mb-4"
        clearable
        density="comfortable"
        label="搜索设置"
        :prepend-inner-icon="ICON.SEARCH"
        variant="outlined"
      />


      <v-list>
        <div
          v-for="setting in allSettings"
          :key="setting.key"
        >
          <setting-item
            :key="setting.key"
            :disabled="setting.requireDeveloper && !isDeveloperMode"
            :setting-key="setting.key"
            @error="onSettingError"
            @update="onSettingUpdate"
          />
          <v-divider class="my-2" />
        </div>
      </v-list>
      <v-card border>
        <v-card-title class="text-body-large">
          当前配置
        </v-card-title>
        <v-card-text>
          <pre class="settings-json">{{ formattedSettings }}</pre>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="copySettingsToClipboard">
            复制到剪贴板
            <v-icon
              end
              :icon="ICON.CONTENT_COPY"
            />
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>
  </div>
</template>

<script>
import { ICON } from '@/utils/icons'
import {getSetting, settingsDefinitions, exportSettingsAsKeyValue, watchSettings} from '@/utils/settings';
import SettingItem from './SettingItem.vue';

export default {
  name: 'SettingsExplorer',

  components: {
    SettingItem
  },
  emits: ['update', 'error', 'message'],

  data() {
    return {
      ICON,
      searchQuery: '',
      currentSettings: {},
      unwatchFunction: null,
    };
  },

  computed: {
    isDeveloperMode() {
      return getSetting('developer.enabled');
    },

    allSettings() {
      const settings = [];

      for (const [key, definition] of Object.entries(settingsDefinitions)) {
        // 如果有搜索查询，过滤结果
        if (this.searchQuery && !key.toLowerCase().includes(this.searchQuery.toLowerCase()) &&
          !definition.description?.toLowerCase().includes(this.searchQuery.toLowerCase())) {
          continue;
        }

        settings.push({
          key,
          ...definition
        });
      }

      return settings;
    },

    formattedSettings() {
      return JSON.stringify(this.currentSettings, null, 2);
    }
  },

  created() {
    // 初始化当前设置
    this.updateCurrentSettings();

    // 监听设置变化
    this.unwatchFunction = watchSettings(() => {
      this.updateCurrentSettings();
    });
  },

  beforeUnmount() {
    // 组件销毁前取消监听
    if (this.unwatchFunction) {
      this.unwatchFunction();
    }
  },

  methods: {
    updateCurrentSettings() {
      this.currentSettings = exportSettingsAsKeyValue();
    },

    onSettingUpdate(key, value) {
      this.$emit('update', key, value);
      // 设置更新后立即更新当前设置显示
      this.updateCurrentSettings();
    },

    onSettingError(key) {
      this.$emit('error', key);
    },

    copySettingsToClipboard() {
      navigator.clipboard.writeText(JSON.stringify(this.currentSettings))
        .then(() => {
          // 可以添加一个提示，表示复制成功
          this.$emit('message', {type: 'success', text: '设置已复制到剪贴板'});
        })
        .catch(err => {
          console.error('复制到剪贴板失败:', err);
          this.$emit('message', {type: 'error', text: '复制到剪贴板失败'});
        });
    }
  }
};
</script>

<style scoped>
.settings-explorer {
  padding: var(--space-2) 0;
}

.settings-json {
  background-color: var(--color-fill-soft);
  padding: var(--space-3);
  border-radius: var(--radius-xs);
  overflow-x: auto;
  font-family: var(--font-mono);
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
}

.v-theme--dark .settings-json {
  background-color: var(--color-fill-soft);
}
</style>
