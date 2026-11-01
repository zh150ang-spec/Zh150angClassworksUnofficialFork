<template>
  <Teleport to="body">
    <div class="message-stack">
      <TransitionGroup name="message">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-item"
          :class="`message-${msg.type}`"
        >
          <div class="message-content">
            <v-icon :icon="icons[msg.type] || icons.info" class="mr-2" size="small" />
            <div class="message-text">
              <div class="message-title">
                {{ msg.title }}
              </div>
              <div v-if="msg.content" class="message-body">
                {{ msg.content }}
              </div>
              <div v-if="msg.actions && msg.actions.length > 0" class="message-actions">
                <v-btn
                  v-for="(action, idx) in msg.actions"
                  :key="idx"
                  :color="action.color || 'primary'"
                  :variant="action.variant || 'text'"
                  size="small"
                  class="mr-2"
                  @click="handleAction(msg.id, action)"
                >
                  {{ action.label }}
                </v-btn>
              </div>
            </div>
          </div>
          <v-btn
            v-if="msg.closable !== false"
            :icon="ICON.CLOSE"
            size="x-small"
            variant="text"
            class="message-close"
            @click="removeMessage(msg.id)"
          />
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script>
import { ICON } from '@/utils/icons'
import { defineComponent, ref, onBeforeUnmount } from 'vue'
import messageService from '@/utils/message'

export default defineComponent({
  name: 'GlobalMessage',
  setup() {
    const messages = ref([])
    const maxMessages = 5

    const icons = {
      success: ICON.SUCCESS,
      error: ICON.ERROR,
      warning: ICON.WARNING,
      info: ICON.INFO,
    }

    const removeMessage = (id) => {
      const index = messages.value.findIndex((m) => m.id === id)
      if (index !== -1) {
        messages.value.splice(index, 1)
      }
    }

    const addMessage = (msg) => {
      if (!msg) return

      messages.value.unshift(msg)

      if (messages.value.length > maxMessages) {
        messages.value.pop()
      }

      if (msg.timeout !== -1) {
        const timeout = msg.timeout || 3000
        setTimeout(() => {
          removeMessage(msg.id)
        }, timeout)
      }
    }

    const unsubscribe = messageService?.onSnackbar?.(addMessage)

    onBeforeUnmount(() => unsubscribe?.())

    return { messages, icons, removeMessage, ICON }
  },
})
</script>

<style scoped>
.message-stack {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 400px;
  pointer-events: none;
}

.message-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  box-shadow:
    0 4px 8px -2px rgba(0, 0, 0, 0.06),
    0 2px 4px -2px rgba(0, 0, 0, 0.05);
  pointer-events: auto;
  min-width: 280px;
  backdrop-filter: blur(8px);
}

.message-success {
  background: rgba(var(--v-theme-success), 0.95);
  color: white;
}

.message-error {
  background: rgba(var(--v-theme-error), 0.95);
  color: white;
}

.message-warning {
  background: rgba(var(--v-theme-warning), 0.95);
  color: white;
}

.message-info {
  background: rgba(var(--v-theme-primary), 0.95);
  color: white;
}

.message-content {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.message-text {
  flex: 1;
  min-width: 0;
}

.message-title {
  font-weight: 500;
  font-size: 14px;
  line-height: 1.4;
}

.message-body {
  font-size: 13px;
  opacity: 0.9;
  margin-top: 2px;
  line-height: 1.4;
}

.message-close {
  flex-shrink: 0;
  margin-left: 8px;
  opacity: 0.8;
  align-self: center;
}

.message-close:hover {
  opacity: 1;
}

.message-enter-active,
.message-leave-active {
  transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}

.message-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.message-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.message-move {
  transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}

@media (max-width: 480px) {
  .message-stack {
    left: 1rem;
    right: 1rem;
    max-width: none;
  }

  .message-item {
    min-width: auto;
  }
}
</style>
