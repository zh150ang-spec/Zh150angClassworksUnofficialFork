<template>
  <settings-card :icon="ICON.CLOCK_OUTLINE" title="自动出勤规则">
    <template #append>
      <div class="d-flex gap-2">
        <v-btn color="success" :prepend-icon="ICON.PLUS" variant="elevated" @click="openAddDialog">
          添加规则
        </v-btn>
      </div>
    </template>

    <v-alert class="mb-4" color="info" :icon="ICON.INFO" variant="tonal">
      添加规则后，在指定时间段内，系统会自动将学生标记为对应状态
    </v-alert>

    <v-list v-if="rules.length > 0" class="rules-list">
      <v-list-item v-for="(rule, index) in rules" :key="index" class="mb-2 rule-item">
        <template #prepend>
          <v-avatar :color="getStatusColor(rule.status)" size="40">
            <v-icon>{{ getStatusIcon(rule.status) }}</v-icon>
          </v-avatar>
        </template>

        <v-list-item-title class="font-weight-bold">
          {{ rule.student }}
        </v-list-item-title>
        <v-list-item-subtitle>
          <v-chip :color="getStatusColor(rule.status)" size="x-small" class="mr-2">
            {{ getStatusLabel(rule.status) }}
          </v-chip>
          <span class="text-body-small">
            {{ formatTimeRange(rule) }}
          </span>
        </v-list-item-subtitle>

        <template #append>
          <v-btn :icon="ICON.EDIT" size="small" variant="text" @click="editRule(index)" />
          <v-btn
            color="error"
            :icon="ICON.DELETE"
            size="small"
            variant="text"
            @click="deleteRule(index)"
          />
        </template>
      </v-list-item>
    </v-list>

    <v-empty-state v-else :icon="ICON.CALENDAR_CLOCK" text="暂无自动出勤规则" title="暂无规则" />

    <template #actions>
      <v-btn
        color="warning"
        :prepend-icon="ICON.BROOM"
        variant="elevated"
        @click="cleanupInvalidRules"
      >
        清理无效规则
      </v-btn>
    </template>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>
          {{ editingIndex === -1 ? '添加规则' : '编辑规则' }}
        </v-card-title>
        <v-card-text>
          <v-autocomplete
            v-model="form.student"
            :items="studentOptions"
            :loading="loading"
            clearable
            label="学生姓名"
            :prepend-inner-icon="ICON.ACCOUNT"
            variant="outlined"
          />

          <v-select
            v-model="form.status"
            :items="statusOptions"
            label="出勤状态"
            :prepend-inner-icon="ICON.LIST_STATUS"
            variant="outlined"
          />

          <v-select
            v-model="form.type"
            :items="typeOptions"
            label="规则类型"
            :prepend-inner-icon="ICON.CALENDAR_RANGE"
            variant="outlined"
          />

          <template v-if="form.type === 'dateRange'">
            <v-menu v-model="startDateMenu" :close-on-content-click="false" location="bottom start">
              <template #activator="{ props }">
                <v-text-field
                  v-bind="props"
                  :model-value="formatDateDisplay(form.startDate)"
                  label="开始日期"
                  :prepend-inner-icon="ICON.CALENDAR"
                  readonly
                  variant="outlined"
                />
              </template>
              <v-date-picker
                :model-value="parseDate(form.startDate)"
                @update:model-value="onStartDateChange"
              />
            </v-menu>
            <v-menu v-model="endDateMenu" :close-on-content-click="false" location="bottom start">
              <template #activator="{ props }">
                <v-text-field
                  v-bind="props"
                  :model-value="formatDateDisplay(form.endDate)"
                  clearable
                  hint="留空表示永久有效"
                  label="结束日期"
                  :prepend-inner-icon="ICON.CALENDAR"
                  readonly
                  variant="outlined"
                  @click:clear="form.endDate = ''"
                />
              </template>
              <v-date-picker
                :model-value="parseDate(form.endDate)"
                @update:model-value="onEndDateChange"
              />
            </v-menu>
          </template>

          <template v-if="form.type === 'daily'">
            <v-menu v-model="startTimeMenu" :close-on-content-click="false" location="bottom start">
              <template #activator="{ props }">
                <v-text-field
                  v-bind="props"
                  :model-value="form.startTime"
                  label="开始时间"
                  :prepend-inner-icon="ICON.CLOCK_OUTLINE"
                  readonly
                  variant="outlined"
                />
              </template>
              <v-time-picker
                :model-value="form.startTime"
                format="24hr"
                @update:model-value="onStartTimeChange"
              />
            </v-menu>
            <v-menu v-model="endTimeMenu" :close-on-content-click="false" location="bottom start">
              <template #activator="{ props }">
                <v-text-field
                  v-bind="props"
                  :model-value="form.endTime"
                  label="结束时间"
                  :prepend-inner-icon="ICON.CLOCK_OUTLINE"
                  readonly
                  variant="outlined"
                />
              </template>
              <v-time-picker
                :model-value="form.endTime"
                format="24hr"
                @update:model-value="onEndTimeChange"
              />
            </v-menu>
          </template>

          <template v-if="form.type === 'weekly'">
            <v-select
              v-model="form.weekdays"
              :items="weekdayOptions"
              chips
              label="生效星期"
              multiple
              :prepend-inner-icon="ICON.CALENDAR_WEEK"
              variant="outlined"
            />
            <v-menu v-model="startTimeMenu" :close-on-content-click="false" location="bottom start">
              <template #activator="{ props }">
                <v-text-field
                  v-bind="props"
                  :model-value="form.startTime"
                  label="开始时间"
                  :prepend-inner-icon="ICON.CLOCK_OUTLINE"
                  readonly
                  variant="outlined"
                />
              </template>
              <v-time-picker
                :model-value="form.startTime"
                format="24hr"
                @update:model-value="onStartTimeChange"
              />
            </v-menu>
            <v-menu v-model="endTimeMenu" :close-on-content-click="false" location="bottom start">
              <template #activator="{ props }">
                <v-text-field
                  v-bind="props"
                  :model-value="form.endTime"
                  label="结束时间"
                  :prepend-inner-icon="ICON.CLOCK_OUTLINE"
                  readonly
                  variant="outlined"
                />
              </template>
              <v-time-picker
                :model-value="form.endTime"
                format="24hr"
                @update:model-value="onEndTimeChange"
              />
            </v-menu>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <div class="d-flex gap-2">
            <v-btn color="neutral-surface" variant="elevated" @click="dialog = false"> 取消 </v-btn>
            <v-btn color="success" variant="elevated" @click="saveRule"> 保存 </v-btn>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>确认删除</v-card-title>
        <v-card-text> 确定要删除这条自动出勤规则吗？ </v-card-text>
        <v-card-actions>
          <v-spacer />
          <div class="d-flex gap-2">
            <v-btn color="neutral-surface" variant="elevated" @click="deleteDialog = false">
              取消
            </v-btn>
            <v-btn color="error" variant="elevated" @click="confirmDelete"> 删除 </v-btn>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </settings-card>
