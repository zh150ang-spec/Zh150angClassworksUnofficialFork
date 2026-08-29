<template>
  <div
    ref="gridContainer"
    class="grid-masonry"
    :class="$attrs.class"
  >
    <TransitionGroup name="grid">
      <div
        v-for="item in sortedItems"
        :key="item.key"
        ref="items"
        :data-key="item.key"
        :style="{
          order: item.order,
        }"
        class="grid-item"
      >
        <!-- 时间卡片 -->
        <div
          v-if="item.type === 'time'"
          style="height: 100%"
        >
          <time-card />
        </div>

        <!-- 一言卡片 -->
        <div
          v-else-if="item.type === 'hitokoto'"
          style="height: 100%"
        >
          <hitokoto-card />
        </div>

        <!-- 考试卡片 -->
        <div
          v-else-if="item.type === 'exam'"
          style="height: 100%"
        >
          <concise-exam-card
            :exam-id="item.data.examId"
            :content-style="contentStyle"
            @click="$emit('open-exam-detail', item.data.examId)"
          />
        </div>

        <!-- 出勤卡片 -->
        <v-card
          v-else-if="item.type === 'attendance'"
          :class="{ 'cursor-not-allowed': isEditingDisabled, 'cursor-pointer': !isEditingDisabled }"
          border
          height="100%"
          @click="handleCardClick('attendance', null)"
        >
          <v-card-title class="d-flex align-center">
            <v-icon
              start
              color="primary"
              :icon="ICON.ACCOUNT_GROUP"
            />
            出勤统计
          </v-card-title>
          <v-card-text>
            <div class="d-flex justify-space-between align-center mb-2">
              <span>应到/实到</span>
              <span class="text-headline-small">
                {{ item.data.total - item.data.exclude.length }}/{{
                  item.data.total -
                    item.data.absent.length -
                    (!getSetting("display.lateStudentsArePresent")) * item.data.late.length -
                    item.data.exclude.length
                }}
              </span>
            </div>
            <v-divider class="mb-2" />

            <div
              v-if="item.data.absent.length > 0"
              class="mb-2"
            >
              <div class="text-error text-body-small mb-1">
                请假 ({{ item.data.absent.length }})
              </div>
              <div
                class="d-flex flex-wrap"
                style="gap: var(--space-1)"
              >
                <v-chip
                  v-for="name in item.data.absent"
                  :key="name"
                  color="error"
                  size="x-small"
                  variant="flat"
                >
                  {{ name }}
                </v-chip>
              </div>
            </div>

            <div
              v-if="item.data.late.length > 0"
              class="mb-2"
            >
              <div class="text-warning text-body-small mb-1">
                迟到 ({{ item.data.late.length }})
              </div>
              <div
                class="d-flex flex-wrap"
                style="gap: var(--space-1)"
              >
                <v-chip
                  v-for="name in item.data.late"
                  :key="name"
                  color="warning"
                  size="x-small"
                  variant="flat"
                >
                  {{ name }}
                </v-chip>
              </div>
            </div>

            <div
              v-if="item.data.exclude.length > 0"
              class="mb-2"
            >
              <div class="text-medium-emphasis text-body-small mb-1">
                不参与 ({{ item.data.exclude.length }})
              </div>
              <div
                class="d-flex flex-wrap"
                style="gap: var(--space-1)"
              >
                <v-chip
                  v-for="name in item.data.exclude"
                  :key="name"
                  color="medium-emphasis"
                  size="x-small"
                  variant="flat"
                >
                  {{ name }}
                </v-chip>
              </div>
            </div>

            <div
              v-if="
                item.data.absent.length === 0 &&
                  item.data.late.length === 0 &&
                  item.data.exclude.length === 0
              "
              class="text-success text-center mt-2"
            >
              全勤
            </div>
          </v-card-text>
        </v-card>

        <!-- 自定义/测试卡片 -->
        <v-card
          v-else-if="item.type === 'custom'"
          :class="{ 'cursor-not-allowed': isEditingDisabled, 'cursor-pointer': !isEditingDisabled }"
          border
          height="100%"
          @click="handleCardClick('dialog', item.key)"
        >
          <v-card-title class="text-primary">
            <v-icon
              class="mr-2"
              :icon="ICON.CARD_TEXT_OUTLINE"
              size="small"
            />
            {{ item.name }}
          </v-card-title>
          <v-card-text :style="contentStyle">
            {{ item.content }}
          </v-card-text>
        </v-card>

        <!-- 普通作业卡片 -->
        <v-card
          v-else
          :class="{ 'cursor-not-allowed': isEditingDisabled, 'cursor-pointer': !isEditingDisabled }"
          border
          height="100%"
          rounded="xl"
          @click="handleCardClick('dialog', item.key)"
        >
          <v-card-title>
            {{ item.name }}
          </v-card-title>
          <v-card-text
            :style="contentStyle"
          >
            <!-- eslint-disable vue/no-v-html -- 内容已通过 escapeHtml 进行 XSS 防护 -->
            <div
              class="homework-content"
              v-html="renderMarkdown(item.content)"
            />
            <!-- eslint-enable vue/no-v-html -->
          </v-card-text>
        </v-card>
      </div>
    </TransitionGroup>
  </div>

  <!-- 单独显示空科目 -->
  <div class="empty-subjects mt-4">
    <!-- 移动端优化视图：紧凑 chips -->
    <div
      v-if="isMobile"
      class="d-flex flex-wrap justify-center"
    >
      <v-chip
        v-for="subject in unusedSubjects"
        :key="subject.name"
        class="ma-1 empty-subject-chip"
        color="primary"
        variant="tonal"
        @click="handleCardClick('dialog', subject.name)"
      >
        <v-icon
          start
          size="small"
        >
          {{ isReadOnlyToken ? ICON.CANCEL : ICON.PLUS }}
        </v-icon>
        {{ subject.name }}
      </v-chip>
    </div>

    <!-- 按钮模式：统一为卡片式按钮 -->
    <template v-else-if="emptySubjectDisplay === 'button'">
      <div class="empty-subjects-grid">
        <TransitionGroup name="v-list">
          <v-card
            v-for="subject in unusedSubjects"
            :key="subject.name"
            border
            rounded="xl"
            class="empty-subject-card"
            @click="handleCardClick('dialog', subject.name)"
          >
            <v-card-text class="d-flex align-center justify-center py-3">
              <v-icon
                size="small"
                start
              >
                {{ isReadOnlyToken ? ICON.CANCEL : ICON.PLUS }}
              </v-icon>
              <span class="text-body-large">{{ subject.name }}</span>
            </v-card-text>
          </v-card>
        </TransitionGroup>
      </div>
    </template>

    <!-- 卡片模式：与主网格卡片视觉统一 -->
    <div
      v-else
      class="empty-subjects-grid"
    >
      <TransitionGroup name="v-list">
        <v-card
          v-for="subject in unusedSubjects"
          :key="subject.name"
          border
          rounded="xl"
          class="empty-subject-card"
          @click="handleCardClick('dialog', subject.name)"
        >
          <v-card-title class="text-body-large">
            {{ subject.name }}
          </v-card-title>
          <v-card-text class="text-center">
            <template v-if="isReadOnlyToken">
              <v-icon
                color="medium-emphasis"
                size="small"
                :icon="ICON.CANCEL"
              />
              <div class="text-body-small text-medium-emphasis">
                当日无作业
              </div>
            </template>
            <template v-else>
              <v-icon
                color="medium-emphasis"
                size="small"
                :icon="ICON.PLUS"
              />
              <div class="text-body-small text-medium-emphasis">
                点击添加作业
              </div>
            </template>
          </v-card-text>
        </v-card>
      </TransitionGroup>
    </div>
  </div>
