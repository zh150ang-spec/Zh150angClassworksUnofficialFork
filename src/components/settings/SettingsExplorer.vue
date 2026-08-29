<template>
  <div class="settings-explorer">
    <div>
      <div class="d-flex align-center gap-2 mb-4 flex-wrap">
        <v-text-field
          v-model="searchQuery"
          clearable
          density="compact"
          hide-details
          label="搜索设置"
          :prepend-inner-icon="ICON.SEARCH"
          variant="outlined"
          style="min-width: 200px; flex: 1"
        />
        <v-btn
          variant="elevated"
          :color="onlyModified ? 'primary' : 'neutral-surface'"
          :prepend-icon="ICON.FILTER"
          @click="onlyModified = !onlyModified"
        >
          仅看已修改
          <v-chip
            v-if="modifiedCount > 0"
            size="x-small"
            class="ml-1"
            :color="onlyModified ? 'white' : 'primary'"
            :variant="onlyModified ? 'text' : 'tonal'"
          >
            {{ modifiedCount }}
          </v-chip>
        </v-btn>
      </div>

      <v-list>
        <template
          v-for="setting in settingsList"
          :key="setting.key"
        >
          <div v-show="isSettingVisible(setting)">
            <setting-item
              :disabled="setting.requireDeveloper && !isDeveloperMode"
              :setting-key="setting.key"
              @error="onSettingError"
              @update="onSettingUpdate"
            />
            <v-divider class="my-2" />
          </div>
        </template>
      </v-list>
      <v-card border>
        <v-card-title class="d-flex align-center text-body-large">
          <span>当前配置</span>
          <v-spacer />
          <v-btn
            :icon="dumpExpanded ? ICON.CHEVRON_UP : ICON.CHEVRON_DOWN"
            size="small"
            variant="text"
            :title="dumpExpanded ? '收起配置' : '展开配置'"
            @click="dumpExpanded = !dumpExpanded"
          />
        </v-card-title>
        <v-expand-transition>
          <div v-show="dumpExpanded">
            <v-card-text>
              <pre class="settings-json">{{ formattedSettings }}</pre>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn
                color="neutral-surface"
                variant="elevated"
                :prepend-icon="ICON.CONTENT_COPY"
                @click="copySettingsToClipboard"
              >
                复制到剪贴板
              </v-btn>
            </v-card-actions>
          </div>
        </v-expand-transition>
      </v-card>
    </div>
  </div>
</template>

<script>
import { ICON } from '@/utils/icons'
import {getSetting, settingsDefinitions, exportSettingsAsKeyValue, watchSettings} from '@/utils/settings';
import SettingItem from '@/components/settings/SettingItem.vue';

// 比较设置当前值与默认值是否相等（对象/数组需深度比较）
function isEqualValue(a, b) {
  if ((typeof a === 'object' && a !== null) || (typeof b === 'object' && b !== null)) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
}

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
      onlyModified: false,
      dumpExpanded: false,
      currentSettings: {},
      unwatchFunction: null,
    };
  },

  computed: {
    isDeveloperMode() {
      return getSetting('developer.enabled');
    },

    // 已修改（非默认值）的设置数量
    // 基于响应式的 currentSettings 计算，设置变化时计数自动刷新
    modifiedCount() {
      let count = 0;
      for (const [key, definition] of Object.entries(settingsDefinitions)) {
        if (!isEqualValue(this.currentSettings[key], definition.default)) {
          count++;
        }
      }
      return count;
    },

    // 全部设置项（稳定列表，筛选仅切换 v-show 可见性，避免重挂载导致卡顿）
    settingsList() {
      return Object.entries(settingsDefinitions).map(([key, definition]) => ({
        key,
        ...definition,
      }));
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
    // 判断设置项是否可见（搜索 + 仅看已修改），只切换 v-show 不影响已挂载组件
    isSettingVisible(setting) {
      // 搜索过滤
      if (
        this.searchQuery &&
        !setting.key.toLowerCase().includes(this.searchQuery.toLowerCase()) &&
        !setting.description?.toLowerCase().includes(this.searchQuery.toLowerCase())
      ) {
        return false;
      }

      // 仅看已修改
      if (
        this.onlyModified &&
        isEqualValue(this.currentSettings[setting.key], setting.default)
      ) {
        return false;
      }

      return true;
    },

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
