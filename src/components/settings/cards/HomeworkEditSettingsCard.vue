<template>
  <settings-card
    :icon="ICON.BOOK_EDIT"
    title="作业编辑设置"
  >
    <v-list>
      <v-list-subheader class="font-weight-bold text-primary">
        保存行为
      </v-list-subheader>
      <setting-item :setting-key="'edit.autoSave'" />


      <v-divider class="my-2" />
      <setting-item :setting-key="'edit.blockNonTodayAutoSave'" />


      <v-divider class="my-2" />
      <setting-item :setting-key="'edit.confirmNonTodaySave'" />


      <v-divider class="my-2" />
      <setting-item :setting-key="'edit.refreshBeforeEdit'" />


      <v-divider class="my-2" />

      <v-list-subheader class="font-weight-bold text-primary">
        提示语
      </v-list-subheader>
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
  name: 'HomeworkEditSettingsCard',
  components: {SettingsCard, SettingItem},
  data() {
    return { ICON };
  }
};
</script>
