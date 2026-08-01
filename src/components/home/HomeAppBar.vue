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

      <!-- 通讯菜单：合并消息与设备聊天 -->
      <v-menu location="bottom end">
        <template #activator="{ props: menuProps }">
          <v-badge
            :content="unreadCount"
            :model-value="unreadCount > 0"
            color="error"
            offset-x="6"
            offset-y="6"
          >
            <v-btn
              v-bind="menuProps"
              :icon="ICON.MESSAGE_TEXT"
              variant="text"
            />
          </v-badge>
        </template>
        <v-list density="comfortable">
          <v-list-item
            :prepend-icon="ICON.BELL"
            title="消息记录"
            @click="$emit('open-messages')"
          />
          <v-list-item
            :prepend-icon="ICON.CHAT"
            title="设备聊天"
            @click="$emit('open-chat')"
          />
        </v-list>
      </v-menu>

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
  unreadCount: {
    type: Number,
    default: 0,
  },
});

defineEmits([
  "token-chip-click",
  "open-chat",
  "open-messages",
  "open-settings",
]);
</script>
