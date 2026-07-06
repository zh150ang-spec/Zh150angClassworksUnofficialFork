<template>
  <settings-card
    :icon="ICON.SETTINGS"
    title="编辑设置"
  >
    <v-list>
      <setting-item :setting-key="'edit.autoSave'" />


      <v-divider class="my-2" />
      <setting-item :setting-key="'edit.blockNonTodayAutoSave'" />


      <v-divider class="my-2" />
      <setting-item :setting-key="'edit.confirmNonTodaySave'" />


      <v-divider class="my-2" />
      <setting-item :setting-key="'edit.refreshBeforeEdit'" />


      <v-divider class="my-2" />
      <setting-item :setting-key="'edit.autoSavePromptText'" />


      <v-divider class="my-2" />
      <setting-item :setting-key="'edit.manualSavePromptText'" />
    </v-list>
  </settings-card>
</template>

<script>
import { ICON } from '@/utils/icons'
import SettingsCard from '@/components/SettingsCard.vue';
import SettingItem from '../SettingItem.vue';

export default {
  name: 'EditSettingsCard',
  components: {SettingsCard, SettingItem},
  data() {
    return { ICON };
  }
};
</script>
