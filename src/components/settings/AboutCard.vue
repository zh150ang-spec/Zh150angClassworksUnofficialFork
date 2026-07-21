<template>
  <v-card
    border
    hover
    rounded="xl"
  >
    <v-card-item>
      <template #prepend>
        <v-icon
          class="mr-2"
          :icon="ICON.INFO"
          size="large"
        />
      </template>
      <v-card-title class="text-headline-small">
        关于
      </v-card-title>
    </v-card-item>

    <v-card-text>
      <v-row>
        <v-col
          class="mx-auto"
          cols="12"
          md="8"
        >
          <!-- 捐赠卡片 -->
          <v-card
            border
            class="donation-card gradient-donation clickable mb-6"
            color="primary"
            elevation="3"
            hover
            rounded="xl"
            variant="tonal"
            @click="openDonationLink"
          >
            <v-card-item>
              <div class="card-content">
                <div>
                  <div class="text-headline-small font-weight-bold">
                    请支持我们 Classworks
                  </div>
                </div>
              </div>
            </v-card-item>
            <v-card-text>
              <p class="text-body-medium mb-3">
                Classworks 是一个开源免费的班级作业板工具。如果觉得有帮助，欢迎支持开发者。
              </p>
              <div class="mt-4">
                <v-btn
                  :append-icon="ICON.HEART"
                  aria-label="Support Classworks on Aifadian"
                  class="text-none"
                  color="pink"
                  rounded="xl"
                  variant="elevated"
                  @click="openDonationLink"
                >
                  爱发电
                </v-btn>
              </div>
            </v-card-text>
          </v-card>

          <div class="d-flex flex-column align-start">
            <v-avatar
              class="mb-4"
              size="120"
            >
              <v-img
                alt="Classworks"
                src="../../assets/cslogo.png"
              />
            </v-avatar>

            <h2 class="mb-2">
              Classworks
            </h2>
            <p class="text-body-large mb-4">
              适用于班级大屏的作业板小工具
            </p>

            <div class="d-flex gap-2 flex-wrap mb-6">
              <v-btn
                color="red"
                :prepend-icon="ICON.BUG"
                variant="tonal"
                @click="openReportDialog"
              >
                报告问题
              </v-btn>
              <v-btn
                color="primary"
                href="https://qm.qq.com/q/qNBX4ZZVeg"
                :prepend-icon="ICON.QQCHAT"
                target="_blank"
                variant="tonal"
              >
                QQ 群
              </v-btn>
              <v-btn
                href="https://github.com/Moonrend/Classworks"
                :prepend-icon="ICON.GITHUB"
                target="_blank"
                variant="text"
              >
                前端
              </v-btn>
              <v-btn
                href="https://github.com/Moonrend/ClassworksServer"
                :prepend-icon="ICON.GITHUB"
                target="_blank"
                variant="text"
              >
                后端
              </v-btn>
            </div>

            <v-divider class="mb-4 w-100" />

            <h3 class="text-headline-small mb-2">
              备注与致谢
            </h3>
            <v-list class="mb-4 bg-transparent">
              <v-list-item
                :append-icon="ICON.LINK"
                href="https://github.com/EnderWolf006/HomeworkBoard"
                target="_blank"
              >
                <v-list-item-title>
                  本项目受到 HomeworkBoard 的启发而开发
                </v-list-item-title>
                <v-list-item-subtitle>
                  感谢 EnderWolf006 (@EnderWolf) fhzit(@Hellofhz) KeyFac
                  等人的贡献
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item
                :append-icon="ICON.LINK"
                href="https://hlyun.org"
                target="_blank"
              >
                <v-list-item-title>
                  Classworks 由厚浪云提供服务支持
                </v-list-item-title>
                <v-list-item-subtitle>
                  云服务器托管平台
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item
                :append-icon="ICON.LINK"
                href="https://clock.qqhkx.com/"
                target="_blank"
              >
                <v-list-item-title>
                  感谢 沉浸式时钟
                </v-list-item-title>
                <v-list-item-subtitle>
                  https://clock.qqhkx.com/
                </v-list-item-subtitle>
              </v-list-item>
              <v-divider class="ma-1" />
              <v-list-item
                :append-icon="ICON.LINK"
                href="https://classisland.tech"
                target="_blank"
              >
                <v-list-item-title>
                  ClassIsland - 班级大屏课表显示工具
                </v-list-item-title>
                <v-list-item-subtitle>
                  由 HelloWRC 开发
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item
                :append-icon="ICON.LINK"
                href="https://github.com/HUSX100/IslandCaller"
                target="_blank"
              >
                <v-list-item-title>
                  IslandCaller - 基于 ClassIsland 的点名器
                </v-list-item-title>
                <v-list-item-subtitle>
                  由 HUSX100 开发
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <v-btn
              class="mb-4"
              :prepend-icon="ICON.PACKAGE_VARIANT"
              variant="text"
              @click="showDeps = true"
            >
              查看使用的第三方库
            </v-btn>

            <v-dialog
              v-model="showDeps"
              fullscreen
              transition="dialog-bottom-transition"
            >
              <v-card>
                <v-toolbar>
                  <v-btn
                    :icon="ICON.CLOSE"
                    @click="showDeps = false"
                  />
                  <v-toolbar-title>使用的第三方库</v-toolbar-title>
                  <v-spacer />
                </v-toolbar>
                <v-card-text>
                  <v-list>
                    <v-list-item
                      v-for="dep in Dependencies"
                      :key="dep.name"
                      :href="'https://www.npmjs.com/package/' + dep.name"
                      :append-icon="ICON.LINK"
                      target="_blank"
                    >
                      <v-list-item-title>
                        {{ dep.name }}
                      </v-list-item-title>
                      <v-list-item-subtitle>
                        v{{ dep.version }}
                      </v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </v-card-text>
              </v-card>
            </v-dialog>

            <!-- 报告问题对话框 -->
            <v-dialog
              v-model="showReportDialog"
              max-width="640"
            >
              <v-card>
                <v-toolbar density="compact">
                  <v-btn
                    :icon="ICON.CLOSE"
                    @click="showReportDialog = false"
                  />
                  <v-toolbar-title>报告问题</v-toolbar-title>
                  <v-spacer />
                </v-toolbar>
                <v-card-text>
                  <p class="mb-4">
                    调试ID与下方的浏览器环境信息将帮助我们快速定位问题，请在反馈中一并附上。
                  </p>
                  <v-sheet
                    class="mb-3 pa-3 bg-surface-variant rounded"
                    style="max-height: 260px; overflow: auto;"
                  >
                    <pre
                      class="text-body-medium"
                      style="white-space: pre-wrap; margin: 0;"
                    >{{ envBoxText }}</pre>
                  </v-sheet>
                  <div class="d-flex gap-2 flex-wrap mb-4">
                    <v-btn
                      size="small"
                      variant="text"
                      :prepend-icon="ICON.REFRESH"
                      :loading="visitorLoading"
                      @click="reloadVisitorId"
                    >
                      刷新
                    </v-btn>
                    <v-btn
                      size="small"
                      variant="text"
                      :prepend-icon="ICON.CONTENT_COPY"
                      @click="copyEnvInfo"
                    >
                      复制信息
                    </v-btn>
                    <v-btn
                      size="small"
                      variant="text"
                      :prepend-icon="ICON.OPEN_IN_NEW"
                      @click="goToDebug"
                    >
                      查看 /debug 页面
                    </v-btn>
                  </div>
                  <v-alert
                    v-if="copyOk"
                    type="success"
                    density="compact"
                    class="mb-4"
                  >
                    已复制到剪贴板
                  </v-alert>
                  <div class="d-flex gap-2 mb-4">
                    <v-btn
                      size="small"
                      color="primary"
                      variant="elevated"
                      :prepend-icon="ICON.MESSAGE_ALERT"
                      block
                      @click="openFeedback"
                    >
                      发送错误反馈到 Sentry
                    </v-btn>
                  </div>
                  <h4 class="text-body-large mb-2">
                    反馈渠道
                  </h4>
                  <v-list
                    lines="one"
                    class="bg-transparent"
                  >
                    <v-list-item
                      :href="qqGroupLink"
                      target="_blank"
                      :prepend-icon="ICON.QQCHAT"
                    >
                      <v-list-item-title>QQ群 ({{ qqGroupNumber }})</v-list-item-title>
                      <v-list-item-subtitle>964979747</v-list-item-subtitle>
                    </v-list-item>
                    <v-list-item
                      :href="githubIssueUrl"
                      target="_blank"
                      :prepend-icon="ICON.GITHUB"
                    >
                      <v-list-item-title>GitHub Issue</v-list-item-title>
                      <v-list-item-subtitle>Moonrend/Classworks</v-list-item-subtitle>
                    </v-list-item>
                    <v-list-item
                      :href="mailtoLink"
                      target="_blank"
                      :prepend-icon="ICON.EMAIL"
                    >
                      <v-list-item-title>邮件</v-list-item-title>
                      <v-list-item-subtitle>sun@wuyuan.dev</v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </v-card-text>
                <v-card-actions>
                  <v-spacer />
                  <v-btn
                    variant="text"
                    @click="showReportDialog = false"
                  >
                    关闭
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>

            <p class="text-body-small text-medium-emphasis">
              Copyright © {{ new Date().getFullYear() }} Sunwuyuan
            </p>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import { ICON } from '@/utils/icons'
