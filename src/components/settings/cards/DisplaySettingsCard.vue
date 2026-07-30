<template>
  <settings-card
    border
    :icon="ICON.MONITOR"
    title="显示设置"
  >
    <v-list>
      <v-list-item>
        <template #prepend>
          <v-icon
            class="mr-3"
            :icon="ICON.THEME_LIGHT_DARK"
          />
        </template>
        <v-list-item-title>主题模式</v-list-item-title>
        <v-list-item-subtitle>选择明亮或暗黑主题</v-list-item-subtitle>
        <template #append>
          <v-btn-toggle
            v-model="localTheme"
            color="primary"
            density="comfortable"
          >
            <v-btn value="light">
              <v-icon
                class="mr-2"
                :icon="ICON.WHITE_BALANCE_SUNNY"
              />
              明亮
            </v-btn>
            <v-btn value="dark">
              <v-icon
                class="mr-2"
                :icon="ICON.MOON_WANING_CRESCENT"
              />
              暗黑
            </v-btn>
          </v-btn-toggle>
        </template>
      </v-list-item>

      <v-divider class="my-2" />

      <v-list-subheader class="font-weight-bold text-primary">
        按钮
      </v-list-subheader>

      <setting-item :setting-key="'display.showRandomButton'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.showFullscreenButton'" />

      <v-divider class="my-2" />

      <v-list-subheader class="font-weight-bold text-primary">
        卡片
      </v-list-subheader>

      <setting-item :setting-key="'timeCard.enabled'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.showListCard'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.showExamScheduleButton'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.showAntiScreenBurnCard'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.dynamicSort'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.cardHoverEffect'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.showUafTransfer'" />

      <v-divider class="my-2" />

      <v-list-subheader class="font-weight-bold text-primary">
        交互
      </v-list-subheader>

      <setting-item :setting-key="'display.showQuickTools'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.enhancedTouchMode'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.forceDesktopMode'" />

      <v-divider class="my-2" />

      <v-list-subheader class="font-weight-bold text-primary">
        其他
      </v-list-subheader>

      <setting-item :setting-key="'display.emptySubjectDisplay'" />

      <v-divider class="my-2" />
      <setting-item :setting-key="'display.lateStudentsArePresent'" />
    </v-list>
  </settings-card>
</template>

<script>
import { ICON } from '@/utils/icons'
import SettingsCard from '@/components/SettingsCard.vue';
import SettingItem from '@/components/settings/SettingItem.vue';
import {getSetting, setSetting} from '@/utils/settings';
import {useTheme} from 'vuetify';

export default {
  name: 'DisplaySettingsCard',
  components: {SettingsCard, SettingItem},

  setup() {
    const theme = useTheme();
    return {theme, ICON};
  },

  data() {
    return {
      localTheme: getSetting('theme.mode'),
    };
  },

  watch: {
    localTheme(newValue) {
      setSetting('theme.mode', newValue);
      this.theme.global.name.value = newValue;
    },
  },
};
</script>
