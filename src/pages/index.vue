<template>
  <HomeAppBar
    :title="titleText"
    :token-display-info="tokenDisplayInfo"
    :should-show-urgent-test-button="shouldShowUrgentTestButton"
    :unread-count="unreadCount"
    @token-chip-click="handleTokenChipClick"
    @open-urgent-test="urgentTestDialog = true"
    @open-chat="isChatOpen = true"
    @open-messages="$refs.messageLog.drawer = true"
    @open-settings="$router.push('/settings')"
  />
  <!-- 初始化选择卡片，仅在首页且需要授权时显示；不影响顶栏 -->
  <init-service-chooser
    v-if="shouldShowInit"
    :preconfig="preconfigData"
    @done="settingsTick++"
  />

  <!-- 学生姓名管理组件 -->
  <StudentNameManager
    v-if="!shouldShowInit"
    ref="studentNameManager"
    @token-info-updated="updateTokenDisplayInfo"
  />

  <!-- 首屏骨架屏（数据加载中显示） -->
  <HomeSkeleton v-if="!shouldShowInit && !dataReady" />

  <div
    v-if="!shouldShowInit && dataReady"
    class="d-flex"
  >
    <!-- 主要内容区域 -->
    <v-container
      class="main-window flex-grow-1 no-select"
      fluid
    >
      <!-- 常驻通知区域 -->
      <NotificationArea
        v-model="notificationDetailDialog"
        :notifications="persistentNotifications"
        :current-notification="currentNotification"
        :formatted-time="currentNotificationFormattedTime"
        @show-detail="showNotificationDetail"
        @remove="removePersistentNotification"
      />

      <homework-grid
        :sorted-items="optimizedItems"
        :unused-subjects="unusedSubjects"
        :empty-subject-display="emptySubjectDisplay"
        :is-mobile="isMobile"
        :is-editing-disabled="isEditingDisabled"
        :content-style="state.contentStyle"
        :highlighted-cards="highlightedCards"
        class="mb-4"
        @open-dialog="openDialog"
        @open-attendance="setAttendanceArea"
        @disabled-click="handleDisabledClick"
        @open-exam-detail="openExamDetail"
      />

      <home-actions
        :synced="state.synced"
        :loading-upload="loading.upload"
        :show-random-picker-button="showRandomPickerButton"
        :show-exam-schedule-button="showExamScheduleButton"
        :show-list-card-button="showListCardButton"
        :show-fullscreen-button="showFullscreenButton"
        :is-fullscreen="isFullscreen"
        :show-anti-screen-burn-card="showAntiScreenBurnCard"
        :show-test-card-button="showTestCardButton"
        :show-uaf-transfer-button="showUafTransferButton"
        :uaf-transfer-loading="loading.exportUaf"
        @upload="manualUpload"
        @show-sync-message="showSyncMessage"
        @open-random-picker="openRandomPicker"
        @toggle-fullscreen="toggleFullscreen"
        @add-test-card="addTestCard"
        @add-exam-card="showAddExamDialog = true"
        @open-uaf-export="openUafTransfer('export')"
        @open-uaf-import="openUafTransfer('import')"
      />

      <uaf-transfer-dialog
        v-model="uafTransfer.show"
        :mode="uafTransfer.mode"
        :current-date="state.dateString"
        :current-items="sortedItems"
        :current-board-data="state.boardData"
        :subjects="state.availableSubjects"
        @success="handleUafSuccess"
        @error="handleUafError"
        @imported="handleUafImported"
      />

      <pwa-install-card />

      <!-- 推荐添加考试提示 -->
      <v-alert
        v-if="upcomingExams.length > 0 && !hasExamCard"
        class="mt-4"
        color="info"
        variant="tonal"
        closable
        :icon="ICON.CALENDAR_CLOCK"
        title="近期有考试安排"
      >
        <div class="d-flex align-center flex-wrap">
          <span class="mr-2">检测到未来两天内有以下考试：</span>
          <v-chip
            v-for="exam in upcomingExams"
            :key="exam.id"
            size="small"
            class="mr-1 mb-1"
            color="primary"
          >
            {{ exam.examName }}
          </v-chip>
        </div>
        <template #append>
          <v-btn
            color="primary"
            variant="text"
            @click="addAllUpcomingExams"
          >
            一键添加
          </v-btn>
        </template>
      </v-alert>
    </v-container>

    <!-- 出勤统计区域 -->
    <attendance-sidebar
      v-if="!isMobile"
      :student-list="state.studentList"
      :attendance="state.boardData.attendance"
      :is-editing-disabled="isEditingDisabled"
      @click="setAttendanceArea"
      @disabled-click="handleDisabledClick"
    />
  </div>

  <homework-edit-dialog
    v-model="state.dialogVisible"
    :auto-save="autoSave"
    :initial-content="state.textarea"
    :title="state.dialogTitle"
    :is-editing-past-data="isEditingPastData"
    :current-date-string="state.dateString"
    @save="handleHomeworkSave"
  />

  <attendance-management-dialog
    v-model="state.attendanceDialog"
    :student-list="state.studentList"
    :attendance="state.boardData.attendance"
    :date-string="state.dateString"
    @update:attendance="state.boardData.attendance = $event"
    @save="saveAttendance"
    @change="handleAttendanceChange"
  />

  <message-log ref="messageLog" />

  <!-- 添加悬浮工具栏 -->
  <floating-toolbar
    :is-today="isToday"
    :is-past-date="isPastDate"
    :loading="loading.download"
    :copy-to-today-loading="loading.copyToToday"
    :selected-date="state.selectedDateObj"
    :unread-count="unreadCount"
    :has-homework="hasHomeworkContent"
    @refresh="downloadData"
    @zoom="zoom"
    @open-messages="$refs.messageLog.drawer = true"
    @open-settings="$router.push('/settings')"
    @date-select="handleDateSelect"
    @prev-day="navigateDay(-1)"
    @next-day="navigateDay(1)"
    @copy-to-today="copyHomeworkToToday"
  />

  <!-- 添加ICP备案悬浮组件 -->
  <FloatingICP />

  <!-- 设备聊天室（右下角浮窗） -->
  <ChatWidget
    v-model="isChatOpen"
    :show-button="false"
  />

  <!-- 紧急通知测试对话框 -->
  <UrgentTestDialog v-model="urgentTestDialog" />

  <!-- 添加确认对话框 -->
  <ConfirmDialog
    v-model="confirmDialog.show"
    :date-text="formattedCurrentDate"
    @resolve="confirmDialog.resolve"
    @reject="confirmDialog.reject"
  />

  <!-- 添加随机点名组件 -->
  <random-picker
    ref="randomPicker"
    :attendance="state.boardData.attendance"
    :student-list="state.studentList"
  />

  <!-- 添加URL配置确认对话框 -->
  <UrlConfigDialog
    v-model="urlConfigDialog.show"
    :changes="urlConfigDialog.changes"
    @confirm="urlConfigDialog.confirmHandler"
    @cancel="urlConfigDialog.cancelHandler"
  />

  <!-- 考试详情/编辑对话框 -->
  <ExamDetailDialog
    v-model="showExamDetailDialog"
    :selected-exam-id="selectedExamId"
    @saved="onExamConfigSaved"
    @deleted="onExamConfigDeleted"
    @remove-card="removeCurrentExamCard"
  />

  <!-- 添加考试卡片对话框 -->
  <AddExamDialog
    v-model="showAddExamDialog"
    :exam-list="examStore.examList"
    :exams="examStore.exams"
    :added-exam-ids="addedExamIds"
    @add-exam="addExamCard"
  />

  <!-- 命名空间切换检测对话框 -->
  <v-dialog
    v-model="namespaceSwitchDialog.show"
    max-width="640"
    persistent
  >
    <v-card>
      <v-card-title class="text-headline-small d-flex align-center">
        <v-icon
          color="warning"
          class="mr-2"
        >
          mdi-alert
        </v-icon>
        检测到命名空间变更
      </v-card-title>
      <v-card-text>
        <p class="mb-2">
          当前设备命名空间已从
          <code>{{ namespaceSwitchDialog.previous }}</code>
          切换为
          <code>{{ namespaceSwitchDialog.current }}</code>。
        </p>
        <p class="mb-2">
          本地存储中有 <strong>{{ namespaceSwitchDialog.localKeyCount }}</strong> 条数据属于原命名空间。
        </p>
        <p class="text-warning mb-0">
          直接使用新命名空间可能导致数据混淆，请选择处理方式：
        </p>
      </v-card-text>
      <v-card-actions class="flex-wrap ga-2">
        <v-btn
          color="error"
          variant="tonal"
          :loading="namespaceSwitchDialog.exporting"
          @click="handleNamespaceClearAndSwitch"
        >
          <v-icon class="mr-1">
            mdi-download
          </v-icon>
          导出备份并清空
        </v-btn>
        <v-btn
          color="warning"
          variant="tonal"
          @click="handleNamespaceKeepAndSwitch"
        >
          保留数据并切换
        </v-btn>
        <v-spacer />
        <v-btn
          color="default"
          variant="text"
          @click="handleNamespaceCancelSwitch"
        >
          暂不处理
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { ICON } from '@/utils/icons'
import { defineAsyncComponent } from "vue";
import AsyncLoadingPlaceholder from "@/components/common/AsyncLoadingPlaceholder.vue";

