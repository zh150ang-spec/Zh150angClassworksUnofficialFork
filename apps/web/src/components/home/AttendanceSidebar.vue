<template>
  <div
    v-if="studentList && studentList.length"
    v-ripple="
      !isEditingDisabled
        ? {
          class: `text-${
            ['primary', 'secondary', 'info', 'success', 'warning', 'error'][
              Math.floor(Math.random() * 6)
            ]
          }`,
        }
        : false
    "
    :class="{ 'cursor-not-allowed': isEditingDisabled, 'cursor-pointer': !isEditingDisabled }"
    class="attendance-sidebar no-select"
    @click="handleClick"
  >
    <div class="attendance-header">
      <v-icon
        :icon="ICON.ACCOUNT_GROUP"
        size="small"
        class="mr-2"
        color="primary"
      />
      <span class="text-body-large font-weight-bold">出勤</span>
    </div>

    <div class="attendance-number-block">
      <div class="attendance-label">
        应到
      </div>
      <div class="attendance-number">
        {{ studentList.length - attendance.exclude.length }}
      </div>
    </div>

    <div class="attendance-number-block">
      <div class="attendance-label">
        实到
      </div>
      <div class="attendance-number">
        {{
          studentList.length -
            attendance.absent.length -
            !getSetting('display.lateStudentsArePresent') * attendance.late.length -
            attendance.exclude.length
        }}
      </div>
    </div>

    <v-divider class="my-3" />

    <div class="attendance-status-list">
      <div class="attendance-status-item">
        <div class="attendance-label text-error">
          请假
        </div>
        <div class="attendance-count">
          {{ attendance.absent.length }}人
        </div>
      </div>
      <div
        v-for="(name, index) in attendance.absent"
        :key="'absent-' + index"
        class="attendance-name text-body-small"
      >
        <span v-if="display.lgAndUp.value">{{ `${index + 1}. ` }}</span>
        <span style="white-space: nowrap">{{ name }}</span>
      </div>

      <div class="attendance-status-item mt-2">
        <div class="attendance-label text-warning">
          迟到
        </div>
        <div class="attendance-count">
          {{ attendance.late.length }}人
        </div>
      </div>
      <div
        v-for="(name, index) in attendance.late"
        :key="'late-' + index"
        class="attendance-name text-body-small"
      >
        <span v-if="display.lgAndUp.value">{{ `${index + 1}. ` }}</span>
        <span style="white-space: nowrap">{{ name }}</span>
      </div>

      <div class="attendance-status-item mt-2">
        <div class="attendance-label text-medium-emphasis">
          不参与
        </div>
        <div class="attendance-count">
          {{ attendance.exclude.length }}人
        </div>
      </div>
      <div
        v-for="(name, index) in attendance.exclude"
        :key="'exclude-' + index"
        class="attendance-name text-body-small"
      >
        <span v-if="display.lgAndUp.value">{{ `${index + 1}. ` }}</span>
        <span style="white-space: nowrap">{{ name }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { useDisplay } from 'vuetify'
import { ICON } from '@/utils/icons.js'
import { getSetting } from '@/utils/settings.js'

export default {
  name: 'AttendanceSidebar',
  props: {
    studentList: {
      type: Array,
      required: true,
    },
    attendance: {
      type: Object,
      required: true,
    },
    isEditingDisabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click', 'disabled-click'],
  setup() {
    const display = useDisplay()
    return { display, ICON }
  },
  methods: {
    getSetting,
    handleClick() {
      if (this.isEditingDisabled) {
        this.$emit('disabled-click')
      } else {
        this.$emit('click')
      }
    },
  },
}
</script>

<style scoped>
.attendance-sidebar {
  width: 160px;
  min-width: 160px;
  padding: var(--space-4);
  border-left: 1px solid var(--color-border);
  background: rgba(var(--v-theme-surface-container-low), 0.5);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.attendance-header {
  display: flex;
  align-items: center;
  margin-bottom: var(--space-3);
}

.attendance-number-block {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.attendance-label {
  font-size: 0.85rem;
  opacity: 0.8;
}

.attendance-number {
  font-size: 1.5rem;
  font-weight: var(--font-weight-heading);
  line-height: 1;
}

.attendance-status-list {
  width: 100%;
}

.attendance-status-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.attendance-count {
  font-size: 0.9rem;
  font-weight: var(--font-weight-label);
  opacity: 0.9;
}

.attendance-name {
  color: rgba(var(--v-theme-on-surface), 0.7);
  padding-left: var(--space-2);
  margin-top: var(--space-compat-2px);
}

@media (max-width: 1199px) {
  .attendance-sidebar {
    width: 140px;
    min-width: 140px;
    padding: var(--space-3);
  }
}

@media (max-width: 960px) {
  .attendance-sidebar {
    display: none;
  }
}
</style>
