<template>
  <settings-card
    :icon="ICON.PALETTE"
    title="主题设置"
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
    </v-list>
  </settings-card>
</template>

<script>
import { ICON } from '@/utils/icons'
import SettingsCard from '@/components/settings/SettingsCard.vue';
import {getSetting, setSetting} from '@/utils/settings';
import {useTheme} from 'vuetify';

export default {
  name: 'ThemeSettingsCard',
  components: {SettingsCard},

  setup() {
    const theme = useTheme();
    return {theme, ICON};
  },

  data() {
    return {
      localTheme: getSetting('theme.mode')
    };
  },

  watch: {
    localTheme(newValue) {
      setSetting('theme.mode', newValue);
      this.updateTheme(newValue);
    }
  },

  methods: {
    updateTheme(mode) {
      this.theme.global.name.value = mode;
    }
  }
};
</script>
