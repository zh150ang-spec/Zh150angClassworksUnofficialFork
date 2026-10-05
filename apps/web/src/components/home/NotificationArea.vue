<template>
  <v-row v-if="notifications.length > 0" class="mb-4">
    <v-col cols="12">
      <v-card class="notification-list-card" color="primary" variant="tonal" border rounded="xl">
        <v-card-text class="pa-3">
          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="notification-item d-flex align-center py-2 px-3 rounded-lg"
            :class="{ 'notification-item--urgent': notification.isUrgent }"
            @click="$emit('show-detail', notification)"
          >
            <v-icon
              :color="notification.isUrgent ? 'error' : 'primary'"
              size="small"
              class="mr-3 flex-shrink-0"
              :icon="notification.isUrgent ? ICON.ALERT_CIRCLE_OUTLINE : ICON.INFORMATION_OUTLINE"
            />
            <span class="text-body-large text-truncate flex-grow-1">
              {{ notification.message }}
            </span>
            <v-btn
              :icon="ICON.CHEVRON_RIGHT"
              variant="text"
              density="comfortable"
              size="small"
              class="flex-shrink-0"
            />
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>

  <!-- 通知详情对话框 -->
  <v-dialog
    :model-value="modelValue"
    max-width="700"
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card v-if="currentNotification" class="rounded-xl">
      <v-card-title class="d-flex align-center pa-4 text-headline-medium">
        <span :class="currentNotification.isUrgent ? 'text-error' : ''" class="font-weight-bold">
          {{ currentNotification.isUrgent ? '强调通知' : '通知详情' }}
        </span>
        <v-spacer />
        <v-btn :icon="ICON.CLOSE" variant="text" @click="$emit('update:modelValue', false)" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <div
          class="text-headline-large font-weight-medium mb-4"
          style="line-height: var(--line-height-code)"
        >
          {{ currentNotification.message }}
        </div>
        <div class="text-body-large text-medium-emphasis">发布时间：{{ formattedTime }}</div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn
          color="error"
          :prepend-icon="ICON.DELETE"
          size="x-large"
          variant="tonal"
          class="px-6"
          @click="$emit('remove', currentNotification.id)"
        >
          删除通知
        </v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          size="x-large"
          variant="elevated"
          class="px-8"
          @click="$emit('update:modelValue', false)"
        >
          关闭
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ICON } from '@/utils/icons'
defineProps({
  notifications: {
    type: Array,
    default: () => [],
  },
  modelValue: Boolean,
  currentNotification: {
    type: Object,
    default: null,
  },
  formattedTime: {
    type: String,
    default: '',
  },
})

defineEmits(['update:modelValue', 'show-detail', 'remove'])
</script>

<style scoped>
.notification-list-card {
  overflow: hidden;
}

.notification-item {
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-apple);
  border-left: 3px solid transparent;
}

.notification-item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

.notification-item--urgent {
  border-left-color: rgb(var(--v-theme-error));
  background: rgba(var(--v-theme-error), 0.06);
}

.notification-item--urgent:hover {
  background: rgba(var(--v-theme-error), 0.12);
}
</style>
