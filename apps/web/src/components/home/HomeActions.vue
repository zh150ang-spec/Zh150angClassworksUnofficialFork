<template>
  <div class="home-actions d-flex flex-wrap align-center mt-4">
    <!-- 数据同步组 -->
    <div class="action-group sync-group d-flex align-center">
      <v-btn
        v-if="!synced"
        :loading="loadingUpload"
        color="error"
        size="large"
        rounded="xl"
        variant="tonal"
        :prepend-icon="ICON.UPLOAD"
        @click="$emit('upload')"
      >
        上传
      </v-btn>
      <v-btn
        v-else
        color="success"
        size="large"
        rounded="xl"
        variant="tonal"
        :prepend-icon="ICON.CHECK"
        @click="$emit('show-sync-message')"
      >
        同步完成
      </v-btn>

      <v-menu
        v-if="showUafTransferButton"
        location="bottom end"
      >
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            :disabled="uafTransferLoading"
            :loading="uafTransferLoading"
            class="ml-2"
            color="primary"
            rounded="xl"
            size="large"
            variant="tonal"
            :prepend-icon="ICON.SWAP_HORIZONTAL"
          >
            传输
          </v-btn>
        </template>
        <v-list density="comfortable">
          <v-list-item
            :prepend-icon="ICON.EXPORT_ICON"
            title="导出 UAF"
            @click="$emit('open-uaf-export')"
          />
          <v-list-item
            :prepend-icon="ICON.IMPORT_ICON"
            title="导入 UAF"
            @click="$emit('open-uaf-import')"
          />
        </v-list>
      </v-menu>
    </div>

    <!-- 工具组 -->
    <div class="action-group tools-group d-flex align-center ml-2">
      <v-btn
        v-if="showFullscreenButton"
        color="primary"
        :prepend-icon="isFullscreen ? ICON.FULLSCREEN_EXIT : ICON.FULLSCREEN"
        rounded="xl"
        size="large"
        variant="tonal"
        @click="$emit('toggle-fullscreen')"
      >
        {{ isFullscreen ? '退出全屏' : '全屏' }}
      </v-btn>

      <v-btn
        v-if="showRandomPickerButton"
        class="ml-2"
        color="primary"
        :prepend-icon="ICON.DICE_MULTIPLE"
        rounded="xl"
        size="large"
        variant="tonal"
        @click="$emit('open-random-picker')"
      >
        随机点名
      </v-btn>
    </div>

    <!-- 导航组 -->
    <div class="action-group nav-group d-flex align-center ml-2">
      <v-btn-group
        v-if="showExamScheduleButton"
        rounded="xl"
        variant="tonal"
      >
        <v-btn
          :prepend-icon="ICON.CALENDAR_CHECK"
          color="primary"
          size="large"
          @click="$router.push('/examschedule')"
        >
          考试看板
        </v-btn>
        <v-btn
          :icon="ICON.PLUS"
          color="primary"
          size="large"
          @click="$emit('add-exam-card')"
        />
      </v-btn-group>

      <v-btn
        v-if="showListCardButton"
        class="ml-2"
        color="primary"
        :prepend-icon="ICON.LIST_BOX"
        rounded="xl"
        size="large"
        variant="tonal"
        @click="$router.push('/list')"
      >
        列表
      </v-btn>
    </div>

    <!-- 管理/调试 -->
    <div class="action-group admin-group d-flex align-center ml-2">
      <v-btn
        v-if="shouldShowUrgentTestButton"
        color="warning"
        rounded="xl"
        size="large"
        variant="tonal"
        :prepend-icon="ICON.MESSAGE_ALERT"
        @click="$emit('open-urgent-test')"
      >
        发送通知
      </v-btn>
      <v-btn
        v-if="showTestCardButton"
        class="ml-2"
        color="primary"
        :prepend-icon="ICON.TEST_TUBE"
        rounded="xl"
        size="large"
        variant="tonal"
        @click="$emit('add-test-card')"
      >
        测试卡片
      </v-btn>
    </div>
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
      <p>为防止OLED/LCD屏幕烧屏，界面元素会定期微调位置。</p>
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
  name: 'HomeActions',
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
    showUafTransferButton: Boolean,
    uafTransferLoading: Boolean,
    shouldShowUrgentTestButton: Boolean,
  },
  emits: [
    'upload',
    'show-sync-message',
    'open-random-picker',
    'toggle-fullscreen',
    'add-test-card',
    'add-exam-card',
    'open-uaf-export',
    'open-uaf-import',
    'open-urgent-test',
  ],
  data() {
    return {
      ICON,
    }
  },
}
</script>

<style scoped>
.home-actions {
  gap: var(--space-2);
}

.action-group {
  display: flex;
  align-items: center;
}

@media (max-width: 600px) {
  .home-actions {
    gap: var(--space-2);
  }

  .action-group {
    margin-left: 0 !important;
  }
}

/* 主界面操作按钮在深色模式下使用高不透明度实底语义色背景，
   避免半透明色块与纯黑页面背景混为一体而难以辨识。不影响 on-surface 文字。
   注意：v-theme--dark 是直接在按钮元素上的类，必须用复合选择器（无空格）。 */
:deep(.v-btn--variant-tonal.text-primary.v-theme--dark) {
  background-color: rgba(var(--v-theme-primary), 0.98) !important;
}

:deep(.v-btn--variant-tonal.text-error.v-theme--dark) {
  background-color: rgba(var(--v-theme-error), 0.98) !important;
}

:deep(.v-btn--variant-tonal.text-success.v-theme--dark) {
  background-color: rgba(var(--v-theme-success), 0.98) !important;
}

:deep(.v-btn--variant-tonal.text-warning.v-theme--dark) {
  background-color: rgba(var(--v-theme-warning), 0.98) !important;
}
</style>
