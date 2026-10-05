<template>
  <div class="settings-page">
    <v-app-bar elevation="1" class="no-select">
      <template #prepend>
        <v-btn :icon="ICON.ARROW_LEFT" variant="text" @click="$router.push('/')" />
        <v-btn :icon="ICON.MENU" variant="text" @click="drawer = !drawer" />
      </template>
      <v-app-bar-title> 设置 </v-app-bar-title>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      :permanent="!isMobile"
      :temporary="isMobile"
      class="settings-drawer"
    >
      <v-list>
        <v-list-item
          v-for="tab in settingsTabs"
          :key="tab.value"
          :active="settingsTab === tab.value"
          active-color="default"
          base-color="default"
          color="default"
          class="settings-nav-item"
          @click="selectTab(tab.value)"
        >
          <template #prepend>
            <v-icon :icon="tab.icon" :color="tab.color" />
          </template>
          <v-list-item-title>{{ tab.title }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-container fluid>
      <v-tabs-window v-model="settingsTab" direction="vertical" style="width: 100%" eager>
        <v-tabs-window-item value="index">
          <v-card
            border
            flat
            class="service-card gradient-right clickable mb-4"
            color="primary"
            rounded="xl"
            variant="tonal"
            @click="openClassworksKV"
          >
            <v-card-item>
              <div class="card-title">
                <div>
                  <div class="text-headline-small">在寻找 Classworks KV ？</div>
                  <div class="text-body-small text-medium-emphasis">文档形键值数据库</div>
                </div>
              </div>
            </v-card-item>
            <v-card-text>
              <div class="mt-4">
                <v-btn
                  :append-icon="ICON.ARROW_RIGHT"
                  class="text-none"
                  rounded="xl"
                  variant="text"
                  @click="openClassworksKV"
                >
                  打开 Classworks KV
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
          <v-card border class="rounded-xl mb-4" subtitle="设置" title="Classworks">
            <v-card-text>
              <v-alert class="rounded-xl" color="error" :icon="ICON.ERROR" variant="tonal">
                <span
                  >Classworks 是开源免费的软件，官方没有提供任何形式的付费支持服务，源代码仓库地址在
                  <a href="https://github.com/Moonrend/Classworks" target="_blank"
                    >https://github.com/Moonrend/Classworks</a
                  >。如果您通过有偿协助等付费方式取得本应用，在遇到问题时请在与卖家约定的服务框架下，优先向卖家求助。如果卖家没有提供您预期的服务，请退款或通过其它形式积极维护您的合法权益。</span
                >
              </v-alert>
              <v-alert class="mt-4 rounded-xl" color="info" :icon="ICON.INFO" variant="tonal">
                <span>请不要使用浏览器清除缓存功能，否则会导致配置丢失。</span>
              </v-alert>
              <v-alert class="mt-4 rounded-xl" color="warning" :icon="ICON.WARNING" variant="tonal">
                <p>
                  部分浏览器（如360浏览器、夸克浏览器、QQ浏览器等）可能存在兼容性问题。建议使用
                  Chrome 或 Edge 等现代浏览器以获得最佳体验。
                </p>
              </v-alert>
            </v-card-text>
          </v-card>
          <about-card />
          <echo-chamber-card border class="mt-4" />
        </v-tabs-window-item>

        <v-tabs-window-item value="data">
          <server-settings-card :loading="loading.server" border @saved="onSettingsSaved" />
          <data-provider-settings-card border class="mt-4" />
          <kv-database-card border class="mt-4" />
          <sync-settings-card border class="mt-4" />
          <settings-link-generator border class="mt-4" />
        </v-tabs-window-item>

        <v-tabs-window-item value="subject">
          <subject-management-card border />
          <homework-template-card border class="mt-4" />
        </v-tabs-window-item>

        <v-tabs-window-item value="people">
          <student-list-card :is-mobile="isMobile" border />
          <teacher-list-card :is-mobile="isMobile" border class="mt-4" />
          <auto-attendance-card border class="mt-4" />
        </v-tabs-window-item>

        <v-tabs-window-item value="display">
          <theme-settings-card border />
          <display-settings-card
            :loading="loading.display"
            border
            class="mt-4"
            @saved="onSettingsSaved"
          />
          <background-settings-card border class="mt-4" />
          <notification-sound-settings border class="mt-4" />
          <hitokoto-settings border class="mt-4" />
        </v-tabs-window-item>

        <v-tabs-window-item value="edit">
          <homework-edit-settings-card :loading="loading.edit" border @saved="onSettingsSaved" />
          <refresh-settings-card class="mt-4" />
          <random-picker-card :is-mobile="isMobile" border class="mt-4" />
        </v-tabs-window-item>

        <v-tabs-window-item value="developer">
          <settings-card border :icon="ICON.DEVELOPER_MODE" title="开发者选项">
            <v-alert class="mb-4 rounded-xl" color="info" :icon="ICON.INFO" variant="tonal">
              <p class="mb-2">开发者选项用于高级调试，普通用户无需开启。</p>
              <p>开启后可查看设置的技术键名、复制设置值、访问完整设置列表。</p>
            </v-alert>
            <v-list>
              <v-list-item>
                <template #prepend>
                  <v-icon class="mr-3" :icon="ICON.CODE_TAGS" />
                </template>
                <v-list-item-title>开发者选项</v-list-item-title>
                <v-list-item-subtitle>
                  显示设置的技术键名、复制设置值、访问完整设置列表
                </v-list-item-subtitle>
                <template #append>
                  <v-switch
                    v-model="settings.developer.enabled"
                    color="primary"
                    density="comfortable"
                    hide-details
                    @update:model-value="handleDeveloperChange"
                  />
                </template>
              </v-list-item>
            </v-list>
          </settings-card>
          <v-card
            v-if="settings.developer.enabled"
            ref="settingsExplorerCard"
            border
            flat
            class="mt-4 rounded-xl"
          >
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" :icon="ICON.COG_OUTLINE" />
              所有设置
            </v-card-title>
            <v-card-subtitle> 浏览和修改所有可用设置</v-card-subtitle>
            <v-card-text>
              <settings-explorer />
            </v-card-text>
          </v-card>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-container>

    <!-- 消息记录组件 -->
    <message-log ref="messageLog" />

    <v-dialog v-model="confirmDialog.show" max-width="420">
      <v-card>
        <v-card-title class="text-headline-small">
          {{ confirmDialog.title }}
        </v-card-title>
        <v-card-text>{{ confirmDialog.text }}</v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <div class="d-flex gap-2">
            <v-btn color="neutral-surface" variant="elevated" @click="cancelSave()"> 取消 </v-btn>
            <v-btn
              :color="confirmDialog.color || 'warning'"
              variant="elevated"
              @click="confirmSave()"
            >
              {{ confirmDialog.confirmText || '确认' }}
            </v-btn>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { useDisplay } from 'vuetify'
import { ICON } from '@/utils/icons'
import ServerSettingsCard from '@/components/settings/cards/ServerSettingsCard.vue'
import HomeworkEditSettingsCard from '@/components/settings/cards/HomeworkEditSettingsCard.vue'
import RefreshSettingsCard from '@/components/settings/cards/RefreshSettingsCard.vue'
import DisplaySettingsCard from '@/components/settings/cards/DisplaySettingsCard.vue'
import DataProviderSettingsCard from '@/components/settings/cards/DataProviderSettingsCard.vue'
import EchoChamberCard from '@/components/settings/cards/EchoChamberCard.vue'
import { getSetting, setSetting, resetSetting, watchSettings } from '@/utils/settings'
import MessageLog from '@/components/common/MessageLog.vue'
import SettingsCard from '@/components/settings/SettingsCard.vue'
import StudentListCard from '@/components/settings/cards/StudentListCard.vue'
import TeacherListCard from '@/components/settings/cards/TeacherListCard.vue'
import AboutCard from '@/components/settings/cards/AboutCard.vue'
import '../styles/settings.scss'
import SettingsExplorer from '@/components/settings/SettingsExplorer.vue'
import SettingsLinkGenerator from '@/components/settings/SettingsLinkGenerator.vue'
import RandomPickerCard from '@/components/settings/cards/RandomPickerCard.vue'
import HomeworkTemplateCard from '@/components/settings/cards/HomeworkTemplateCard.vue'
import SubjectManagementCard from '@/components/settings/cards/SubjectManagementCard.vue'
import KvDatabaseCard from '@/components/settings/cards/KvDatabaseCard.vue'
import HitokotoSettings from '@/components/settings/cards/HitokotoSettings.vue'
import NotificationSoundSettings from '@/components/settings/cards/NotificationSoundSettings.vue'
import AutoAttendanceCard from '@/components/settings/cards/AutoAttendanceCard.vue'
import BackgroundSettingsCard from '@/components/settings/cards/BackgroundSettingsCard.vue'
import ThemeSettingsCard from '@/components/settings/cards/ThemeSettingsCard.vue'
import SyncSettingsCard from '@/components/settings/cards/SyncSettingsCard.vue'

export default {
  name: 'Settings',
  components: {
    ServerSettingsCard,
    HomeworkEditSettingsCard,
    RefreshSettingsCard,
    DisplaySettingsCard,
    MessageLog,
    SettingsCard,
    StudentListCard,
    TeacherListCard,
    AboutCard,
    DataProviderSettingsCard,
    EchoChamberCard,
    SettingsExplorer,
    SettingsLinkGenerator,
    RandomPickerCard,
    HomeworkTemplateCard,
    SubjectManagementCard,
    KvDatabaseCard,
    HitokotoSettings,
    NotificationSoundSettings,
    AutoAttendanceCard,
    BackgroundSettingsCard,
    ThemeSettingsCard,
    SyncSettingsCard,
  },
  setup() {
    const { mobile } = useDisplay()
    return { isMobile: mobile, ICON }
  },
  data() {
    const settings = {
      server: {
        domain: getSetting('server.domain'),
        classNumber: getSetting('server.classNumber'),
        provider: getSetting('server.provider'),
      },
      refresh: {
        auto: getSetting('refresh.auto'),
        interval: getSetting('refresh.interval'),
      },
      sync: {
        enabled: getSetting('sync.enabled'),
        minInterval: getSetting('sync.minInterval'),
        maxInterval: getSetting('sync.maxInterval'),
      },
      font: {
        size: getSetting('font.size'),
      },
      edit: {
        autoSave: getSetting('edit.autoSave'),
        blockNonTodayAutoSave: getSetting('edit.blockNonTodayAutoSave'),
        confirmNonTodaySave: getSetting('edit.confirmNonTodaySave'),
        refreshBeforeEdit: getSetting('edit.refreshBeforeEdit'),
      },
      display: {
        emptySubjectDisplay: getSetting('display.emptySubjectDisplay'),
        dynamicSort: getSetting('display.dynamicSort'),
        showRandomButton: getSetting('display.showRandomButton'),
        showFullscreenButton: getSetting('display.showFullscreenButton'),
      },
      developer: {
        enabled: getSetting('developer.enabled'),
        showDebugConfig: getSetting('developer.showDebugConfig'),
      },
      message: {
        showSidebar: getSetting('message.showSidebar'),
        maxActiveMessages: getSetting('message.maxActiveMessages'),
        timeout: getSetting('message.timeout'),
        saveHistory: getSetting('message.saveHistory'),
      },
    }
    return {
      settings,
      dataProviders: [
        { title: '服务器', value: 'server' },
        { title: '本地数据库', value: 'indexedDB' },
      ],
      studentData: {
        list: [],
        text: '',
        advanced: false,
      },
      newStudent: '',
      editingIndex: -1,
      editingName: '',
      deleteDialog: false,
      studentToDelete: null,
      numberDialog: false,
      newPosition: '',
      studentToMove: null,
      touchStartTime: 0,
      touchTimeout: null,
      studentsLoading: false,
      studentsError: null,
      debugConfig: '',
      loading: {
        server: false,
        students: false,
        developer: false,
        display: false,
        refresh: false,
        edit: false,
      },
      hasUnsavedChanges: false,
      lastSavedData: null,
      confirmDialog: {
        show: false,
        title: '确认操作',
        text: '确定要执行此操作吗？',
        color: 'warning',
        confirmText: '确认',
        resolve: null,
        reject: null,
      },
      settingsTab: 'index',
      settingsTabs: [
        {
          title: '首页',
          icon: ICON.HOME,
          color: 'primary',
          value: 'index',
        },
        {
          title: '数据与同步',
          icon: ICON.CLOUD_SYNC,
          color: 'info',
          value: 'data',
        },
        {
          title: '科目与作业',
          icon: ICON.BOOK_EDIT,
          color: 'success',
          value: 'subject',
        },
        {
          title: '人员与考勤',
          icon: ICON.ACCOUNT_GROUP,
          color: 'primary',
          value: 'people',
        },
        {
          title: '显示与外观',
          icon: ICON.EYE,
          color: 'warning',
          value: 'display',
        },
        {
          title: '编辑与行为',
          icon: ICON.COG_OUTLINE,
          color: 'info',
          value: 'edit',
        },
        {
          title: '开发者',
          icon: ICON.DEVELOPER_BOARD,
          color: 'warning',
          value: 'developer',
        },
      ],
      settingsChangeTimeout: null,
      isHandlingSettingsChange: false,
      drawer: false,
    }
  },

  watch: {
    settings: {
      handler(newSettings) {
        this.handleSettingsChange(newSettings)
      },
      deep: true,
    },
    isMobile: {
      handler(newValue) {
        this.drawer = !newValue
      },
      immediate: true,
    },
    studentData: {
      handler(newData) {
        // 只检查是否有未保存的更改
        if (this.lastSavedData) {
          this.hasUnsavedChanges =
            JSON.stringify(newData.list) !== JSON.stringify(this.lastSavedData)
        }
        // 更新文本显示
        this.studentData.text = newData.list.join('\n')
      },
      deep: true,
    },
  },

  mounted() {
    this.loadAllSettings()
    this.unwatchSettings = watchSettings(() => {
      if (!this.isHandlingSettingsChange) {
        this.loadAllSettings()
      }
    })
    // 初始化抽屉状态，在非移动设备上默认打开
    this.drawer = !this.isMobile
  },

  beforeUnmount() {
    if (this.unwatchSettings) {
      this.unwatchSettings()
    }
  },

  methods: {
    selectTab(value) {
      this.settingsTab = value
      // 移动端选择区块后自动收起抽屉，减少操作步骤
      if (this.isMobile) {
        this.drawer = false
      }
    },
    openClassworksKV() {
      window.open(getSetting('server.authDomain'), '_blank')
    },
    loadAllSettings() {
      Object.keys(this.settings).forEach((section) => {
        Object.keys(this.settings[section]).forEach((key) => {
          this.settings[section][key] = getSetting(`${section}.${key}`)
        })
      })
    },

    handleSettingsChange(newSettings) {
      if (this.isHandlingSettingsChange) return
      if (this.settingsChangeTimeout) {
        clearTimeout(this.settingsChangeTimeout)
      }

      this.settingsChangeTimeout = setTimeout(() => {
        this.isHandlingSettingsChange = true
        try {
          Object.entries(newSettings).forEach(([section, values]) => {
            Object.entries(values).forEach(([key, value]) => {
              const settingKey = `${section}.${key}`
              const currentValue = getSetting(settingKey)
              if (value !== currentValue) {
                const success = setSetting(settingKey, value)
                if (!success) {
                  this.showError('保存失败', `${settingKey} 设置失败`)
                  this.settings[section][key] = currentValue
                }
              }
            })
          })
        } finally {
          this.isHandlingSettingsChange = false
        }
      }, 100)
    },

    showMessage(title, content = '', type = 'success') {
      this.$message[type](title, content)
    },

    showError(title, content = '') {
      this.$message.error(title, content)
    },

    saveEdit() {
      if (this.editingIndex !== -1) {
        const newName = this.editingName.trim()
        if (newName && newName !== this.studentData.list[this.editingIndex]) {
          this.studentData.list[this.editingIndex] = newName
        }
        this.editingIndex = -1
        this.editingName = ''
      }
    },

    startEdit(index, name) {
      this.editingIndex = index
      this.editingName = name
    },

    confirmDelete(index) {
      this.studentToDelete = {
        index,
        name: this.studentData.list[index],
      }
      this.deleteDialog = true
    },

    moveStudent(index, direction) {
      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex >= 0 && newIndex < this.studentData.list.length) {
        ;[this.studentData.list[index], this.studentData.list[newIndex]] = [
          this.studentData.list[newIndex],
          this.studentData.list[index],
        ]
      }
    },

    applyNewPosition() {
      const newPos = parseInt(this.newPosition) - 1
      if (
        this.studentToMove !== null &&
        newPos >= 0 &&
        newPos < this.studentData.list.length &&
        newPos !== this.studentToMove
      ) {
        const student = this.studentData.list[this.studentToMove]
        this.studentData.list.splice(this.studentToMove, 1)
        this.studentData.list.splice(newPos, 0, student)
      }
      this.numberDialog = false
      this.studentToMove = null
      this.newPosition = ''
    },

    moveToTop(index) {
      if (index > 0) {
        const student = this.studentData.list[index]
        this.studentData.list.splice(index, 1)
        this.studentData.list.unshift(student)
      }
    },

    addStudent() {
      const student = this.newStudent.trim()
      if (student && !this.studentData.list.includes(student)) {
        this.studentData.list.push(student)
        this.newStudent = ''
      }
    },

    removeStudent(index) {
      if (index !== undefined) {
        this.studentData.list.splice(index, 1)
        this.deleteDialog = false
        this.studentToDelete = null
      }
    },

    resetFontSize() {
      resetSetting('font.size')
      this.settings.font.size = getSetting('font.size')
      this.showMessage('字体已重置', '字体大小已恢复默认值')
    },

    handleDeveloperChange() {
      // message 等带有 requireDeveloper: true 的设置，
      // 在 getSetting 层面已自动返回默认值，无需手动重置
    },

    async resetDeveloperSettings() {
      try {
        await this.showConfirmDialog({
          title: '确认重置开发者设置',
          text: '确定要将所有开发者设置恢复为默认值吗？',
          color: 'warning',
        })
      } catch {
        return
      }
      this.settings.developer = {
        enabled: false,
        showDebugConfig: false,
      }
      this.handleSettingsChange(this.settings)
      this.showMessage('已重置', '开发者设置已重置为默认值', 'warning')
    },

    adjustFontSize(direction) {
      const step = 2
      const size = this.settings.font.size
      if (direction === 'up' && size < 100) {
        this.settings.font.size = size + step
      } else if (direction === 'down' && size > 16) {
        this.settings.font.size = size - step
      }
      this.handleSettingsChange(this.settings)
    },

    onSettingsSaved() {
      this.showMessage('设置已更新', '您的设置已成功保存')
    },

    onSettingUpdate(key, value) {
      this.showMessage('设置已更新', `${key} 已保存为 ${value}`)
    },

    scrollToSettingsExplorer() {
      if (!this.settings.developer.enabled) {
        this.settings.developer.enabled = true
      }
      this.$nextTick(() => {
        const card = this.$refs.settingsExplorerCard
        if (card?.$el) {
          card.$el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    },
    showConfirmDialog(options = {}) {
      return new Promise((resolve, reject) => {
        this.confirmDialog.title = options.title || '确认操作'
        this.confirmDialog.text = options.text || '确定要执行此操作吗？'
        this.confirmDialog.color = options.color || 'warning'
        this.confirmDialog.confirmText = options.confirmText || '确认'
        this.confirmDialog.resolve = () => {
          this.confirmDialog.show = false
          resolve()
        }
        this.confirmDialog.reject = () => {
          this.confirmDialog.show = false
          reject(new Error('用户取消'))
        }
        this.confirmDialog.show = true
      })
    },
    confirmSave() {
      this.confirmDialog.show = false
      if (this.confirmDialog.resolve) {
        this.confirmDialog.resolve(true)
      }
    },
    cancelSave() {
      this.confirmDialog.show = false
      if (this.confirmDialog.reject) {
        this.confirmDialog.reject(new Error('用户取消'))
      }
    },
  },
}
</script>

<style lang="scss">
.settings-page {
  display: flex;
  flex: 1;
  min-height: calc(100vh - 48px);

  /* 抽屉和内容左右并排，抽屉为大王 */
  .settings-drawer {
    flex-shrink: 0;
  }

  > .v-container {
    flex: 1;
    min-width: 0;
  }

  .settings-nav-item {
    border-radius: var(--radius-xs) !important;
    margin: var(--space-compat-2px) var(--space-1);
    transition: all var(--duration-fast) var(--ease-apple);

    &.v-list-item--active {
      background: rgba(var(--v-theme-primary), 0.1);
    }
  }

  /* expansion panel 覆盖层圆角，与卡片风格统一 */
  .v-expansion-panel-title__overlay {
    border-radius: inherit;
  }
}
</style>
