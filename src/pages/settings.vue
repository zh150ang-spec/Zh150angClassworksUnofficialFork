<template>
  <div class="settings-page">
    <v-app-bar
      elevation="1"
      class="no-select"
    >
      <template #prepend>
        <v-btn
          :icon="ICON.ARROW_LEFT"
          variant="text"
          @click="$router.push('/')"
        />
        <v-btn
          :icon="ICON.MENU"
          variant="text"
          @click="drawer = !drawer"
        />
      </template>
      <v-app-bar-title>
        设置
      </v-app-bar-title>
    </v-app-bar>

    <v-container fluid>
      <v-navigation-drawer
        v-model="drawer"
        :permanent="!isMobile"
        :temporary="isMobile"
      >
        <v-list>
          <v-list-item
            v-for="tab in settingsTabs"
            :key="tab.value"
            :active="settingsTab === tab.value"
            :color="settingsTab === tab.value ? 'primary' : 'default'"
            class="settings-nav-item"
            @click="settingsTab = tab.value"
          >
            <template #prepend>
              <v-icon
                :icon="tab.icon"
                :color="settingsTab === tab.value ? 'primary' : tab.color"
              />
            </template>
            <v-list-item-title>{{ tab.title }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>

      <v-tabs-window
        v-model="settingsTab"
        direction="vertical"
        style="width: 100%"
        eager
      >
        <v-tabs-window-item value="index">
          <v-card
            border
            class="service-card gradient-right clickable mb-4"
            color="primary"
            elevation="3"
            hover
            rounded="xl"
            variant="tonal"
            @click="openClassworksKV"
          >
            <v-card-item>
              <div class="card-title">
                <div>
                  <div class="text-headline-small">
                    在寻找 Classworks KV ？
                  </div>
                  <div class="text-body-small text-medium-emphasis">
                    文档形键值数据库
                  </div>
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
          <v-card
            border
            class="rounded-xl mb-4"
            subtitle="设置"
            title="Classworks"
          >
            <v-card-text>
              <v-alert
                class="rounded-xl"
                color="error"
                :icon="ICON.ERROR"
                variant="tonal"
              >
                Classworks
                是开源免费的软件，官方没有提供任何形式的付费支持服务，源代码仓库地址在
                <a
                  href="https://github.com/ZeroCatDev/Classworks"
                  target="_blank"
                >https://github.com/ZeroCatDev/Classworks</a>。如果您通过有偿协助等付费方式取得本应用，在遇到问题时请在与卖家约定的服务框架下，优先向卖家求助。如果卖家没有提供您预期的服务，请退款或通过其它形式积极维护您的合法权益。
              </v-alert>
              <v-alert
                class="mt-4 rounded-xl"
                color="info"
                :icon="ICON.INFO"
                variant="tonal"
              >
                请不要使用浏览器清除缓存功能，否则会导致配置丢失。
              </v-alert>
              <v-alert
                class="mt-4 rounded-xl"
                color="warning"
                :icon="ICON.WARNING"
                variant="tonal"
              >
                <p>
                  部分浏览器（如360浏览器、夸克浏览器、QQ浏览器等）可能存在兼容性问题。建议使用 Chrome 或 Edge 等现代浏览器以获得最佳体验。
                </p>
              </v-alert>
            </v-card-text>
          </v-card>
          <about-card />
          <echo-chamber-card
            border
            class="mt-4"
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="data">
          <server-settings-card
            :loading="loading.server"
            border
            @saved="onSettingsSaved"
          />
          <data-provider-settings-card
            border
            class="mt-4"
          />
          <kv-database-card
            border
            class="mt-4"
          />
          <settings-link-generator
            border
            class="mt-4"
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="subject">
          <subject-management-card border />
          <homework-template-card
            border
            class="mt-4"
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="people">
          <student-list-card
            :is-mobile="isMobile"
            border
          />
          <teacher-list-card
            :is-mobile="isMobile"
            border
            class="mt-4"
          />
          <auto-attendance-card
            border
            class="mt-4"
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="display">
          <display-settings-card
            :loading="loading.display"
            border
            @saved="onSettingsSaved"
          />
          <refresh-settings-card
            :loading="loading.refresh"
            border
            class="mt-4"
            @saved="onSettingsSaved"
          />
          <edit-settings-card
            :loading="loading.edit"
            border
            class="mt-4"
            @saved="onSettingsSaved"
          />
          <notification-sound-settings
            border
            class="mt-4"
          />
          <hitokoto-settings
            border
            class="mt-4"
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="randomPicker">
          <random-picker-card
            :is-mobile="isMobile"
            border
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="background">
          <background-settings-card border />
        </v-tabs-window-item>

        <v-tabs-window-item value="developer">
          <settings-card
            border
            :icon="ICON.DEVELOPER_MODE"
            title="开发者选项"
          >
            <v-alert
              class="mb-4 rounded-xl"
              color="info"
              :icon="ICON.INFO"
              variant="tonal"
            >
              <p class="mb-2">
                开发者选项用于高级调试，普通用户无需开启。
              </p>
              <p>
                开启后可查看设置的技术键名、复制设置值、访问完整设置列表。
              </p>
            </v-alert>
            <v-list>
              <v-list-item>
                <template #prepend>
                  <v-icon
                    class="mr-3"
                    :icon="ICON.CODE_TAGS"
                  />
                </template>
                <v-list-item-title>开发者选项</v-list-item-title>
                <v-list-item-subtitle>
                  显示设置的技术键名、复制设置值、访问完整设置列表
                </v-list-item-subtitle>
                <template #append>
                  <v-switch
                    v-model="settings.developer.enabled"
                    density="comfortable"
                    hide-details
                    @update:model-value="handleDeveloperChange"
                  />
                </template>
              </v-list-item>
            </v-list>
          </settings-card>
          <developer-settings-card
            :loading="loading.developer"
            border
            @saved="onSettingsSaved"
            @show-settings-explorer="scrollToSettingsExplorer"
          />
          <v-card
            v-if="settings.developer.enabled"
            ref="settingsExplorerCard"
            border
            class="mt-4 rounded-lg"
          >
            <v-card-title class="d-flex align-center">
              <v-icon
                class="mr-2"
                :icon="ICON.COG_OUTLINE"
              />
              所有设置
            </v-card-title>
            <v-card-subtitle> 浏览和修改所有可用设置</v-card-subtitle>
            <v-card-text>
              <settings-explorer @update="onSettingUpdate" />
            </v-card-text>
          </v-card>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-container>

    <!-- 消息记录组件 -->
    <message-log ref="messageLog" />
  </div>
</template>

<script>
import { useDisplay } from "vuetify";
import { ICON } from "@/utils/icons";
import ServerSettingsCard from "@/components/settings/cards/ServerSettingsCard.vue";
import EditSettingsCard from "@/components/settings/cards/EditSettingsCard.vue";
import RefreshSettingsCard from "@/components/settings/cards/RefreshSettingsCard.vue";
import DisplaySettingsCard from "@/components/settings/cards/DisplaySettingsCard.vue";
import DataProviderSettingsCard from "@/components/settings/cards/DataProviderSettingsCard.vue";
import EchoChamberCard from "@/components/settings/cards/EchoChamberCard.vue";
import {
  getSetting,
  setSetting,
  resetSetting,
  watchSettings,
} from "@/utils/settings";
import MessageLog from "@/components/MessageLog.vue";
import SettingsCard from "@/components/SettingsCard.vue";
import StudentListCard from "@/components/settings/StudentListCard.vue";
import TeacherListCard from "@/components/settings/TeacherListCard.vue";
import AboutCard from "@/components/settings/AboutCard.vue";
import "../styles/settings.scss";
import SettingsExplorer from "@/components/settings/SettingsExplorer.vue";
import SettingsLinkGenerator from "@/components/SettingsLinkGenerator.vue";
import RandomPickerCard from "@/components/settings/cards/RandomPickerCard.vue";
import HomeworkTemplateCard from "@/components/settings/cards/HomeworkTemplateCard.vue";
import SubjectManagementCard from "@/components/settings/cards/SubjectManagementCard.vue";
import KvDatabaseCard from "@/components/settings/cards/KvDatabaseCard.vue";
import HitokotoSettings from "@/components/HitokotoSettings.vue";
import NotificationSoundSettings from "@/components/settings/NotificationSoundSettings.vue";
import AutoAttendanceCard from "@/components/settings/cards/AutoAttendanceCard.vue";
import BackgroundSettingsCard from "@/components/settings/cards/BackgroundSettingsCard.vue";
import DeveloperSettingsCard from "@/components/settings/cards/DeveloperSettingsCard.vue";

export default {
  name: "Settings",
  components: {
    ServerSettingsCard,
    EditSettingsCard,
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
    DeveloperSettingsCard,
  },
  setup() {
    const {mobile} = useDisplay();
    return {isMobile: mobile, ICON};
  },
  data() {
    const provider = getSetting("server.provider");

    const settings = {
      server: {
        domain: getSetting("server.domain"),
        classNumber: getSetting("server.classNumber"),
        provider: getSetting("server.provider"),
      },
      refresh: {
        auto: getSetting("refresh.auto"),
        interval: getSetting("refresh.interval"),
      },
      sync: {
        enabled: getSetting("sync.enabled"),
        minInterval: getSetting("sync.minInterval"),
        maxInterval: getSetting("sync.maxInterval"),
      },
      font: {
        size: getSetting("font.size"),
      },
      edit: {
        autoSave: getSetting("edit.autoSave"),
        blockNonTodayAutoSave: getSetting("edit.blockNonTodayAutoSave"),
        confirmNonTodaySave: getSetting("edit.confirmNonTodaySave"),
        refreshBeforeEdit: getSetting("edit.refreshBeforeEdit"),
      },
      display: {
        emptySubjectDisplay: getSetting("display.emptySubjectDisplay"),
        dynamicSort: getSetting("display.dynamicSort"),
        showRandomButton: getSetting("display.showRandomButton"),
        showFullscreenButton: getSetting("display.showFullscreenButton"),
      },
      developer: {
        enabled: getSetting("developer.enabled"),
        showDebugConfig: getSetting("developer.showDebugConfig"),
      },
      message: {
        showSidebar: getSetting("message.showSidebar"),
        maxActiveMessages: getSetting("message.maxActiveMessages"),
        timeout: getSetting("message.timeout"),
        saveHistory: getSetting("message.saveHistory"),
      },
    };
    return {
      settings,
      dataProviders: [
        {title: "服务器", value: "server"},
        {title: "本地数据库", value: "indexedDB"},
      ],
      studentData: {
        list: [],
        text: "",
        advanced: false,
      },
      newStudent: "",
      editingIndex: -1,
      editingName: "",
      deleteDialog: false,
      studentToDelete: null,
      numberDialog: false,
      newPosition: "",
      studentToMove: null,
      touchStartTime: 0,
      touchTimeout: null,
      studentsLoading: false,
      studentsError: null,
      debugConfig: "",
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
      settingsTab: "index",
      settingsTabs: [
        {
          title: "首页",
          icon: ICON.HOME,
          color: "primary",
          value: "index",
        },
        {
          title: "数据与同步",
          icon: ICON.CLOUD_SYNC,
          color: "info",
          value: "data",
        },
        {
          title: "科目与作业",
          icon: ICON.BOOK_EDIT,
          color: "success",
          value: "subject",
        },
        {
          title: "人员管理",
          icon: ICON.ACCOUNT_GROUP,
          color: "primary",
          value: "people",
        },
        {
          title: "显示与编辑",
          icon: ICON.EYE,
          color: "warning",
          value: "display",
        },
        {
          title: "随机点名",
          icon: ICON.DICE_MULTIPLE,
          color: "info",
          value: "randomPicker",
        },

        {
          title: "背景",
          icon: ICON.IMAGE,
          color: "primary",
          value: "background",
        },

        {
          title: "开发者",
          icon: ICON.DEVELOPER_BOARD,
          color: "warning",
          value: "developer",
        },
      ],
      settingsChangeTimeout: null,
      isHandlingSettingsChange: false,
      drawer: false,
    };
  },

  watch: {
    settings: {
      handler(newSettings) {
        this.handleSettingsChange(newSettings);
      },
      deep: true,
    },
    isMobile: {
      handler(newValue) {
        this.drawer = !newValue;
      },
      immediate: true,
    },
    studentData: {
      handler(newData) {
        // 只检查是否有未保存的更改
        if (this.lastSavedData) {
          this.hasUnsavedChanges =
            JSON.stringify(newData.list) !== JSON.stringify(this.lastSavedData);
        }
        // 更新文本显示
        this.studentData.text = newData.list.join("\n");
      },
      deep: true,
    },
  },

  mounted() {
    this.loadAllSettings();
    this.unwatchSettings = watchSettings(() => {
      if (!this.isHandlingSettingsChange) {
        this.loadAllSettings();
      }
    });
    // 初始化抽屉状态，在非移动设备上默认打开
    this.drawer = !this.isMobile;
  },

  beforeUnmount() {
    if (this.unwatchSettings) {
      this.unwatchSettings();
    }
  },

  methods: {
    openClassworksKV() {
      window.open(getSetting("server.authDomain"), "_blank");
    },
    loadAllSettings() {
      Object.keys(this.settings).forEach((section) => {
        Object.keys(this.settings[section]).forEach((key) => {
          this.settings[section][key] = getSetting(`${section}.${key}`);
        });
      });
    },

    handleSettingsChange(newSettings) {
      if (this.isHandlingSettingsChange) return;
      if (this.settingsChangeTimeout) {
        clearTimeout(this.settingsChangeTimeout);
      }

      this.settingsChangeTimeout = setTimeout(() => {
        this.isHandlingSettingsChange = true;
        try {
          Object.entries(newSettings).forEach(([section, values]) => {
            Object.entries(values).forEach(([key, value]) => {
              const settingKey = `${section}.${key}`;
              const currentValue = getSetting(settingKey);
              if (value !== currentValue) {
                const success = setSetting(settingKey, value);
                if (success) {
                  this.showMessage("设置已更新", `${settingKey} 已保存`);
                } else {
                  this.showError("保存失败", `${settingKey} 设置失败`);
                  this.settings[section][key] = currentValue;
                }
              }
            });
          });
        } finally {
          this.isHandlingSettingsChange = false;
        }
      }, 100);
    },

    showMessage(title, content = "", type = "success") {
      this.$message[type](title, content);
    },

    showError(title, content = "") {
      this.$message.error(title, content);
    },

    saveEdit() {
      if (this.editingIndex !== -1) {
        const newName = this.editingName.trim();
        if (newName && newName !== this.studentData.list[this.editingIndex]) {
          this.studentData.list[this.editingIndex] = newName;
        }
        this.editingIndex = -1;
        this.editingName = "";
      }
    },

    startEdit(index, name) {
      this.editingIndex = index;
      this.editingName = name;
    },

    confirmDelete(index) {
      this.studentToDelete = {
        index,
        name: this.studentData.list[index],
      };
      this.deleteDialog = true;
    },

    moveStudent(index, direction) {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex >= 0 && newIndex < this.studentData.list.length) {
        [this.studentData.list[index], this.studentData.list[newIndex]] = [
          this.studentData.list[newIndex],
          this.studentData.list[index],
        ];
      }
    },

    applyNewPosition() {
      const newPos = parseInt(this.newPosition) - 1;
      if (
        this.studentToMove !== null &&
        newPos >= 0 &&
        newPos < this.studentData.list.length &&
        newPos !== this.studentToMove
      ) {
        const student = this.studentData.list[this.studentToMove];
        this.studentData.list.splice(this.studentToMove, 1);
        this.studentData.list.splice(newPos, 0, student);
      }
      this.numberDialog = false;
      this.studentToMove = null;
      this.newPosition = "";
    },

    moveToTop(index) {
      if (index > 0) {
        const student = this.studentData.list[index];
        this.studentData.list.splice(index, 1);
        this.studentData.list.unshift(student);
      }
    },

    addStudent() {
      const student = this.newStudent.trim();
      if (student && !this.studentData.list.includes(student)) {
        this.studentData.list.push(student);
        this.newStudent = "";
      }
    },

    removeStudent(index) {
      if (index !== undefined) {
        this.studentData.list.splice(index, 1);
        this.deleteDialog = false;
        this.studentToDelete = null;
      }
    },

    resetFontSize() {
      resetSetting("font.size");
      this.settings.font.size = getSetting("font.size");
      this.showMessage("字体已重置", "字体大小已恢复默认值");
    },

    handleDeveloperChange() {
      // message 等带有 requireDeveloper: true 的设置，
      // 在 getSetting 层面已自动返回默认值，无需手动重置
    },

    resetDeveloperSettings() {
      this.settings.developer = {
        enabled: false,
        showDebugConfig: false,
      };
      this.handleSettingsChange(this.settings);
      this.showMessage("已重置", "开发者设置已重置为默认值", "warning");
    },

    adjustFontSize(direction) {
      const step = 2;
      const size = this.settings.font.size;
      if (direction === "up" && size < 100) {
        this.settings.font.size = size + step;
      } else if (direction === "down" && size > 16) {
        this.settings.font.size = size - step;
      }
      this.handleSettingsChange(this.settings);
    },

    onSettingsSaved() {
      this.showMessage("设置已更新", "您的设置已成功保存");
    },

    onSettingUpdate(key, value) {
      this.showMessage("设置已更新", `${key} 已保存为 ${value}`);
    },

    scrollToSettingsExplorer() {
      if (!this.settings.developer.enabled) {
        this.settings.developer.enabled = true;
      }
      this.$nextTick(() => {
        const card = this.$refs.settingsExplorerCard;
        if (card?.$el) {
          card.$el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    },
  },
};
</script>

<style lang="scss">
.settings-page {
  .v-card {
    transition: transform 0.2s, box-shadow 0.2s;

    &:hover {
      box-shadow: var(--shadow-hover) !important;
    }
  }

  .settings-nav-item {
    border-radius: var(--radius-xs) !important;
    margin: 2px 4px;
    transition: all 0.2s ease;

    &.v-list-item--active {
      background: rgba(var(--v-theme-primary), 0.1);
    }
  }
}
</style>
