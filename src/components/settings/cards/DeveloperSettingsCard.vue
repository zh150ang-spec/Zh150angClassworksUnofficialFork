<template>
  <settings-card
    :icon="ICON.CODE_TAGS"
    title="开发者选项设置"
  >
    <v-list>
      <setting-item setting-key="developer.showDebugConfig" />

      <v-divider class="my-2" />

      <v-list-item>
        <template #prepend>
          <v-icon
            class="mr-3"
            :icon="ICON.INFORMATION_OUTLINE"
          />
        </template>
        <v-list-item-title>设置键名参考</v-list-item-title>
        <v-list-item-subtitle>查看所有可用设置项的技术键名</v-list-item-subtitle>
        <template #append>
          <v-btn
            color="primary"
            density="comfortable"
            size="small"
            variant="tonal"
            @click="$emit('showSettingsExplorer')"
          >
            查看
          </v-btn>
        </template>
      </v-list-item>
    </v-list>
  </settings-card>
</template>

<script>
import { ICON } from '@/utils/icons'
import SettingsCard from '@/components/SettingsCard.vue';
import SettingItem from '@/components/settings/SettingItem.vue';

export default {
  name: 'DeveloperSettingsCard',
  components: {SettingsCard, SettingItem},
  props: {
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['saved', 'showSettingsExplorer'],
  data() {
    return { ICON };
  }
};
</script>