// ===== 首屏核心组件（同步加载）=====
import HomeworkGrid from "@/components/home/HomeworkGrid.vue";
import HomeActions from "@/components/home/HomeActions.vue";
import FloatingICP from "@/components/FloatingICP.vue";
import HomeSkeleton from "@/components/common/HomeSkeleton.vue";

// ===== 非首屏 / 条件渲染组件（异步懒加载）=====
const MessageLog = defineAsyncComponent({
  loader: () => import("@/components/MessageLog.vue"),
  loadingComponent: AsyncLoadingPlaceholder,
  delay: 200,
});
const RandomPicker = defineAsyncComponent({
  loader: () => import("@/components/RandomPicker.vue"),
  delay: 0,
});
const FloatingToolbar = defineAsyncComponent({
  loader: () => import("@/components/FloatingToolbar.vue"),
  delay: 200,
});
const ChatWidget = defineAsyncComponent({
  loader: () => import("@/components/ChatWidget.vue"),
  delay: 0,
});
const HomeworkEditDialog = defineAsyncComponent({
  loader: () => import("@/components/HomeworkEditDialog.vue"),
  delay: 0,
});
const UafTransferDialog = defineAsyncComponent({
  loader: () => import("@/components/home/UafTransferDialog.vue"),
  delay: 0,
});
const InitServiceChooser = defineAsyncComponent({
  loader: () => import("@/components/InitServiceChooser.vue"),
  loadingComponent: AsyncLoadingPlaceholder,
  delay: 200,
});
const StudentNameManager = defineAsyncComponent({
  loader: () => import("@/components/StudentNameManager.vue"),
  delay: 200,
});
const UrgentTestDialog = defineAsyncComponent({
  loader: () => import("@/components/UrgentTestDialog.vue"),
  delay: 0,
});
const AttendanceSidebar = defineAsyncComponent({
  loader: () => import("@/components/attendance/AttendanceSidebar.vue"),
  loadingComponent: AsyncLoadingPlaceholder,
  delay: 200,
});
const AttendanceManagementDialog = defineAsyncComponent({
  loader: () => import("@/components/attendance/AttendanceManagementDialog.vue"),
  delay: 0,
});
const PwaInstallCard = defineAsyncComponent({
  loader: () => import("@/components/PwaInstallCard.vue"),
  delay: 200,
});
import dataProvider from "@/utils/dataProvider";
import { optimizeGridLayout } from "@/utils/gridLayout";
import { kvLocalProvider } from "@/utils/providers/kvLocalProvider";
import { useExamStore } from "@/stores/examStore";
import {
  getSetting,
  watchSettings,
  setSetting,
  settingsDefinitions,
  coerceValueToType,
} from "@/utils/settings";
import {
  getSettingDisplayName,
  formatSettingValue,
} from "@/utils/settingsDisplay";
import {
  formatDateYYYYMMDD,
  formatDateDisplay8Char,
  ensureDate,
} from "@/utils/dateUtils";
import {
  getUrlParam,
} from "@/utils/urlParams";
import {
  decodeConfigFromBase64Url,
} from "@/utils/urlConfigCodec";
import { kvServerProvider } from "@/utils/providers/kvServerProvider";
import { useDisplay } from "vuetify";
import { debounce } from "@/utils/debounce";
import { leaveAll } from "@/utils/socketClient";
import { useFullscreen } from "@/composables/useFullscreen";
import { usePreconfig } from "@/composables/usePreconfig";
import { useAutoAttendance } from "@/composables/useAutoAttendance";
import { usePersistentNotifications } from "@/composables/usePersistentNotifications";
import { useExamCards } from "@/composables/useExamCards";
import { useTokenDisplay } from "@/composables/useTokenDisplay";
import { useRealtimeChannel } from "@/composables/useRealtimeChannel";
import { useAutoRefresh } from "@/composables/useAutoRefresh";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import HomeAppBar from "@/components/home/HomeAppBar.vue";
import NotificationArea from "@/components/home/NotificationArea.vue";
import ConfirmDialog from "@/components/home/ConfirmDialog.vue";
import UrlConfigDialog from "@/components/home/UrlConfigDialog.vue";
import ExamDetailDialog from "@/components/home/ExamDetailDialog.vue";
import AddExamDialog from "@/components/home/AddExamDialog.vue";
export default {
  name: "ClassworksBoard",
  components: {
    MessageLog,
    RandomPicker,
    FloatingToolbar,
    FloatingICP,
    HomeworkEditDialog,
    InitServiceChooser,
    ChatWidget,
    StudentNameManager,
    UrgentTestDialog,
    AttendanceSidebar,
    AttendanceManagementDialog,
    HomeworkGrid,
    HomeActions,
    PwaInstallCard,
    HomeSkeleton,
    HomeAppBar,
    NotificationArea,
    ConfirmDialog,
    UrlConfigDialog,
    ExamDetailDialog,
    AddExamDialog,
    UafTransferDialog,
  },
  setup() {
    const { mobile, width } = useDisplay();
    const examStore = useExamStore();
    const fullscreen = useFullscreen();
    const preconfig = usePreconfig();
    const autoAttendance = useAutoAttendance();
    const notifications = usePersistentNotifications();
    const examCards = useExamCards();
    const tokenDisplay = useTokenDisplay();
    const realtimeChannel = useRealtimeChannel();
    const autoRefresh = useAutoRefresh();
    const confirmDialog = useConfirmDialog();
    return {
      mobile,
      width,
      examStore,
      ICON,
      ...fullscreen,
      ...preconfig,
      ...autoAttendance,
      ...notifications,
      ...examCards,
      ...tokenDisplay,
      ...realtimeChannel,
      ...autoRefresh,
      ...confirmDialog,
    };
  },
  data() {
    const defaultSubjects = [
      { name: "语文", order: 0 },
      { name: "数学", order: 1 },
      { name: "英语", order: 2 },
      { name: "物理", order: 3 },
      { name: "化学", order: 4 },
      { name: "生物", order: 5 },
      { name: "政治", order: 6 },
      { name: "历史", order: 7 },
      { name: "地理", order: 8 },
      { name: "其他", order: 9 },
    ];

    return {
      // examCards: [], // Removed
      showAddExamDialog: false,
      showExamDetailDialog: false,
      selectedExamId: null,
      upcomingExams: [],
      dataKey: "",
      provider: "",
      state: {
        classNumber: "",
        // 当前命名空间/设备信息（从云端加载）
        namespaceInfo: null,
        deviceName: "",
        studentList: [],
        boardData: {
          homework: {},
          attendance: {
            absent: [],
            late: [],
            exclude: [],
          },
        },
        dialogVisible: false,
        dialogTitle: "",
        textarea: "",
        dateString: "",
        synced: false,
        attendDialogVisible: false,
        contentStyle: { "font-size": `${getSetting("font.size")}px` },
        uploadLoading: false,
        downloadLoading: false,
        fontSize: getSetting("font.size"),
        datePickerDialog: false,
        selectedDate: new Date().toISOString().split("T")[0].replace(/-/g, ""),
        selectedDateObj: new Date(),
        showNoDataMessage: false,
        noDataMessage: "",
        isToday: false,
        attendanceDialog: false,
        availableSubjects: defaultSubjects,
      },
      loading: {
        download: false,
        upload: false,
        students: false,
        copyToToday: false,
        exportUaf: false,
      },
      uafTransfer: {
        show: false,
        mode: "export",
      },
      dataReady: false,
      debouncedUpload: null,
      debouncedAttendanceSave: null,
      urlConfigDialog: {
        show: false,
        config: null,
        changes: [],
        validSettings: {},
        confirmHandler: null,
        cancelHandler: null,
        icons: {},
      },
      settingsTick: 0,
      isChatOpen: false,
      // 紧急通知测试对话框
      urgentTestDialog: false,

      // 命名空间切换检测对话框
      namespaceSwitchDialog: {
        show: false,
        previous: "",
        current: "",
        localKeyCount: 0,
        exporting: false,
      },

      // 当前正在编辑的科目（custom- 前缀表示自定义卡片）
      currentEditSubject: null,
    };
  },

  computed: {
    isMobile() {
      // 如果启用了强制一体机UI模式，返回false（使用桌面UI）
      const forceDesktopMode = getSetting('display.forceDesktopMode');
      if (forceDesktopMode) {
        return false;
      }
      return this.mobile;
    },
    titleText() {
      const provider = getSetting("server.provider");
      const useServer = provider === "kv-server" || provider === "classworkscloud" || provider === "dual-cloud" || provider === "dual-server";
      const classNumberSource = getSetting("server.classNumberSource") || "local";

      let displayName;
      if (useServer && classNumberSource === "cloud" && this.state.namespaceInfo) {
        displayName =
          this.state.namespaceInfo?.name ||
          this.state.namespaceInfo?.device?.name ||
          this.state.classNumber ||
          "高三八班";
      } else {
        displayName = this.state.classNumber || "高三八班";
      }

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const currentDateStr = this.state.dateString;
      const todayStr = formatDateYYYYMMDD(today);
      const yesterdayStr = formatDateYYYYMMDD(yesterday);

      if (currentDateStr === todayStr) {
        return displayName + " - 今天的作业";
      } else if (currentDateStr === yesterdayStr) {
        return displayName + " - 昨天的作业";
      } else {
        return `${displayName} - ${formatDateDisplay8Char(currentDateStr)}的作业`;
      }
    },
    sortedItems() {
      const items = [];

      // 如果是移动端，添加出勤卡片
      if (this.isMobile) {
        items.push({
          key: 'attendance-card',
          name: '出勤统计',
          type: 'attendance',
          data: {
            total: this.state.studentList.length,
            absent: this.state.boardData.attendance.absent,
            late: this.state.boardData.attendance.late,
            exclude: this.state.boardData.attendance.exclude
          },
          rowSpan: 250, // 出勤卡片高度估计值，用于布局均衡
        });
      }

      // 添加考试卡片
      for (const key in this.state.boardData.homework) {
        if (key.startsWith('exam-')) {
          const card = this.state.boardData.homework[key];
          items.push({
            key: key,
            name: '考试安排',
            type: 'exam',
            data: {
              examId: card.examId,
            },
            order: -100, // Ensure they appear at the top
            rowSpan: 200 // Estimated height
          });
        }
      }

      // 添加作业卡片
      for (const subject of this.state.availableSubjects) {
        const subjectKey = subject.name;
        const subjectData = this.state.boardData.homework[subjectKey];

        if (subjectData && subjectData.content) {
          const lineCount = subjectData.content.split("\n").filter((line) => line.trim()).length;
          // Estimate height in pixels: title(64) + padding(32) + lines * line-height(24) + extra
          const estimatedHeight = 100 + lineCount * 24;

          items.push({
            key: subjectKey,
            name: subjectKey,
            type: 'homework',
            content: subjectData.content,
            tags: Array.isArray(subjectData.tags) ? subjectData.tags : [],
            order: subject.order,
            rowSpan: estimatedHeight, // Used for sorting only
          });
        }
      }

      // 添加时间卡片
      if (this.timeCardEnabled) {
        items.push({
          key: "time-card",
          name: "时间",
          type: "time",
          order: 9997,
          rowSpan: 150,
        });
      }

      // 添加一言卡片
      if (this.hitokotoEnabled) {
        items.push({
          key: "hitokoto-card",
          name: "一言",
          type: "hitokoto",
          order: 9998,
          rowSpan: 150, // Default estimated height
        });
      }

      // 添加自定义卡片
      for (const key in this.state.boardData.homework) {
        if (key.startsWith('custom-')) {
          const card = this.state.boardData.homework[key];
          const lineCount = card.content.split("\n").filter((line) => line.trim()).length;
          const estimatedHeight = 100 + lineCount * 24;

          items.push({
            key: key,
            name: card.name,
            type: 'custom',
            content: card.content,
            tags: Array.isArray(card.tags) ? card.tags : [],
            order: 9999, // Put at the end
            rowSpan: estimatedHeight, // Used for sorting only
          });
        }
      }

      // 按照顺序排序
      items.sort((a, b) => a.order - b.order);

      return items;
    },
    // 经 optimizeGridLayout 均衡各列高度后的排序结果，传递给 homework-grid 渲染
    optimizedItems() {
      const items = this.sortedItems;
      if (!items || items.length === 0) return [];
      const maxColumns = this.width > 1199 ? 3 : this.width > 799 ? 2 : 1;
      return optimizeGridLayout(items, maxColumns);
    },
    unusedSubjects() {
      const usedKeys = Object.keys(this.state.boardData.homework).filter(
        (key) => this.state.boardData.homework[key].content?.trim()
      );
      return this.state.availableSubjects
        .filter((subject) => !usedKeys.includes(subject.name))
        .sort((a, b) => a.order - b.order);
    },
    autoSave() {
      return getSetting("edit.autoSave");
    },
    blockNonTodayAutoSave() {
      return getSetting("edit.blockNonTodayAutoSave");
    },
    todayDateString() {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      return `${yyyy}${mm}${dd}`;
    },
    isToday() {
      return this.state.dateString === this.todayDateString;
    },
    hasHomeworkContent() {
      const homework = this.state.boardData?.homework;
      if (!homework || typeof homework !== 'object') return false;
      return Object.keys(homework).length > 0;
    },
    isPastDate() {
      return this.state.dateString < this.todayDateString;
    },
    formattedCurrentDate() {
      return formatDateDisplay8Char(this.state.dateString);
    },
    timeCardEnabled() {
      return getSetting("timeCard.enabled");
    },
    hitokotoEnabled() {
      return getSetting("hitokoto.enabled");
    },
    canAutoSave() {
      return this.autoSave && (!this.blockNonTodayAutoSave || this.isToday);
    },
    needConfirmSave() {
      return !this.isToday && this.confirmNonTodaySave;
    },
    shouldShowBlockedMessage() {
      return !this.isToday && this.autoSave && this.blockNonTodayAutoSave;
    },
    refreshBeforeEdit() {
      return getSetting("edit.refreshBeforeEdit");
    },
    emptySubjectDisplay() {
      return getSetting("display.emptySubjectDisplay");
    },
    dynamicSort() {
      return getSetting("display.dynamicSort");
    },
    isEditingDisabled() {
      // 检查是否禁用编辑：加载中、没有编辑权限、或被配置禁止编辑过往数据
      if (this.state.uploadLoading || this.state.downloadLoading) return true;

      // 检查是否是只读 token
      const manager = this.$refs.studentNameManager;
      if (manager?.isReadOnly) return true;

      // 检查是否禁止编辑过往数据
      if (!this.canEditCurrentDate) return true;

      return false;
    },
    unreadCount() {
      return this.$refs.messageLog?.unreadCount || 0;
    },
    showRandomPickerButton() {
      return getSetting("randomPicker.enabled");
    },
    showListCardButton() {
      return getSetting("display.showListCard");
    },
    confirmNonTodaySave() {
      return getSetting("edit.confirmNonTodaySave");
    },
    blockPastDataEdit() {
      return getSetting("edit.blockPastDataEdit");
    },
    canEditCurrentDate() {
      // 检查是否可以编辑当前日期的数据
      if (this.isToday) return true;
      if (this.blockPastDataEdit) return false;
      return true;
    },
    isEditingPastData() {
      // 是否正在编辑过往数据（非今日数据）
      return !this.isToday;
    },
    showFullscreenButton() {
      return getSetting("display.showFullscreenButton");
    },
    showExamScheduleButton() {
      return getSetting("display.showExamScheduleButton");
    },
    showAntiScreenBurnCard() {
      return getSetting("display.showAntiScreenBurnCard");
    },
    showTestCardButton() {
      return getSetting("developer.enabled");
    },
    showUafTransferButton() {
      return getSetting("display.showUafTransfer");
    },
    shouldShowInit() {
      const provider = getSetting("server.provider");
      const isKv = provider === "kv-server" || provider === "classworkscloud" || provider === "dual-cloud" || provider === "dual-server";
      const token = getSetting("server.kvToken");
      const onHome = this.$route?.path === "/";
      void this.settingsTick;
      return onHome && isKv && (!token || token === "");
    },


    subjectOrder() {
      return [...this.state.availableSubjects]
        .sort((a, b) => a.order - b.order)
        .map((subject) => subject.name);
    },
  },

  watch: {
    "state.attendanceDialog": {
      handler(newValue) {
        this.handleAttendanceDialogClose(newValue);
      },
    },
  },

  created() {
    this.debouncedUpload = debounce(this.uploadData, 2000);
    this.debouncedAttendanceSave = debounce(async () => {
      if (this.autoSave) {
        await this.trySave(true);
      }
    }, 2000);
  },

  async mounted() {
    try {
      // 注入 examCards composable 的外部依赖（延迟绑定）
      this.setContext({
        examStore: this.examStore,
        getBoardData: () => this.state.boardData,
        setSynced: (v) => { this.state.synced = v; },
        trySave: (f) => this.trySave(f),
        showMessage: (type, title, content) => this.$message[type](title, content),
      });

      // 注入 realtimeChannel composable 的外部依赖（延迟绑定）
      this.setRealtimeContext({
        getDateString: () => this.state.dateString,
        getBoardData: () => this.state.boardData,
        downloadData: () => this.downloadData(),
        shouldSkipRefresh: () => this.shouldSkipRefresh(),
        loadPersistentNotifications: () => this.loadPersistentNotifications(),
        showMessage: (type, title, content) => this.$message[type](title, content),
      });

      // 注入 autoRefresh composable 的外部依赖（延迟绑定）
      this.setAutoRefreshContext({
        shouldSkipRefresh: () => this.shouldSkipRefresh(),
        downloadData: () => this.downloadData(),
        loadPersistentNotifications: () => this.loadPersistentNotifications(),
      });

      this.updateBackendUrl();
      await this.initializeData();
      this.dataReady = true;
      this.setupAutoRefresh();
      this.unwatchSettings = watchSettings(() => {
        this.updateSettings();
      });

      // 连接学生姓名管理组件（支持学生和教师）
      // 通过 composable 的 bindStudentNameManager 注入 manager ref 并注册 watch
      this.$nextTick(() => {
        this.bindStudentNameManager(this.$refs.studentNameManager);
      });

      this.checkHashForRandomPicker();

      window.addEventListener("hashchange", this.checkHashForRandomPicker);

      // 并行执行彼此独立的初始化请求，减少页面加载总时间
      await Promise.all([
        this.loadDeviceInfo(),
        this.loadTokenInfo(),
        this.setupRealtimeChannel(),
        this.checkNamespaceSwitch(),
        this.loadPersistentNotifications(),
      ]);

      // 初始化 Token 显示信息
      this.$nextTick(() => {
        this.updateTokenDisplayInfo();
      });
    } catch (err) {
      console.error("初始化失败:", err);
      this.$message.error("初始化失败", "请刷新页面重试");
    }
  },

  beforeUnmount() {
    if (this.unwatchSettings) {
      this.unwatchSettings();
    }

    // 清理 debounce/throttle 定时器，避免组件卸载后回调仍访问已销毁实例
    if (this.debouncedUpload) {
      this.debouncedUpload.cancel();
    }
    if (this.debouncedAttendanceSave) {
      this.debouncedAttendanceSave.cancel();
    }

    window.removeEventListener("hashchange", this.checkHashForRandomPicker);

    // 退出设备房间
    try {
      leaveAll();
    } catch (e) {
      console.warn("主页面事件清理失败:", e);
    }
  },

  methods: {
    // 检测命名空间（device.uuid）是否发生变化，若变化则弹框让用户选择处理方式
    async checkNamespaceSwitch() {
      try {
        const result = dataProvider.checkNamespaceChange();
        if (!result.changed) return;

        const keyCount = await kvLocalProvider.countKeys();
        this.namespaceSwitchDialog.show = true;
        this.namespaceSwitchDialog.previous = result.previous || "";
        this.namespaceSwitchDialog.current = result.current || "";
        this.namespaceSwitchDialog.localKeyCount = keyCount || 0;
        this.namespaceSwitchDialog.exporting = false;
      } catch (e) {
        console.warn("命名空间切换检测失败:", e);
      }
    },

    // 选项1：导出备份后清空本地数据，再确认切换
    async handleNamespaceClearAndSwitch() {
      try {
        this.namespaceSwitchDialog.exporting = true;
        // 先导出本地数据作为备份
        const backup = await dataProvider.exportLocalData();
        if (backup) {
          const blob = new Blob([JSON.stringify(backup, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `classworks-backup-${Date.now()}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        // 清空本地数据（kv + offline-queue）
        await kvLocalProvider.clearAll();
        // 确认命名空间切换（更新 lastKnownNamespace）
        dataProvider.confirmNamespaceChange();
        this.namespaceSwitchDialog.show = false;
        this.$message.success(
          "已切换命名空间",
          "本地数据已备份并清空，将重新加载云端数据"
        );
        // 重新加载当前数据
        await this.downloadData();
      } catch (e) {
        console.error("清空并切换命名空间失败:", e);
        this.$message.error(
          "操作失败",
          e.message || "请手动处理本地数据后刷新页面"
        );
      } finally {
        this.namespaceSwitchDialog.exporting = false;
      }
    },

    // 选项2：保留本地数据并确认切换（云端与本地将按合并策略共存）
    handleNamespaceKeepAndSwitch() {
      dataProvider.confirmNamespaceChange();
      this.namespaceSwitchDialog.show = false;
      this.$message.warning(
        "已保留本地数据",
        "新命名空间下将合并使用本地与云端数据，如发现数据混淆请及时处理"
      );
    },

    // 选项3：暂不处理（不更新 lastKnownNamespace，下次启动会再次提示）
    handleNamespaceCancelSwitch() {
      this.namespaceSwitchDialog.show = false;
      this.$message.info(
        "已暂不处理",
        "下次启动会再次提示，建议尽快处理以避免数据混淆"
      );
    },

    // 加载设备/命名空间信息（仅云端模式）
    async loadDeviceInfo() {
      try {
        const provider = getSetting("server.provider");
        const useServer =
          provider === "kv-server" || provider === "classworkscloud" || provider === "dual-cloud" || provider === "dual-server";
        if (!useServer) return;

        const res = await kvServerProvider.loadNamespaceInfo();
        if (res && res.success === false) return; // 忽略错误

        this.state.namespaceInfo = res || null;
        // 兜底填充设备名，避免重复解析
        this.state.deviceName = res?.account?.deviceName || "";
      } catch (e) {
        console.warn("加载设备信息失败:", e);
      }
    },

    async initializeData() {
      // 解析预配数据
      this.parsePreconfigData();

      const configApplied = await this.parseUrlConfig();

      const dateFromUrl = getUrlParam("date");
      const today = new Date();

      let currentDate = today;
      if (dateFromUrl) {
        if (/^\d{8}$/.test(dateFromUrl)) {
          const year = dateFromUrl.substring(0, 4);
          const month = dateFromUrl.substring(4, 6);
          const day = dateFromUrl.substring(6, 8);
          currentDate = new Date(`${year}-${month}-${day}`);
        } else {
          currentDate = new Date(dateFromUrl);
        }
        if (isNaN(currentDate.getTime())) {
          currentDate = today;
        }
      }

      this.state.dateString = formatDateYYYYMMDD(currentDate);
      this.state.selectedDate = this.state.dateString;
      this.state.selectedDateObj = currentDate;
      this.state.isToday =
        formatDateYYYYMMDD(currentDate) === formatDateYYYYMMDD(today);
      if (!configApplied) {
        this.provider = getSetting("server.provider");
        const classNum = getSetting("server.classNumber");

        this.state.classNumber = classNum;
      }
      await Promise.all([this.downloadData(), this.loadConfig()]);

      // Load exam data
      await this.examStore.fetchExamList();
      // Preload details for list items to show names in dialog（并行预取）
      await Promise.all(
        this.examStore.examList.map((exam) => this.examStore.fetchExam(exam.id))
      );

      this.checkUpcomingExams();
    },

    async downloadData(forceClear = false) {
      // 已有在途请求：记录本次请求参数，待在途请求完成后自动补发一次，
      // 避免"日期切换等场景下新请求被互斥跳过"导致新日期数据不加载
      if (this.loading.download) {
        this._downloadQueued = { forceClear };
        return;
      }

      // 请求序号 + 发起时日期：用于丢弃过期响应
      // （下载期间日期已切换或已有更新的请求时，旧日期/旧参数的结果不得写入 boardData）
      const seq = (this._downloadSeq || 0) + 1;
      this._downloadSeq = seq;
      const reqDate = this.state.dateString;

      try {
        this.loading.download = true;
        const response = await dataProvider.loadData(
          "classworks-data-" + reqDate
        );

        // 日期守卫 + 序号守卫：期间日期已切换或已有新请求时，丢弃本次过期结果
        if (seq !== this._downloadSeq || reqDate !== this.state.dateString) {
          return;
        }

        if (response.success == false) {
          if (response.error.code === "NOT_FOUND") {
            this.state.showNoDataMessage = true;
            this.state.noDataMessage = response.error.message;
            if (
              forceClear ||
              !this.state.boardData ||
              (!this.state.boardData.homework &&
                !this.state.boardData.attendance)
            ) {
              this.state.boardData = {
                homework: {},
                attendance: { absent: [], late: [], exclude: [] },
              };
            }
          } else if (response.error.code === "NETWORK_OFFLINE") {
            this.state.showNoDataMessage = true;
            this.state.noDataMessage = "网络不可用，仅使用本地缓存";
            if (
              !this.state.boardData ||
              (!this.state.boardData.homework &&
                !this.state.boardData.attendance)
            ) {
              this.state.boardData = {
                homework: {},
                attendance: { absent: [], late: [], exclude: [] },
              };
            }
          } else if (response.error.code === "NETWORK_ERROR") {
            const provider = getSetting("server.provider");
            const isDualMode = provider === "dual-cloud" || provider === "dual-server";
            const isLocalOnly = provider === "local";
            
            if (isDualMode || isLocalOnly) {
              this.state.showNoDataMessage = true;
              this.state.noDataMessage = isDualMode ? "暂无本地数据，请先联网同步" : "暂无本地数据";
              if (
                forceClear ||
                !this.state.boardData ||
                (!this.state.boardData.homework &&
                  !this.state.boardData.attendance)
              ) {
                this.state.boardData = {
                  homework: {},
                  attendance: { absent: [], late: [], exclude: [] },
                };
              }
            } else {
              throw new Error(response.error.message);
            }
          } else if (response.error.code === "DATA_NOT_FOUND") {
            this.state.showNoDataMessage = true;
            this.state.noDataMessage = "暂无数据";
            this.state.boardData = {
              homework: {},
              attendance: { absent: [], late: [], exclude: [] },
            };
          } else {
            throw new Error(response.error.message);
          }
        } else {
          this.state.boardData = {
            homework: response.homework || {},
            attendance: {
              absent: response.attendance?.absent || [],
              late: response.attendance?.late || [],
              exclude: response.attendance?.exclude || [],
            },
          };
          this.applyAutoAttendanceRules(this.state.boardData);
          this.state.synced = true;
          this.state.showNoDataMessage = false;
        }
      } catch (error) {
        console.error("数据加载失败:", error);
        if (
          forceClear ||
          !this.state.boardData ||
          (!this.state.boardData.homework && !this.state.boardData.attendance)
        ) {
          this.state.boardData = {
            homework: {},
            attendance: { absent: [], late: [], exclude: [] },
          };
        }
      } finally {
        this.loading.download = false;
        // 有排队中的请求（如日期切换时被互斥跳过的下载），在本次结束后补发一次，
        // 确保最新参数（forceClear/日期）一定被加载
        const queued = this._downloadQueued;
        this._downloadQueued = null;
        if (queued) {
          this.downloadData(queued.forceClear);
        }
      }
    },

    async trySave(isAutoSave = false) {
      if (isAutoSave && !this.canAutoSave) {
        if (this.shouldShowBlockedMessage) {
          this.showMessage(
            "需要手动保存",
            "已禁止自动保存非当天数据",
            "warning"
          );
        }
        return false;
      }

      if (!isAutoSave && this.needConfirmSave) {
        try {
          await this.showConfirmDialog();
        } catch {
          return false;
        }
      }

      try {
        await this.uploadData();
        return true;
      } catch (error) {
        this.$message.error("保存失败", error.message || "请重试");
        return false;
      }
    },

    async handleClose() {
      if (!this.currentEditSubject) return;

      const content = this.state.textarea.trim();
      const originalContent =
        this.state.boardData.homework[this.currentEditSubject]?.content || "";

      if (content !== originalContent.trim()) {
          // 如果内容为空且是自定义卡片，则删除该卡片
        if (!content && this.currentEditSubject.startsWith('custom-')) {
          delete this.state.boardData.homework[this.currentEditSubject];
          this.state.synced = false;
          if (this.autoSave) {
            await this.trySave(true);
          }
          this.state.dialogVisible = false;
          return;
        }
        // 如果是自定义卡片，保留其他属性
        if (this.state.boardData.homework[this.currentEditSubject].type === 'custom') {
          this.state.boardData.homework[this.currentEditSubject].content = content;
        } else {
          this.state.boardData.homework[this.currentEditSubject] = {
            ...this.state.boardData.homework[this.currentEditSubject],
            content: content,
          };
        }

        this.state.synced = false;

        if (this.autoSave) {
          await this.trySave(true);
        }
      }

      this.state.dialogVisible = false;
    },

    async uploadData() {
      if (this.loading.upload) return;

      try {
        this.loading.upload = true;
        const response = await dataProvider.saveData(
          "classworks-data-" + this.state.dateString,
          this.state.boardData
        );
        if (response.success == false) {
          throw new Error(response.error.message);
        }

        this.state.synced = true;
        this.$message.success("保存成功", response.message || "数据已保存");
      } finally {
        this.loading.upload = false;
      }
    },

    async loadConfig() {
      try {
        const response = await dataProvider.loadData("classworks-list-main");

        if (response && response.success !== false && Array.isArray(response)) {
          this.state.studentList = response.map((student) => student.name);
        } else if (response && response.success === false) {
          if (response.error?.code !== "NOT_FOUND") {
            console.warn("加载学生列表失败:", response.error?.message);
          }
        }

        await this.loadSubjects();
      } catch (error) {
        console.error("加载配置失败:", error);
      }
    },

    async loadSubjects() {
      try {
        const subjectsResponse = await dataProvider.loadData(
          "classworks-config-subject"
        );
        if (subjectsResponse && Array.isArray(subjectsResponse)) {
          // 更新科目列表
          this.state.availableSubjects = subjectsResponse;
        }
      } catch (error) {
        console.warn("Failed to load subject configuration:", error);
        // 保持默认科目列表
      }
    },

    showSyncMessage() {
      this.$message.success("数据已同步", "数据已完成与服务器同步");
    },

    async openDialog(subject) {
      // 检查编辑权限
      if (this.isEditingDisabled) {
        const manager = this.$refs.studentNameManager;
        if (manager?.isReadOnly) {
          this.$message.warning("无法编辑", "当前使用的是只读令牌");
        } else if (!this.canEditCurrentDate) {
          this.$message.warning("无法编辑", "已禁止编辑过往数据");
        } else {
          this.$message.warning("无法编辑", "数据加载中，请稍候");
        }
        return;
      }

      // 如果是自定义卡片
      if (subject.startsWith('custom-')) {
        this.currentEditSubject = subject;
        this.state.dialogTitle = this.state.boardData.homework[subject].name;
        this.state.textarea = this.state.boardData.homework[subject].content;
        this.state.dialogVisible = true;
        return;
      }

      if (this.refreshBeforeEdit) {
        try {
          await this.downloadData();
        } catch (err) {
          console.error("刷新数据失败:", err);
          this.$message.error("刷新失败", "数据可能不是最新，请重试");
        }
      }

      this.currentEditSubject = subject;
      if (!this.state.boardData.homework[subject]) {
        this.state.boardData.homework[subject] = {
          content: "",
        };
      }
      this.state.dialogTitle =
        this.state.availableSubjects.find((s) => s.name === subject)?.name ||
        subject;
      this.state.textarea = this.state.boardData.homework[subject].content;
      this.state.dialogVisible = true;
    },

    async handleHomeworkSave(content) {
      if (!this.currentEditSubject) return;

      // 如果是自定义卡片，保留其他属性
      if (this.state.boardData.homework[this.currentEditSubject].type === 'custom') {
        this.state.boardData.homework[this.currentEditSubject].content = content;
      } else {
        this.state.boardData.homework[this.currentEditSubject] = {
          ...this.state.boardData.homework[this.currentEditSubject],
          content: content,
        };
      }

      this.state.synced = false;

      if (this.autoSave) {
        await this.trySave(true);
      }
    },

    setAttendanceArea() {
      // 检查编辑权限
      if (this.isEditingDisabled) {
        this.handleDisabledClick();
        return;
      }
      this.state.attendanceDialog = true;
    },

    handleDisabledClick() {
      // 处理点击禁用卡片/区域的情况
      const manager = this.$refs.studentNameManager;
      if (manager?.isReadOnly) {
        this.$message.warning("无法编辑", "当前使用的是只读令牌");
      } else if (!this.canEditCurrentDate) {
        this.$message.warning("无法编辑", "已禁止编辑过往数据");
      } else {
        this.$message.warning("无法编辑", "数据加载中，请稍候");
      }
    },

    zoom(direction) {
      const step = 2;
      if (direction === "up" && this.state.fontSize < 100) {
        this.state.fontSize += step;
      } else if (direction === "out" && this.state.fontSize > 16) {
        this.state.fontSize -= step;
      }
      this.state.contentStyle = {
        "font-size": `${this.state.fontSize}px`,
      };
      setSetting("font.size", this.state.fontSize);
    },

    updateBackendUrl() {
      const provider = getSetting("server.provider");
      const classNum = getSetting("server.classNumber");

      this.provider = provider;

      this.state.classNumber = classNum;
    },

    shouldSkipRefresh() {
      if (this.state.dialogVisible) return true;

      if (this.state.attendanceDialog) return true;

      if (this.confirmDialog.show) return true;

      if (this.state.datePickerDialog) return true;

      if (this.loading.upload || this.loading.download) return true;

      if (!this.state.synced) return true;

      return false;
    },

    updateSettings() {
      this.state.fontSize = getSetting("font.size");
      this.state.contentStyle = { "font-size": `${this.state.fontSize}px` };
      this.setupAutoRefresh();
      this.updateBackendUrl();
      // 设置更新时尝试刷新设备名称（例如 Token 或域名变更）
      this.loadDeviceInfo();
      // 重新加载令牌信息（Token 可能已变更）
      this.loadTokenInfo();
      // 触发依赖刷新（例如 shouldShowInit）
      this.settingsTick++;
      // 重新应用自动出勤规则
      this.applyAutoAttendanceRules(this.state.boardData);
    },

    async handleDateSelect(newDate) {
      if (!newDate) return;

      try {
        const selectedDate = ensureDate(newDate);
        const dateStr = formatDateYYYYMMDD(selectedDate);

        if (dateStr === this.state.dateString) return;

        this.state.dateString = dateStr;
        this.state.selectedDate = dateStr;
        this.state.selectedDateObj = selectedDate;
        this.state.isToday =
          dateStr === formatDateYYYYMMDD(new Date());

        // Load both data and subjects in parallel, force clear data when switching dates
        await Promise.all([this.downloadData(true), this.loadSubjects()]);
      } catch (error) {
        console.error("Date processing error:", error);
        this.$message.error("日期处理错误", "请重新选择日期");
      }
    },

    async saveAttendance() {
      try {
        await this.trySave(false);
        this.state.attendanceDialog = false;
      } catch (error) {
        console.error("保存出勤状态失败:", error);
        this.$message.error("保存失败", "请重试");
      }
    },

    showMessage(title, content = "", type = "success") {
      this.$message[type](title, content);
    },

    addTestCard() {
      const id = Date.now().toString();
      this.state.boardData.homework[`custom-${id}`] = {
        name: "测试卡片",
        content: "这是一个测试卡片\n可以用来测试布局",
        type: "custom",
      };
      this.state.synced = false;
    },

    openUafTransfer(mode) {
      this.uafTransfer.mode = mode;
      this.uafTransfer.show = true;
    },

    handleUafSuccess(title, content) {
      this.$message.success(title, content);
    },

    handleUafError(title, content) {
      this.$message.error(title, content);
    },

    async handleUafImported(result) {
      if (result.savedDates.includes(this.state.dateString)) {
        await this.downloadData(true);
      }
    },
    async manualUpload() {
      return this.trySave(false);
    },

    handleAttendanceChange() {
      this.state.synced = false;
    },

    async handleAttendanceDialogClose(newValue) {
      if (!newValue && !this.state.synced) {
        await this.trySave(true);
      }
    },

    openRandomPicker() {
      if (this.$refs.randomPicker) {
        this.$refs.randomPicker.open();
      }
    },

    checkHashForRandomPicker() {
      if (window.location.hash === "#random-picker") {
        this.$nextTick(() => {
          console.log("打开随机点名");
          window.location.hash = "";
          this.openRandomPicker();
        });
      }
    },

    parseUrlConfig() {
      try {
        const configParam = getUrlParam("config");

        if (!configParam) return false;

        try {
          const decodedConfig = decodeConfigFromBase64Url(configParam);
          console.log("从URL读取配置:", decodedConfig);

          const changes = [];
          const validSettings = {};
          const icons = {};

          this.processSpecialSettings(
            decodedConfig,
            changes,
            validSettings,
            this.state.dateString,
            this.state.availableSubjects.length
          );

          this.processStandardSettings(
            decodedConfig,
            changes,
            validSettings,
            icons
          );

          if (Object.keys(validSettings).length === 0) {
            console.log("URL配置与当前配置相同，无需应用");
            return false;
          }

          return new Promise((resolve) => {
            this.urlConfigDialog = {
              show: true,
              config: decodedConfig,
              changes: changes,
              validSettings: validSettings,
              icons: icons,
              confirmHandler: () => {
                this.urlConfigDialog.show = false;
                this.applyUrlConfig(validSettings);
                resolve(true);
              },
              cancelHandler: () => {
                this.urlConfigDialog.show = false;
                resolve(false);
              },
            };
          });
        } catch (e) {
          console.error("解析URL配置错误:", e);
          this.$message.error("URL配置错误", "无法解析配置数据");
          return false;
        }
      } catch (e) {
        console.error("处理URL配置错误:", e);
        return false;
      }
    },

    processSpecialSettings(decodedConfig, changes, validSettings, currentDateString, currentSubjectsCount) {
      if (decodedConfig.classNumber !== undefined) {
        const current = getSetting("server.classNumber");
        if (decodedConfig.classNumber !== current) {
          changes.push({
            key: "server.classNumber",
            name: "班级",
            oldValue: current,
            newValue: decodedConfig.classNumber,
            description:
              settingsDefinitions["server.classNumber"]?.description ||
              "班级编号",
            icon:
              settingsDefinitions["server.classNumber"]?.icon ||
              ICON.ACCOUNT_GROUP,
          });
          validSettings["server.classNumber"] = decodedConfig.classNumber;
        }
      }

      if (decodedConfig.date !== undefined) {
        if (decodedConfig.date !== currentDateString) {
          changes.push({
            key: "date",
            name: "日期",
            oldValue: currentDateString,
            newValue: decodedConfig.date,
            description: "查看的日期",
            icon: ICON.CALENDAR,
          });
          validSettings.date = decodedConfig.date;
        }
      }

      if (decodedConfig.subjects && Array.isArray(decodedConfig.subjects)) {
        changes.push({
          key: "subjects",
          name: "科目列表",
          oldValue: `${currentSubjectsCount}个科目`,
          newValue: `${decodedConfig.subjects.length}个科目`,
          description: "可用科目列表",
          icon: ICON.BOOK_NOTEBOOK,
        });
        validSettings.subjects = decodedConfig.subjects;
      }
    },

    processStandardSettings(decodedConfig, changes, validSettings, icons) {
      Object.entries(decodedConfig).forEach(([key, value]) => {
        if (["classNumber", "date", "subjects"].includes(key)) {
          return;
        }

        let settingKey = key;
        let definition = settingsDefinitions[key];

        if (!definition && !key.includes(".")) {
          const prefixes = [
            "server.",
            "display.",
            "theme.",
            "edit.",
            "refresh.",
            "font.",
            "randomPicker.",
          ];
          for (const prefix of prefixes) {
            const prefixedKey = `${prefix}${key}`;
            if (settingsDefinitions[prefixedKey]) {
              settingKey = prefixedKey;
              definition = settingsDefinitions[prefixedKey];
              break;
            }
          }
        }

        if (definition) {
          let typedValue = coerceValueToType(value, definition.type);

          if (definition.validate && !definition.validate(typedValue)) {
            console.warn(`URL配置项 ${settingKey} 的值无效: ${value}`);
            return;
          }

          const currentValue = getSetting(settingKey);
          if (typedValue !== currentValue) {
            changes.push({
              key: settingKey,
              name: getSettingDisplayName(settingKey),
              oldValue: formatSettingValue(currentValue, settingKey),
              newValue: formatSettingValue(typedValue, settingKey),
              description: definition.description || settingKey,
              icon: definition.icon || ICON.SETTINGS,
            });
            validSettings[settingKey] = typedValue;
            icons[settingKey] = definition.icon || ICON.SETTINGS;
          }
        } else {
          changes.push({
            key: key,
            name: getSettingDisplayName(key),
            oldValue: "未知",
            newValue: formatSettingValue(value, key),
            description: "自定义配置项",
            icon: ICON.COG_OUTLINE,
          });
          validSettings[key] = value;
          icons[key] = ICON.COG_OUTLINE;
        }
      });
    },


    applyUrlConfig(validSettings) {
      for (const [key, value] of Object.entries(validSettings)) {
        if (key === "date") {
          this.handleDateSelect(value);
          continue;
        }

        if (key === "subjects") {
          this.state.availableSubjects = value;
          continue;
        }

        setSetting(key, value);

        if (key === "server.classNumber") {
          this.state.classNumber = value;
        }
      }

      this.updateBackendUrl();
      this.$message.success("URL配置已应用", "已从URL加载配置");
      return true;
    },

    navigateDay(offset) {
      const currentDate = new Date(this.state.selectedDateObj);
      currentDate.setDate(currentDate.getDate() + offset);
      this.handleDateSelect(currentDate);
    },

    async copyHomeworkToToday() {
      if (this.loading.copyToToday) return;

      try {
        this.loading.copyToToday = true;

        // 1. 保存当前选中日期的作业数据
        const sourceDate = this.state.dateString;
        const sourceHomework = structuredClone(this.state.boardData.homework);

        // 2. 切换到今天并加载今天的数据（主要是为了获取考勤等其他数据）
        // 必须 forceClear：今天无数据时清空源日期的残留 boardData（含源日期考勤），
        // 避免源日期的 absent/late/exclude 被一并写入今天的键
        const today = new Date();
        const todayString = formatDateYYYYMMDD(today);

        // 临时切换到今天以加载数据
        this.state.dateString = todayString;
        await this.downloadData(true);

        // 3. 直接替换今天的作业数据（删除原有作业，使用源日期的作业）
        // 深拷贝源日期的作业数据
        const newHomework = {};
        for (const key in sourceHomework) {
          if (sourceHomework[key] && sourceHomework[key].content) {
            // 如果是自定义卡片，保留完整结构
            if (sourceHomework[key].type === 'custom') {
              newHomework[key] = structuredClone(sourceHomework[key]);
            } else {
              // 普通作业，只复制内容
              newHomework[key] = {
                content: sourceHomework[key].content,
                tags: Array.isArray(sourceHomework[key].tags)
                  ? [...sourceHomework[key].tags]
                  : [],
              };
            }
          }
        }

        // 直接替换作业数据
        this.state.boardData.homework = newHomework;
        this.state.synced = false;

        // 4. 保存到今天
        await this.uploadData();

        // 5. 更新视图状态为今天
        this.state.selectedDate = todayString;
        this.state.selectedDateObj = today;
        this.state.isToday = true;

        // 6. 更新URL
        const url = new URL(window.location);
        url.searchParams.delete('date');
        window.history.pushState({}, '', url);

        this.$message.success("复制成功", `已将 ${sourceDate} 的作业内容复制到今天（已替换原有作业）`);
      } catch (error) {
        console.error("复制作业失败:", error);
        this.$message.error("复制失败", error.message || "请重试");
      } finally {
        this.loading.copyToToday = false;
      }
    },
  },
};
</script>