import {ref, onMounted, computed} from "vue";
import { useRouter } from 'vue-router'
import { getVisitorId } from '@/utils/visitorId'
import packageJson from "../../../package.json";

export default {
  name: "AboutCard",
  setup() {
    const Dependencies = ref([]);
    const showDeps = ref(false);
    const showReportDialog = ref(false);
    const debugIdInput = ref('');
    const visitorLoading = ref(false);
    const copyOk = ref(false);
    const qqGroupNumber = '964979747';
    const qqGroupLink = 'https://qm.qq.com/q/T6qImKJjGi';
    const router = useRouter();

    const loadDependencies = () => {
      try {
        // 合并 dependencies 和 devDependencies
        const allDependencies = {
          ...(packageJson.dependencies || {}),
          ...(packageJson.devDependencies || {}),
        };

        // 转换为数组并过滤掉不需要显示的依赖
        const deps = Object.entries(allDependencies).map(([name, version]) => ({
          name,
          version: version.replace(/[\^~]/g, ""),
          description: getDependencyDescription(name),
        }));

        Dependencies.value = deps;
      } catch (error) {
        console.error("加载依赖信息失败:", error);
        Dependencies.value = [];
      }
    };

    const getDependencyDescription = (name) => {
      const descriptions = {
        vue: "渐进式 JavaScript 框架",
        vuetify: "材料设计组件框架",
        axios: "Promise 基础的 HTTP 客户端",
        pinia: "Vue 状态管理库",
        "vue-router": "Vue.js 官方路由管理器",
        "@vitejs/plugin-vue": "Vite 的 Vue 插件",
      };
      return descriptions[name] || "";
    };

    const goToDebug = () => {
      router.push('/debug');
    };

    const loadVisitorId = async () => {
      visitorLoading.value = true;
      try {
        const id = await getVisitorId();
        debugIdInput.value = id || '';
      } catch (e) {
        console.error('获取访客ID失败', e);
      } finally {
        visitorLoading.value = false;
      }
    };

    const reloadVisitorId = () => loadVisitorId();

    const openReportDialog = async () => {
      showReportDialog.value = true;
      if (!debugIdInput.value) await loadVisitorId();
    };

    const copyEnvInfo = async () => {
      try {
        await navigator.clipboard.writeText(envBoxText.value);
        copyOk.value = true;
        setTimeout(() => (copyOk.value = false), 1800);
      } catch (e) {
        console.error('复制失败', e);
      }
    };

    const envInfo = computed(() => {
      const nav = navigator || {};
      const intl = (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions() : {};
      const tz = intl && intl.timeZone ? intl.timeZone : '';
      const routePath = router.currentRoute?.value?.fullPath || location.pathname;
      const lines = [
        `App 版本: v${packageJson?.version || 'unknown'}`,
        `URL: ${location.href}`,
        `路由: ${routePath}`,
        `UserAgent: ${nav.userAgent || ''}`,
        `语言: ${nav.language || ''}`,
        `时区: ${tz}`,
        `平台: ${nav.platform || ''}`,
        `在线: ${String(nav.onLine)}`,
        `屏幕: ${screen?.width || '-'}x${screen?.height || '-'}`,
        `视口: ${window.innerWidth || '-'}x${window.innerHeight || '-'}`,
      ];
      return lines.join('\n');
    });

    const envBoxText = computed(() => {
      return `调试ID: ${debugIdInput.value || '获取失败'}\n\n浏览器/环境信息:\n${envInfo.value}`;
    });

    const reportBody = computed(() => {
      return [
        `问题描述:`,
        `1. 期望行为:`,
        `2. 实际行为:`,
        `3. 复现步骤:`,
        '',
        envBoxText.value,
      ].join('\n');
    });

    const githubIssueUrl = computed(() => {
      const base = 'https://github.com/Moonrend/Classworks/issues/new';
      const title = encodeURIComponent('问题报告');
      const body = encodeURIComponent(reportBody.value);
      return `${base}?title=${title}&body=${body}`;
    });

    const mailtoLink = computed(() => {
      const subject = encodeURIComponent('Classworks 问题报告');
      const body = encodeURIComponent(reportBody.value);
      return `mailto:sun@wuyuan.dev?subject=${subject}&body=${body}`;
    });

    const openFeedback = () => {
      // 打开反馈对话框
      if (typeof window.openSentryFeedback === 'function') {
        window.openSentryFeedback();
      } else {
        console.warn('Sentry Feedback 功能不可用');
      }
    };

    const openDonationLink = () => {
      window.open('https://afdian.com/a/wydev', '_blank');
    };

    onMounted(() => {
      loadDependencies();
    });

    return {
      Dependencies,
      showDeps,
      showReportDialog,
      debugIdInput,
      visitorLoading,
      copyOk,
      qqGroupNumber,
      qqGroupLink,
      ICON,
      goToDebug,
      reloadVisitorId,
      openReportDialog,
      copyEnvInfo,
      openFeedback,
      openDonationLink,
      envBoxText,
      envInfo,
      reportBody,
      githubIssueUrl,
      mailtoLink,
    };
  },
};
</script>

<style scoped>
.gradient-donation {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.12), rgba(var(--v-theme-primary), 0.04) 60%);
  border: 2px solid rgba(var(--v-theme-primary), 0.2);
  transition: all var(--duration-normal) var(--var(--ease-apple)-apple);
  cursor: pointer;
}

.gradient-donation:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-raised) !important;
}

.gradient-donation:active {
  transform: translateY(-2px);
}

.card-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