</template>

<script>
import { ICON } from '@/utils/icons'
import HitokotoCard from "@/components/home/HitokotoCard.vue";
import TimeCard from "@/components/home/TimeCard.vue";
import ConciseExamCard from "@/components/home/ConciseExamCard.vue";
import {getSetting} from "@/utils/settings.js";
import {getEffectiveServerUrl} from "@/utils/serverRotation";

export default {
  name: "HomeworkGrid",
  components: {
    HitokotoCard,
    TimeCard,
    ConciseExamCard,
  },
  props: {
    sortedItems: {
      type: Array,
      required: true,
    },
    unusedSubjects: {
      type: Array,
      required: true,
    },
    emptySubjectDisplay: {
      type: String,
      default: "button",
    },
    isMobile: {
      type: Boolean,
      default: false,
    },
    isEditingDisabled: {
      type: Boolean,
      default: false,
    },
    contentStyle: {
      type: Object,
      default: () => ({}),
    },
    highlightedCards: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ["open-dialog", "open-attendance", "disabled-click", "open-exam-detail"],
  data() {
    return {
      ICON,
      isReadOnlyToken: false,
      gridMetrics: null,
      observedContents: new Set(),
      resizeFrame: null,
    }
  },
  async mounted() {
    /* eslint-disable no-undef */
    this.resizeObserver = new ResizeObserver(() => this.scheduleResize());
    /* eslint-enable no-undef */

    // Observe the grid container for width changes
    if (this.$refs.gridContainer) {
      this.resizeObserver.observe(this.$refs.gridContainer);
    }

    // Initial resize and observe
    this.$nextTick(() => {
      this.observeItems();
      this.scheduleResize();
    });

    // 检查只读状态
    await this.checkReadOnlyStatus();
  },
  updated() {
    // When items change, re-observe new items and schedule resize
    this.$nextTick(() => {
      this.observeItems();
      this.scheduleResize();
    });
  },
  beforeUnmount() {
    if (this.resizeFrame) {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.observedContents.clear();
    }
  },
  methods: {
    getSetting,
    getGridMetrics() {
      if (this.gridMetrics) return this.gridMetrics;
      const grid = this.$refs.gridContainer;
      if (!grid) return null;
      const style = window.getComputedStyle(grid);
      this.gridMetrics = {
        rowHeight: parseInt(style.getPropertyValue('grid-auto-rows')) || 1,
        rowGap: parseInt(style.getPropertyValue('gap')) || 0,
      };
      return this.gridMetrics;
    },
    scheduleResize() {
      if (this.resizeFrame) return;
      // 每次调度时失效 gridMetrics 缓存，确保下次 resize 时读取最新的 CSS 值
      this.gridMetrics = null;
      this.resizeFrame = requestAnimationFrame(() => {
        this.resizeFrame = null;
        this.resizeAllGridItems();
      });
    },
    observeItems() {
      if (!this.$refs.items) return;
      this.$refs.items.forEach(item => {
        const content = item.firstElementChild;
        if (content && !this.observedContents.has(content)) {
          this.observedContents.add(content);
          this.resizeObserver.observe(content);
        }
      });
    },
    escapeHtml(text) {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return String(text).replace(/[&<>"']/g, m => map[m]);
    },
    async checkReadOnlyStatus() {
      // 尝试获取父组件中的StudentNameManager引用
      try {
        // 在Vue 2中，通过$parent或$root访问父组件
        let manager = null;

        // 首先尝试直接访问父组件的引用
        if (this.$parent && this.$parent.$refs && this.$parent.$refs.studentNameManager) {
          manager = this.$parent.$refs.studentNameManager;
        } else if (this.$root && this.$root.$refs && this.$root.$refs.studentNameManager) {
          manager = this.$root.$refs.studentNameManager;
        }

        if (manager && typeof manager.isReadOnly !== 'undefined') {
          this.isReadOnlyToken = manager.isReadOnly;
        } else {
          // 如果无法直接访问manager，尝试通过全局设置获取token信息
          const token = getSetting('server.kvToken');

          if (token) {
            // 通过API获取token信息来判断是否只读
            const { default: axios } = await import('@/axios/axios');
            const serverUrl = getEffectiveServerUrl();

            if (serverUrl) {
              try {
                const tokenResponse = await axios.get(`${serverUrl}/kv/_token`, {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                });

                if (tokenResponse.data && typeof tokenResponse.data.isReadOnly !== 'undefined') {
                  this.isReadOnlyToken = tokenResponse.data.isReadOnly;
                }
              } catch (err) {
                // 安全日志：仅记录 message 和 status，避免泄漏 error.config.headers 中的 Authorization Bearer token
                console.error('获取Token信息失败:', err.message, err.response?.status);
              }
            }
          }
        }
      } catch (error) {
        console.error('检查只读状态失败:', error);
      }
    },
    resizeGridItem(item) {
      const metrics = this.getGridMetrics();
      if (!metrics) return;

      // Find the content element (v-card or div)
      const content = item.firstElementChild;
      if (!content) return;

      // Calculate required span
      const contentHeight = content.getBoundingClientRect().height;

      // Formula: span = ceil((contentHeight + gap) / (rowHeight + gap))
      const rowSpan = Math.ceil((contentHeight + metrics.rowGap) / (metrics.rowHeight + metrics.rowGap));

      item.style.gridRowEnd = `span ${rowSpan}`;
    },
    resizeAllGridItems() {
      const items = this.$refs.items;
      if (!items || items.length === 0) return;
      // Batch read layout metrics first, then write styles to avoid layout thrashing
      const metrics = this.getGridMetrics();
      if (!metrics) return;
      items.forEach(item => {
        const content = item.firstElementChild;
        if (!content) return;
        const contentHeight = content.getBoundingClientRect().height;
        const rowSpan = Math.ceil((contentHeight + metrics.rowGap) / (metrics.rowHeight + metrics.rowGap));
        item.style.gridRowEnd = `span ${rowSpan}`;
      });
    },
    handleCardClick(type, key) {
      if (this.isEditingDisabled) {
        this.$emit('disabled-click');
        return;
      }

      if (type === 'attendance') {
        this.$emit('open-attendance');
      } else if (type === 'dialog') {
        this.$emit('open-dialog', key);
      }
    },
    splitPoint(content) {
      return content.split("\n").filter((text) => text.trim());
    },
    renderMarkdown(content) {
      if (!content) return '';
      
      const lines = content.split('\n');
      let html = '';
      
      for (let line of lines) {
        if (!line.trim()) {
          html += '<div class="hw-empty-line"></div>';
          continue;
        }
        
        // 标题处理 (## 和 ###) - 允许不加空格
        let match;
        if ((match = line.match(/^###\s?(.*)$/))) {
          const text = this.processInlineStyles(match[1]);
          html += `<div class="hw-h3">${text}</div>`;
          continue;
        }
        if ((match = line.match(/^##\s?(.*)$/))) {
          const text = this.processInlineStyles(match[1]);
          html += `<div class="hw-h2">${text}</div>`;
          continue;
        }
        
        // 作业本格式识别 (📖 开头或包含 | 分隔符的格式)
        if (line.includes('📖') || (line.includes('|') && !line.startsWith('##'))) {
          const formatted = this.formatNotebookLine(line);
          if (formatted) {
            html += formatted;
            continue;
          }
        }
        
        // 列表处理 (- 和 数字.) - 允许不加空格
        if ((match = line.match(/^-\s?(.*)$/))) {
          const text = this.processInlineStyles(match[1]);
          html += `<div class="hw-list-item"><span class="hw-bullet">•</span>${text}</div>`;
          continue;
        }
        if ((match = line.match(/^(\d+)\.\s?(.*)$/))) {
          const text = this.processInlineStyles(match[2]);
          html += `<div class="hw-list-item hw-ordered"><span class="hw-number">${match[1]}</span>${text}</div>`;
          continue;
        }
        
        // 普通行
        const text = this.processInlineStyles(line);
        html += `<div class="hw-line">${text}</div>`;
      }
      
      return html;
    },
    formatNotebookLine(line) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length < 2) return null;
      
      let html = '<div class="hw-notebook-item">';
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isNotebook = part.includes('📖');
        const isPage = /^第?\d+页?$/.test(part) || /^P\d+$/.test(part);
        const isQuestion = /^第?\d+[-,\d()题]*$/.test(part);
        
        if (isNotebook) {
          html += `<span class="hw-notebook-name">${this.processInlineStyles(part)}</span>`;
        } else if (isPage) {
          html += `<span class="hw-notebook-page">${this.processInlineStyles(part)}</span>`;
        } else if (isQuestion) {
          html += `<span class="hw-notebook-question">${this.processInlineStyles(part)}</span>`;
        } else {
          html += `<span class="hw-notebook-desc">${this.processInlineStyles(part)}</span>`;
        }
        
        if (i < parts.length - 1) {
          html += '<span class="hw-notebook-sep">|</span>';
        }
      }
      
      html += '</div>';
      return html;
    },
    processInlineStyles(text) {
      // 先转义 HTML 特殊字符，防止 XSS
      text = this.escapeHtml(text);
      // 再处理粗斜体 ***text***
      text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
      // 再处理粗体 **text**
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return text;
    },
    handleMouseMove(e) {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--x", `${x}%`);
      card.style.setProperty("--y", `${y}%`);
    },
    handleTouchMove(e) {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = ((touch.clientX - rect.left) / rect.width) * 100;
        const y = ((touch.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--x", `${x}%`);
        card.style.setProperty("--y", `${y}%`);
      }
    },
  },
};
</script>

<style scoped>
.cursor-not-allowed {
  cursor: not-allowed !important;
}

.cursor-pointer {
  cursor: pointer;
}

.v-card.cursor-not-allowed:hover {
  transform: none !important;
}

.homework-content {
  font-size: inherit;
  line-height: var(--line-height-body);
}

.homework-content :deep(.hw-line) {
  padding: var(--space-compat-2px) 0;
}

.homework-content :deep(.hw-empty-line) {
  height: 8px;
}

.homework-content :deep(.hw-h2) {
  font-size: 1.2em;
  font-weight: bold;
  margin: var(--space-2) 0 var(--space-1) 0;
  padding-bottom: 2px;
  border-bottom: 1px solid rgba(var(--v-border-color, var(--v-theme-on-surface)), 0.15);
}

.homework-content :deep(.hw-h3) {
  font-size: 1.1em;
  font-weight: bold;
  margin: var(--space-compat-6px) 0 var(--space-compat-2px) 0;
}

.homework-content :deep(.hw-list-item) {
  padding: var(--space-compat-2px) 0 var(--space-compat-2px) var(--space-1);
  display: flex;
  align-items: flex-start;
}

.homework-content :deep(.hw-bullet) {
  margin-right: 8px;
  color: rgb(var(--v-theme-primary));
  font-weight: bold;
}

.homework-content :deep(.hw-number) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  margin-right: 8px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-weight: bold;
  font-size: 12px;
  border-radius: var(--radius-circle);
}

.homework-content :deep(strong) {
  font-weight: bold;
}

.homework-content :deep(strong em),
.homework-content :deep(em strong) {
  font-style: italic;
  font-weight: bold;
}

.homework-content :deep(.hw-notebook-item) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-compat-6px) var(--space-2);
  margin: var(--space-1) 0;
  background: rgba(var(--v-theme-primary), 0.06);
  border-radius: var(--radius-sm);
  border-left: 3px solid rgb(var(--v-theme-primary));
}

.homework-content :deep(.hw-notebook-name) {
  font-weight: var(--font-weight-label);
  color: rgb(var(--v-theme-primary));
}

.homework-content :deep(.hw-notebook-page) {
  background: rgba(var(--v-theme-info), 0.15);
  color: rgb(var(--v-theme-info));
  padding: var(--space-compat-2px) var(--space-2);
  border-radius: var(--radius-xs);
  font-size: 0.9em;
  font-weight: var(--font-weight-emphasis);
}

.homework-content :deep(.hw-notebook-question) {
  background: rgba(var(--v-theme-success), 0.15);
  color: rgb(var(--v-theme-success));
  padding: var(--space-compat-2px) var(--space-2);
  border-radius: var(--radius-xs);
  font-size: 0.9em;
  font-weight: var(--font-weight-emphasis);
}

.homework-content :deep(.hw-notebook-desc) {
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.9em;
}

.homework-content :deep(.hw-notebook-sep) {
  color: rgba(var(--v-theme-on-surface), 0.3);
  font-weight: var(--font-weight-light);
}

/* 空科目 chip 在深色模式下使用高不透明度实底语义色背景，
   避免半透明色块与纯黑页面背景混为一体而难以辨识。不影响 on-surface 文字。 */
:deep(.empty-subject-chip.v-chip--variant-tonal.v-theme--dark) {
  background-color: rgba(var(--v-theme-primary), 0.98) !important;
}
</style>
