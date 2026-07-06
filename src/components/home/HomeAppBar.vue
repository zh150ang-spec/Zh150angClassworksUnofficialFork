<template>
  <v-app-bar class="no-select">
    <v-app-bar-title>
      {{ title }}
    </v-app-bar-title>

    <v-spacer />

    <template #append>
      <!-- 只读 Token 警告 -->
      <v-chip
        v-if="tokenDisplayInfo.readonly"
        class="mx-2"
        color="warning"
        :prepend-icon="ICON.LOCK_ALERT"
        variant="tonal"
      >
        只读
      </v-chip>

      <!-- 学生名称显示 chip（始终蓝色） -->
      <v-chip
        v-if="tokenDisplayInfo.show"
        :style="{ cursor: tokenDisplayInfo.disabled ? 'default' : 'pointer' }"
        class="mx-2"
        color="primary"
        :prepend-icon="ICON.ACCOUNT"
        variant="tonal"
        @click="$emit('token-chip-click')"
      >
        {{ tokenDisplayInfo.text }}
      </v-chip>

      <v-btn
        v-if="shouldShowUrgentTestButton"
        :prepend-icon="ICON.CHAT"
        variant="tonal"
        @click="$emit('open-urgent-test')"
      >
        发送通知
      </v-btn>
      <v-btn
        :icon="ICON.CHAT"
        variant="text"
        @click="$emit('open-chat')"
      />
      <v-btn
        :badge="unreadCount || undefined"
        :badge-color="unreadCount ? 'error' : undefined"
        :icon="ICON.BELL"
        variant="text"
        @click="$emit('open-messages')"
      />
      <v-btn
        :icon="ICON.SETTINGS"
        variant="text"
        @click="$emit('open-settings')"
      />
    </template>
  </v-app-bar>
</template>

<script setup>
import { ICON } from '@/utils/icons'
defineProps({
  title: {
    type: String,
    default: "",
  },
  tokenDisplayInfo: {
    type: Object,
    default: () => ({
      readonly: false,
      show: false,
      disabled: false,
      text: "",
      color: "primary",
      variant: "tonal",
      icon: ICON.ACCOUNT,
    }),
  },
  shouldShowUrgentTestButton: Boolean,
  unreadCount: {
    type: Number,
    default: 0,
  },
});

defineEmits([
  "token-chip-click",
  "open-urgent-test",
  "open-chat",
  "open-messages",
  "open-settings",
]);
</script>