</template>

<script>
import { ICON } from '@/utils/icons'
import { getSetting, setSetting } from '@/utils/settings'
import dataProvider from '@/utils/dataProvider'
import { formatDateISO } from '@/utils/dateUtils'
import SettingsCard from '@/components/settings/SettingsCard.vue'

export default {
  name: 'AutoAttendanceCard',
  components: { SettingsCard },
  data() {
    return {
      ICON,
      studentList: [],
      loading: false,
      rules: [],
      dialog: false,
      deleteDialog: false,
      editingIndex: -1,
      deletingIndex: -1,
      startDateMenu: false,
      endDateMenu: false,
      startTimeMenu: false,
      endTimeMenu: false,
      form: {
        student: '',
        status: 'absent',
        type: 'dateRange',
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        weekdays: [],
      },
      statusOptions: [
        { title: '请假', value: 'absent' },
        { title: '迟到', value: 'late' },
        { title: '不参与', value: 'exclude' },
      ],
      typeOptions: [
        { title: '日期范围', value: 'dateRange' },
        { title: '每日时段', value: 'daily' },
        { title: '每周固定', value: 'weekly' },
      ],
      weekdayOptions: [
        { title: '周一', value: 1 },
        { title: '周二', value: 2 },
        { title: '周三', value: 3 },
        { title: '周四', value: 4 },
        { title: '周五', value: 5 },
        { title: '周六', value: 6 },
        { title: '周日', value: 0 },
      ],
    }
  },
  computed: {
    studentOptions() {
      return this.studentList.map((s) => ({
        title: s.name,
        value: s.name,
      }))
    },
  },
  mounted() {
    this.loadStudentList()
    this.loadRules()
  },
  methods: {
    async loadStudentList() {
      this.loading = true
      try {
        const response = await dataProvider.loadData('classworks-list-main')
        if (response && Array.isArray(response)) {
          this.studentList = response.map((item, index) => {
            if (typeof item === 'string') {
              return { id: index + 1, name: item }
            }
            return {
              id: item.id || index + 1,
              name: item.name || item.toString(),
            }
          })
        }
      } catch (error) {
        console.error('加载学生列表失败:', error)
      } finally {
        this.loading = false
      }
    },
    loadRules() {
      const saved = getSetting('attendance.autoRules')
      if (Array.isArray(saved)) {
        this.rules = saved.filter((r) => r && r.student)
      } else {
        this.rules = []
      }
    },
    saveRules() {
      const validRules = this.rules.filter((r) => r && r.student)
      setSetting('attendance.autoRules', validRules)
      this.rules = validRules
    },
    openAddDialog() {
      this.editingIndex = -1
      this.form = {
        student: '',
        status: 'absent',
        type: 'dateRange',
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        weekdays: [],
      }
      this.dialog = true
    },
    editRule(index) {
      this.editingIndex = index
      this.form = { ...this.rules[index] }
      this.dialog = true
    },
    deleteRule(index) {
      this.deletingIndex = index
      this.deleteDialog = true
    },
    confirmDelete() {
      this.rules.splice(this.deletingIndex, 1)
      this.saveRules()
      this.deleteDialog = false
      this.deletingIndex = -1
    },
    cleanupInvalidRules() {
      const before = this.rules.length
      this.saveRules()
      const after = this.rules.length
      if (before !== after) {
        this.$message?.success(`已清理 ${before - after} 条无效规则`)
      } else {
        this.$message?.info('没有发现无效规则')
      }
    },
    saveRule() {
      if (!this.form.student) return

      if (this.editingIndex === -1) {
        this.rules.push({ ...this.form })
      } else {
        this.rules[this.editingIndex] = { ...this.form }
      }

      this.saveRules()
      this.dialog = false
    },
    parseDate(dateStr) {
      if (!dateStr) return null
      if (dateStr instanceof Date) return dateStr
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
      }
      return null
    },
    formatDateDisplay(date) {
      if (!date) return ''
      return formatDateISO(date)
    },
    onStartDateChange(date) {
      if (date instanceof Date) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        this.form.startDate = `${year}-${month}-${day}`
      } else if (date) {
        this.form.startDate = date
      }
      this.startDateMenu = false
    },
    onEndDateChange(date) {
      if (date instanceof Date) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        this.form.endDate = `${year}-${month}-${day}`
      } else if (date) {
        this.form.endDate = date
      } else {
        this.form.endDate = ''
      }
      this.endDateMenu = false
    },
    onStartTimeChange(time) {
      if (typeof time === 'string') {
        this.form.startTime = time
      }
      this.startTimeMenu = false
    },
    onEndTimeChange(time) {
      if (typeof time === 'string') {
        this.form.endTime = time
      }
      this.endTimeMenu = false
    },
    getStatusColor(status) {
      const colors = {
        absent: 'error',
        late: 'warning',
        exclude: 'grey',
      }
      return colors[status] || 'default'
    },
    getStatusIcon(status) {
      const icons = {
        absent: ICON.ACCOUNT_OFF,
        late: ICON.CLOCK_ALERT_OUTLINE,
        exclude: ICON.ACCOUNT_CANCEL,
      }
      return icons[status] || ICON.ACCOUNT
    },
    getStatusLabel(status) {
      const labels = {
        absent: '请假',
        late: '迟到',
        exclude: '不参与',
      }
      return labels[status] || status
    },
    formatTimeRange(rule) {
      if (rule.type === 'dateRange') {
        const start = rule.startDate || '?'
        const end = rule.endDate || '永久'
        return `${start} 至 ${end}`
      } else if (rule.type === 'daily') {
        return `每日 ${rule.startTime || '?'} - ${rule.endTime || '?'}`
      } else if (rule.type === 'weekly') {
        const days = (rule.weekdays || [])
          .map((d) => '周' + ['日', '一', '二', '三', '四', '五', '六'][d])
          .join('、')
        return `${days} ${rule.startTime || '?'} - ${rule.endTime || '?'}`
      }
      return ''
    },
  },
}
</script>

<style scoped>
.rules-list {
  border: 1px solid rgba(var(--v-border-color, var(--v-theme-on-surface)), 0.12);
  border-radius: var(--radius-sm);
}

.rule-item {
  border-bottom: 1px solid rgba(var(--v-border-color, var(--v-theme-on-surface)), 0.08);
}

.rule-item:last-child {
  border-bottom: none;
}
</style>
