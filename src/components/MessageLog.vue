<template>
  <v-navigation-drawer
    v-if="drawer"
    v-model="drawer"
    location="right"
    temporary
    width="400"
  >
    <v-toolbar
      class="message-toolbar"
      color="primary"
    >
      <v-toolbar-title>消息记录</v-toolbar-title>
      <v-spacer />
      <v-btn
        :icon="ICON.CLOSE"
        variant="text"
        @click="drawer = false"
      />
    </v-toolbar>

    <v-list>
      <v-list-item
        v-for="msg in messages"
        :key="msg.id"
        rounded
      >
        <template #prepend>
          <v-icon
            :color="colors[msg.type]"
            :icon="icons[msg.type]"
            size="20"
          />
        </template>

        <v-list-item-title>{{ msg.title }}</v-list-item-title>
        <v-list-item-subtitle v-if="msg.content">
          {{
            msg.content
          }}
        </v-list-item-subtitle>
        <span class="text-body-small text-medium-emphasis">
          {{ new Date(msg.timestamp).toLocaleTimeString() }}
        </span>
      </v-list-item>

      <v-list-item v-if="!messages.length">
        <template #prepend>
          <v-icon
            color="medium-emphasis"
            :icon="ICON.INBOX"
          />
        </template>
        <v-list-item-title class="text-medium-emphasis">
          暂无消息
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script>
import { ICON } from '@/utils/icons'
import {defineComponent, ref} from "vue";
import messageService from "@/utils/message";

export default defineComponent({
  name: "MessageLog",
  setup() {
    const drawer = ref(false);
    const messages = ref([]);

    const icons = {
      success: ICON.SUCCESS,
      error: ICON.ERROR,
      warning: ICON.WARNING,
      info: ICON.INFO,
    };

    const colors = {
      success: "success",
      error: "error",
      warning: "warning",
      info: "primary",
    };

    messageService.onLog((msgs) => {
      if (msgs) {
        messages.value = msgs;
      }
    });

    return {
      drawer,
      messages,
      icons,
      colors,
      ICON,
      deleteMessage: (id) => messageService.deleteMessage(id),
      clearMessages: () => messageService.clearMessages(),
    };
  },
});
</script>

<style scoped>
.message-toolbar {
  box-shadow: var(--shadow-sm);
}

.v-list-item {
  margin: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm) !important;
  transition: background-color var(--duration-fast) var(--var(--ease-apple)-apple);
}

.v-list-item:hover {
  background: rgba(var(--v-theme-primary), 0.05);
}
</style>
