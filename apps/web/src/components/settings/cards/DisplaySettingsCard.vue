<template>
  <settings-card border :icon="ICON.MONITOR" title="显示设置">
    <v-list>
      <v-list-subheader class="font-weight-bold text-primary"> 按钮 </v-list-subheader>

      <setting-item :setting-key="'display.showRandomButton'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.showFullscreenButton'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.showUafTransfer'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.showListCard'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.showExamScheduleButton'" />

      <v-divider class="my-2" />

      <v-list-subheader class="font-weight-bold text-primary"> 卡片 </v-list-subheader>

      <setting-item :setting-key="'timeCard.enabled'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.showAntiScreenBurnCard'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.dynamicSort'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.cardHoverEffect'" />

      <v-divider class="my-2" />

      <v-list-subheader class="font-weight-bold text-primary"> 交互 </v-list-subheader>

      <setting-item :setting-key="'display.showQuickTools'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.showPasteButtons'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.enhancedTouchMode'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.forceDesktopMode'" />

      <v-divider class="my-2" />

      <v-list-subheader class="font-weight-bold text-primary"> 其他 </v-list-subheader>

      <setting-item :setting-key="'display.emptySubjectDisplay'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.lateStudentsArePresent'" />
    </v-list>
  </settings-card>
</template>

<script>
import { ICON } from '@/utils/icons'
import SettingsCard from '@/components/settings/SettingsCard.vue'
import SettingItem from '@/components/settings/SettingItem.vue'

export default {
  name: 'DisplaySettingsCard',
  components: { SettingsCard, SettingItem },

  setup() {
    return { ICON }
  },
}
</script>
