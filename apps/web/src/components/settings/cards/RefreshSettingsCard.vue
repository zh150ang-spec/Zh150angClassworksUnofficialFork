<template>
  <div class="refresh-settings-group">
    <!-- 自动刷新卡片 -->
    <settings-card :icon="ICON.REFRESH" title="自动刷新">
      <v-list>
        <setting-item setting-key="refresh.auto" title="自动刷新" />
        <setting-item setting-key="refresh.interval" title="刷新间隔（秒）" />
      </v-list>
    </settings-card>
  </div>
</template>

<script>
import { ICON } from '@/utils/icons'
import SettingsCard from '@/components/settings/SettingsCard.vue'
import SettingItem from '@/components/settings/SettingItem.vue'

export default {
  name: 'RefreshSettingsCard',
  components: { SettingsCard, SettingItem },
  data() {
    return { ICON }
  },
}
</script>

<style scoped>
.refresh-settings-group {
  width: 100%;
}
</style>
