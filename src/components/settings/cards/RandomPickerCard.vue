<template>
  <settings-card
    :icon="ICON.ACCOUNT_QUESTION"
    title="随机抽选设置"
  >
    <v-list>
      <v-list-subheader class="font-weight-bold text-primary">
        基本设置
      </v-list-subheader>
      <setting-item setting-key="randomPicker.enabled" />
      <v-divider class="my-2" />
      <setting-item setting-key="randomPicker.mode" />

      <v-divider class="my-2" />

      <v-list-subheader class="font-weight-bold text-primary">
        随机范围
      </v-list-subheader>
      <setting-item setting-key="randomPicker.minNumber" />
      <v-divider class="my-2" />
      <setting-item setting-key="randomPicker.maxNumber" />

      <v-divider class="my-2" />

      <v-list-subheader class="font-weight-bold text-primary">
        抽取与动画
      </v-list-subheader>
      <setting-item setting-key="randomPicker.defaultCount" />
      <v-divider class="my-2" />
      <setting-item setting-key="randomPicker.animation" />
    </v-list>
  </settings-card>
</template>

<script>
import { ICON } from '@/utils/icons'
import SettingsCard from '@/components/SettingsCard.vue';
import SettingItem from '../SettingItem.vue';

export default {
  name: 'RandomPickerCard',
  components: { SettingsCard, SettingItem },
  data() {
    return { ICON };
  }
};
</script>
