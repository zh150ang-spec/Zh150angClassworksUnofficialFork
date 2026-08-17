<template>
  <div class="floating-toolbar-container">
    <v-slide-y-transition>
      <v-card
        class="floating-toolbar"
        elevation="4"
        rounded="xl"
      >
        <v-btn
          :title="'查看昨天'"
          class="toolbar-btn"
          rounded="lg"
          variant="text"
          @click="$emit('prev-day')"
        >
          <div class="toolbar-btn-inner">
            <v-icon
              :icon="ICON.CHEVRON_LEFT"
              size="x-large"
            />
            <span class="btn-label">昨天</span>
          </div>
        </v-btn>

        <v-menu
          :close-on-content-click="false"
          location="top"
        >
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              :title="'选择日期'"
              class="toolbar-btn"
              rounded="lg"
              variant="text"
            >
              <div class="toolbar-btn-inner">
                <v-icon
                  :icon="ICON.CALENDAR"
                  size="x-large"
                />
                <span class="btn-label">日期</span>
              </div>
            </v-btn>
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
          :title="'查看明天'"
          class="toolbar-btn"
          rounded="lg"
          variant="text"
          @click="$emit('next-day')"
        >
          <div class="toolbar-btn-inner">
            <v-icon
              :icon="ICON.CHEVRON_RIGHT"
              size="x-large"
            />
            <span class="btn-label">明天</span>
          </div>
        </v-btn>

        <v-divider
          vertical
          class="toolbar-divider"
        />

        <v-btn
          :title="'缩小字体'"
          class="toolbar-btn"
          rounded="lg"
          variant="text"
          @click="$emit('zoom', 'out')"
        >
          <div class="toolbar-btn-inner">
            <v-icon
              :icon="ICON.FORMAT_FONT_SIZE_DECREASE"
              size="x-large"
            />
            <span class="btn-label">缩小</span>
          </div>
        </v-btn>

        <v-btn
          :title="'放大字体'"
          class="toolbar-btn"
          rounded="lg"
          variant="text"
          @click="$emit('zoom', 'up')"
        >
          <div class="toolbar-btn-inner">
            <v-icon
              :icon="ICON.FORMAT_FONT_SIZE_INCREASE"
              size="x-large"
            />
            <span class="btn-label">放大</span>
          </div>
        </v-btn>

        <v-divider
          vertical
          class="toolbar-divider"
        />

        <v-btn
          :loading="loading"
          :title="'刷新数据'"
          class="toolbar-btn"
          rounded="lg"
          variant="text"
          @click="$emit('refresh')"
        >
          <div class="toolbar-btn-inner">
            <v-icon
              :icon="ICON.REFRESH"
              size="x-large"
            />
            <span class="btn-label">刷新</span>
          </div>
        </v-btn>
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
    selectedDate: {
      type: [String, Date],
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
    };
  },
  methods: {
    onDateChange(newDate) {
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

  transition: all var(--duration-normal) var(--ease-apple);
  background: rgba(var(--v-theme-surface-container), 0.85) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-raised) !important;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  pointer-events: auto;
  will-change: transform;
  border-radius: var(--radius-xl) !important;

  display: flex;
  align-items: center;
  gap: 0;
  padding: 6px 8px;
  width: fit-content;
}

.toolbar-btn {
  min-width: auto !important;
  height: auto !important;
  padding: 6px 10px !important;
  transition: background-color var(--duration-fast) var(--ease-apple) !important;
}

.toolbar-btn:hover {
  background: rgba(var(--v-theme-primary), 0.10) !important;
}

.toolbar-btn:active {
  background: rgba(var(--v-theme-primary), 0.18) !important;
}

.toolbar-btn-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  line-height: 1;
}

.btn-label {
  font-size: 0.6875rem;
  line-height: 1;
  white-space: nowrap;
}

.toolbar-divider {
  height: 48px;
  align-self: center;
  opacity: 0.3;
  margin: 0 4px;
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
    padding: 4px 4px;
  }

  .toolbar-btn {
    padding: 4px 6px !important;
  }

  .toolbar-btn-inner {
    gap: 1px;
  }

  .btn-label {
    font-size: 0.625rem;
  }

  .toolbar-divider {
    height: 40px;
    margin: 0 2px;
  }

  .side-action-btn {
    bottom: 80px;
    right: 16px;
  }
}
</style>
