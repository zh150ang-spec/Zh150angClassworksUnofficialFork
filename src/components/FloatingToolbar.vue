<template>
  <div class="floating-toolbar-container">
    <v-slide-y-transition>
      <v-card
        :class="{ 'toolbar-expanded': isExpanded }"
        class="floating-toolbar"
        elevation="4"
        rounded="xl"
      >
        <div class="toolbar-buttons">
          <v-btn
            v-ripple
            :title="'查看昨天'"
            class="toolbar-btn"
            :icon="ICON.CHEVRON_LEFT"
            size="40"
            variant="text"
            @click="$emit('prev-day')"
          />
          <v-btn
            v-ripple
            :title="'缩小字体'"
            class="toolbar-btn"
            :icon="ICON.FORMAT_FONT_SIZE_DECREASE"
            size="40"
            variant="text"
            @click="$emit('zoom', 'out')"
          />
          <v-btn
            v-ripple
            :title="'放大字体'"
            class="toolbar-btn"
            :icon="ICON.FORMAT_FONT_SIZE_INCREASE"
            size="40"
            variant="text"
            @click="$emit('zoom', 'up')"
          />
          <v-menu
            :close-on-content-click="false"
            location="top"
          >
            <template #activator="{ props }">
              <v-btn
                v-ripple
                :title="'选择日期'"
                class="toolbar-btn"
                :icon="ICON.CALENDAR"
                size="40"
                v-bind="props"
                variant="text"
              />
            </template>
            <v-card
              border
              class="date-picker-card"
            >
              <v-date-picker
                :model-value="selectedDate"
                color="primary"
                elevation="0"
                show-adjacent-months
                @update:model-value="onDateChange"
              />
            </v-card>
          </v-menu>
          <v-btn
            v-ripple
            :loading="loading"
            :title="'刷新数据'"
            class="toolbar-btn"
            :icon="ICON.REFRESH"
            size="40"
            variant="text"
            @click="$emit('refresh')"
          />

          <v-btn
            v-if="!isToday"
            v-ripple
            :title="'查看明天'"
            class="toolbar-btn"
            :icon="ICON.CHEVRON_RIGHT"
            size="40"
            variant="text"
            @click="$emit('next-day')"
          />
        </div>
      </v-card>
    </v-slide-y-transition>

    <!-- Side Action Button -->
    <v-slide-x-reverse-transition>
      <v-btn
        v-if="isPastDate && hasHomework"
        :loading="copyToTodayLoading"
        :disabled="copyToTodayLoading"
        class="side-action-btn"
        color="primary"
        elevation="4"
        :prepend-icon="ICON.CONTENT_COPY"
        rounded="xl"
        size="large"
        text="复制作业内容到今天"
        @click="$emit('copy-to-today')"
      >
        复制到今天
      </v-btn>
    </v-slide-x-reverse-transition>
  </div>
</template>

<script>
import { ICON } from '@/utils/icons'
export default {
  name: "FloatingToolbar",
  props: {
    loading: {
      type: Boolean,
      default: false,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    selectedDate: {
      type: [String, Date],
      required: true,
    },
    isToday: {
      type: Boolean,
      required: true,
    },
    isPastDate: {
      type: Boolean,
      default: false,
    },
    copyToTodayLoading: {
      type: Boolean,
      default: false,
    },
    hasHomework: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['prev-day', 'zoom', 'refresh', 'next-day', 'copy-to-today', 'date-select'],
  data() {
    return {
      ICON,
      isExpanded: false,
    };
  },
  methods: {
    handleDateSelect(newDate) {
      this.$emit("date-select", newDate);
    },
  },
};
</script>

<style scoped>
.floating-toolbar-container {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 0;
  z-index: var(--z-float);
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.floating-toolbar {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);

  transition: all var(--duration-normal) var(--ease-apple);
  background: rgba(var(--v-theme-surface-container), 0.75) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-raised) !important;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px;
  pointer-events: auto;
  will-change: transform;
  border-radius: var(--radius-xl) !important;
}

.floating-toolbar:hover {
  transform: translateX(-50%) translateY(-4px);
  background: rgba(var(--v-theme-surface-container), 0.88) !important;
  box-shadow: var(--shadow-overlay) !important;
}

.toolbar-buttons {
  display: flex;
  align-items: center;
}

.toolbar-btn {
  margin: 0 2px;
  border-radius: 50% !important;
  overflow: hidden !important;
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  min-height: 40px !important;
  max-width: 40px !important;
  max-height: 40px !important;
  transition: background-color var(--duration-fast) var(--ease-apple),
              box-shadow var(--duration-fast) var(--ease-apple) !important;
}

.toolbar-btn:hover {
  background: rgba(var(--v-theme-primary), 0.12) !important;
  box-shadow: var(--shadow-ring) !important;
}

.toolbar-btn:active {
  background: rgba(var(--v-theme-primary), 0.20) !important;
}

.side-action-btn {
  position: absolute;
  bottom: 24px;
  right: 24px;
  pointer-events: auto;
  z-index: var(--z-float-top);
  background: rgba(var(--v-theme-surface-container-high), 0.92) !important;
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg) !important;
}

.date-picker-card {
  border-radius: var(--radius-md);
  overflow: hidden;
  background: rgba(var(--v-theme-surface-container-high), 0.95) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
}

@media (max-width: 600px) {
  .floating-toolbar {
    bottom: 16px;
    width: auto;
    max-width: 95%;
    padding: 2px;
  }

  .toolbar-buttons {
    width: 100%;
    justify-content: space-around;
    padding: 4px;
  }

  .toolbar-btn {
    margin: 0;
    min-width: 40px;
    min-height: 40px;
  }

  .side-action-btn {
    bottom: 80px; /* Move above toolbar on mobile */
    right: 16px;
  }
}
</style>
