<template>
  <div class="d-flex flex-wrap align-center mt-4">
    <v-btn
      v-if="!synced"
      :loading="loadingUpload"
      class="ml-2"
      color="error"
      size="large"
      rounded="xl"
      @click="$emit('upload')"
    >
      上传
    </v-btn>
    <v-btn
      v-else
      color="success"
      size="large"
      rounded="xl"
      @click="$emit('show-sync-message')"
    >
      同步完成
    </v-btn>
    <v-btn
      v-if="showRandomPickerButton"
      :append-icon="ICON.DICE_MULTIPLE"
      class="ml-2"
      color="amber"
      :prepend-icon="ICON.ACCOUNT_QUESTION"
      rounded="xl"
      size="large"
      @click="$emit('open-random-picker')"
    >
      随机点名
    </v-btn>
    <v-btn-group
      v-if="showExamScheduleButton"
      class="ml-2"
      color="green"
      variant="elevated"
      divided
    >
      <v-btn
        :prepend-icon="ICON.CALENDAR_CHECK"
        size="large"
        @click="$router.push('/examschedule')"
      >
        考试看板
      </v-btn>
      <v-btn
        :icon="ICON.PLUS"
        size="large"
        @click="$emit('add-exam-card')"
      />
    </v-btn-group>
    <v-btn
      v-if="showListCardButton"
      class="ml-2"
      color="primary-darken-1"
      :prepend-icon="ICON.LIST_BOX"
      rounded="xl"
      size="large"
      @click="$router.push('/list')"
    >
      列表
    </v-btn>
    <v-btn
      v-if="showFullscreenButton"
      :color="isFullscreen ? 'medium-emphasis' : 'primary'"
      :prepend-icon="
        isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'
      "
      class="ml-2"
      rounded="xl"
      size="large"
      @click="$emit('toggle-fullscreen')"
    >
      {{ isFullscreen ? "退出全屏" : "全屏显示" }}
    </v-btn>
    <v-btn
      v-if="showTestCardButton"
      class="ml-2"
      color="purple"
      :prepend-icon="ICON.TEST_TUBE"
      rounded="xl"
      size="large"
      @click="$emit('add-test-card')"
    >
      添加测试卡片
    </v-btn>
  </div>

  <v-card
    v-if="showAntiScreenBurnCard"
    border
    class="mt-4 anti-burn-card"
    color="primary"
    variant="tonal"
  >
    <v-card-title class="text-body-large">
      <v-icon
        :icon="ICON.SHIELD_CHECK"
        size="small"
        start
      />
      屏幕保护技术已启用
    </v-card-title>
    <v-card-text class="text-body-medium">
      <p>
        为防止OLED/LCD屏幕烧屏，界面元素会定期微调位置。
      </p>
      <p class="text-body-small text-medium-emphasis">
        此功能不会影响正常使用，仅在长时间静止显示时生效。
      </p>
      <p class="text-body-small text-medium-emphasis">
        建议在放学后关闭显示器以节约能源。
      </p>
    </v-card-text>
  </v-card>
</template>

<script>
import { ICON } from '@/utils/icons'
export default {
  name: "HomeActions",
  props: {
    synced: Boolean,
    loadingUpload: Boolean,
    showRandomPickerButton: Boolean,
    showExamScheduleButton: Boolean,
    showListCardButton: Boolean,
    showFullscreenButton: Boolean,
    isFullscreen: Boolean,
    showAntiScreenBurnCard: Boolean,
    showTestCardButton: Boolean,
  },
  emits: [
    "upload",
    "show-sync-message",
    "open-random-picker",
    "toggle-fullscreen",
    "add-test-card",
    "add-exam-card",
  ],
  data() {
    return {
      ICON,
    };
  },
};
</script>
