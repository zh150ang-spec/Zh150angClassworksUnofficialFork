# 创建新的作业编辑对话框组件
<template>
  <v-dialog
    v-model="dialogVisible"
    :fullscreen="isMobile"
    max-width="900"
    width="auto"
  >
    <v-card border>
      <v-card-title class="d-flex align-center">
        {{ title }}
        <v-spacer />
        <v-btn
          :icon="ICON.CLOSE"
          variant="text"
          @click="handleClose"
        />
      </v-card-title>
      <v-card-subtitle>
        {{ autoSave ? autoSavePromptText : manualSavePromptText }}
      </v-card-subtitle>
      <v-card-text>
        <div class="d-flex">
          <div class="flex-grow-1">
            <!-- Markdown Toolbar -->
            <div class="md-toolbar mb-2">
              <v-btn
                class="md-tool-btn notebook-btn"
                color="primary"
                size="small"
                variant="flat"
                @click="showNotebookDialog = true"
              >
                <v-icon
                  class="mr-1"
                  size="small"
                  :icon="ICON.BOOK_NOTEBOOK"
                />
                作业本
                <v-chip
                  class="ml-1"
                  color="warning"
                  size="x-small"
                  variant="flat"
                >
                  技术预览
                </v-chip>
              </v-btn>
              <v-divider
                class="mx-2"
                vertical
              />
              <v-btn
                v-for="tool in mdTools"
                :key="tool.name"
                :title="tool.tooltip"
                class="md-tool-btn"
                size="small"
                variant="text"
                density="comfortable"
                @click="insertMdSyntax(tool)"
              >
                {{ tool.label }}
              </v-btn>
            </div>

            <v-textarea
              ref="inputRef"
              v-model="content"
              auto-grow
              placeholder="使用换行表示分条"
              rows="5"
              :width="isMobile ? '100%' : '480'"
              @click="updateCurrentLine"
              @keyup="updateCurrentLine"
            />

            <!-- Template Buttons Section -->
            <div
              v-if="templateData"
              class="mt-4"
            >
              <div v-if="hasTemplates">
                <div class="template-books">
                  <!-- Subject specific books -->
                  <template v-if="subjectBooks">
                    <div
                      v-for="(pages, book) in subjectBooks"
                      :key="book"
                      class="button-group"
                    >
                      <v-chip
                        :color="isBookSelected(book) ? 'success' : 'default'"
                        :variant="isBookSelected(book) ? 'elevated' : 'flat'"
                        class="ma-1 book-chip"
                        @click="handleBookClick(book)"
                      >
                        {{ book }}
                      </v-chip>

                      <!-- Show pages only if book is selected -->
                      <div
                        v-if="isBookSelected(book)"
                        class="pages-container mt-2"
                      >
                        <v-chip
                          v-for="page in pages"
                          :key="page"
                          :color="isPageSelected(book, page) ? 'info' : 'default'"
                          :variant="isPageSelected(book, page) ? 'elevated' : 'flat'"
                          class="ma-1"
                          @click="handlePageClick(book, page)"
                        >
                          {{ page }}
                        </v-chip>
                      </div>
                    </div>
                  </template>

                  <!-- Common books -->
                  <template v-if="commonBooks">
                    <div
                      v-for="(pages, book) in commonBooks"
                      :key="book"
                      class="button-group"
                    >
                      <v-chip
                        :color="isBookSelected(book) ? 'success' : 'default'"
                        :variant="isBookSelected(book) ? 'elevated' : 'flat'"
                        class="ma-1 book-chip"
                        @click="handleBookClick(book)"
                      >
                        {{ book }}
                      </v-chip>

                      <!-- Show pages only if book is selected -->
                      <div
                        v-if="isBookSelected(book)"
                        class="pages-container mt-2"
                      >
                        <v-chip
                          v-for="page in pages"
                          :key="page"
                          :color="isPageSelected(book, page) ? 'info' : 'default'"
                          :variant="isPageSelected(book, page) ? 'elevated' : 'flat'"
                          class="ma-1"
                          @click="handlePageClick(book, page)"
                        >
                          {{ page }}
                        </v-chip>
                      </div>
                    </div>
                  </template>
                </div>

                <!-- Actions -->
                <div
                  v-if="templateData.actions?.length"
                  class="actions-group"
                >
                  <v-chip
                    v-for="action in templateData.actions"
                    :key="action"
                    class="ma-1"
                    color="primary"
                    variant="flat"
                    @click="insertTemplate(action)"
                  >
                    {{ action }}
                  </v-chip>
                </div>
              </div>
              <div
                v-else
                class="text-center text-body-medium text-disabled mt-2"
              >
                暂无可用的模板
              </div>
            </div>
          </div>

          <!-- Quick Tools Section -->
          <div
            v-if="showQuickTools && !isMobile"
            class="quick-tools ml-4"
            style="min-width: 180px;"
          >
            <!-- Numeric Keypad -->
            <div class="numeric-keypad mb-4">
              <div class="keypad-row">
                <v-btn
                  v-for="n in 3"
                  :key="n"
                  class="keypad-btn"
                  size="small"
                  variant="tonal"
                  @click="insertAtCursor(String(n))"
                >
                  {{ n }}
                </v-btn>
              </div>
              <div class="keypad-row">
                <v-btn
                  v-for="n in 3"
                  :key="n"
                  class="keypad-btn"
                  size="small"
                  variant="tonal"
                  @click="insertAtCursor(String(n + 3))"
                >
                  {{ n + 3 }}
                </v-btn>
              </div>
              <div class="keypad-row">
                <v-btn
                  v-for="n in 3"
                  :key="n"
                  class="keypad-btn"
                  size="small"
                  variant="tonal"
                  @click="insertAtCursor(String(n + 6))"
                >
                  {{ n + 6 }}
                </v-btn>
              </div>
              <div class="keypad-row">
                <v-btn
                  class="keypad-btn"
                  size="small"
                  variant="tonal"
                  @click="insertAtCursor('-')"
                >
                  -
                </v-btn>
                <v-btn
                  class="keypad-btn"
                  size="small"
                  variant="tonal"
                  @click="insertAtCursor('0')"
                >
                  0
                </v-btn>
                <v-btn
                  class="keypad-btn"
                  color="error"
                  size="small"
                  variant="tonal"
                  @click="deleteLastChar"
                >
                  ←
                </v-btn>
              </div>
              <div class="keypad-row">
                <v-btn
                  class="keypad-btn space-btn"
                  size="small"
                  variant="tonal"
                  @click="insertAtCursor(' ')"
                >
                  空格
                </v-btn>
                <v-btn
                  class="keypad-btn space-btn"
                  size="small"
                  variant="tonal"
                  @click="insertAtCursor('\n')"
                >
                  换行
                </v-btn>
              </div>
            </div>

            <div class="d-flex flex-wrap gap-1">
              <v-btn
                v-for="text in quickTexts"
                :key="text"
                size="small"
                variant="flat"
                @click="insertAtCursor(text)"
              >
                {{ text }}
              </v-btn>
            </div>
          </div>
        </div>
      </v-card-text>

      <!-- 非今日编辑警告 -->
      <v-alert
        v-if="isEditingPastData"
        type="warning"
        variant="tonal"
        class="mx-4 mb-4"
        border="start"
        border-color="warning"
        prominent
      >
        <template #prepend />
        <div class="d-flex flex-column">
          <div class="text-headline-small mb-1">
            编辑历史作业
          </div>
          <div class="text-body-medium">
            {{ new Date(currentDateString.slice(0,4), currentDateString.slice(4,6)-1, currentDateString.slice(6,8)).toLocaleDateString() }} 的作业内容
          </div>
        </div>
      </v-alert>

      <div class="text-center text-body-medium text-disabled mb-5">
        关闭后自动保存更改
      </div>
    </v-card>
  </v-dialog>

  <NotebookHomeworkDialog
    v-model="showNotebookDialog"
    :subject="subject"
    @insert="handleNotebookInsert"
  />
</template>

<script>
import { ICON } from '@/utils/icons'
import dataProvider from "@/utils/dataProvider";
import {getSetting} from "@/utils/settings";
import NotebookHomeworkDialog from "@/components/NotebookHomeworkDialog.vue";
import { useDisplay } from "vuetify";

export default {
  name: "HomeworkEditDialog",
  components: {
    NotebookHomeworkDialog
  },
  props: {
    modelValue: {
      type: Boolean,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    initialContent: {
      type: String,
      default: ""
    },
    autoSave: {
      type: Boolean,
      default: false
    },
    isEditingPastData: {
      type: Boolean,
      default: false
    },
    currentDateString: {
      type: String,
      default: ""
    }
  },
  emits: ["update:modelValue", "save"],
  setup() {
    const { mobile } = useDisplay();
    return { mobile, ICON };
  },
  data() {
    return {
      content: "",
      templateData: null,
      currentLine: "",
      currentLineStart: 0,
      currentLineEnd: 0,
      showNotebookDialog: false,
      quickTexts: ["课", "题", "例", "变", "T", "P"],
      mdTools: [
        { name: 'bold', label: '粗体', tooltip: '粗体 (Ctrl+B)', prefix: '**', suffix: '**', placeholder: '粗体文字' },
        { name: 'boldItalic', label: '粗斜', tooltip: '粗斜体', prefix: '***', suffix: '***', placeholder: '粗斜文字' },
        { name: 'h2', label: '大标题', tooltip: '二级标题', linePrefix: '## ' },
        { name: 'h3', label: '小标题', tooltip: '三级标题', linePrefix: '### ' },
        { name: 'ul', label: '列表', tooltip: '无序列表', linePrefix: '- ' },
        { name: 'ol', label: '编号', tooltip: '有序列表（自动递增）', linePrefix: '1. ' }
      ]
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
    dialogVisible: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit("update:modelValue", value);
      }
    },
    subject() {
      // 标题直接就是科目名称
      return this.title;
    },
    hasTemplates() {
      return !!(
        (this.templateData?.actions?.length) ||
        this.subjectBooks ||
        this.commonBooks
      );
    },
    subjectBooks() {
      if (!this.subject || !this.templateData?.subjects?.[this.subject]?.books) {
        return null;
      }
      return this.templateData.subjects[this.subject].books;
    },
    commonBooks() {
      if (!this.templateData?.commonSubject?.books) {
        return null;
      }
      return this.templateData.commonSubject.books;
    },
    showQuickTools() {
      return getSetting("display.showQuickTools");
    },
    autoSavePromptText() {
      return getSetting("edit.autoSavePromptText");
    },
    manualSavePromptText() {
      return getSetting("edit.manualSavePromptText");
    }
  },
  watch: {
    async modelValue(newValue) {
      if (newValue) {
        // 当对话框打开时，重置内容为初始内容
        this.content = this.initialContent;
        // 加载模板数据
        try {
          this.templateData = await dataProvider.loadData("classworks-config-homework-template");
        } catch (error) {
          console.error("Failed to load homework templates:", error);
          this.templateData = null;
        }
        this.$nextTick(() => {
          if (this.$refs.inputRef) {
            this.$refs.inputRef.focus();
            this.updateCurrentLine();
          }
        });
      }
    }
  },
  mounted() {
    document.addEventListener('keydown', this.handleKeyDown);
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
  },
  methods: {
    handleKeyDown(e) {
      if (!this.dialogVisible) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          const boldTool = this.mdTools.find(t => t.name === 'bold');
          if (boldTool) this.insertMdSyntax(boldTool);
        }
      }
    },
    handleClose() {
      const trimmedContent = this.content.trim();
      if (trimmedContent !== this.initialContent.trim()) {
        this.$emit("save", trimmedContent);
      }
      this.dialogVisible = false;
    },
    handleNotebookInsert(text) {
      if (!text) return;
      const hasContent = this.content.trim().length > 0;
      this.content = hasContent ? this.content.trim() + '\n' + text : text;
      this.$nextTick(() => {
        if (this.$refs.inputRef) {
          this.$refs.inputRef.focus();
          this.updateCurrentLine();
        }
      });
    },
    // 集中获取 textarea 引用并做判空保护，避免对话框关闭/过渡动画期间访问 $refs.inputRef.$el 时崩溃
    getTextarea() {
      const inputRef = this.$refs.inputRef;
      if (!inputRef || !inputRef.$el) return null;
      return inputRef.$el.querySelector('textarea');
    },
    updateCurrentLine() {
      const textarea = this.getTextarea();
      if (!textarea) return;
      const cursorPosition = textarea.selectionStart;
      const content = this.content;

      let currentPos = 0;
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length;
        const totalLength = currentPos + lineLength;

        if (cursorPosition <= totalLength || i === lines.length - 1) {
          this.currentLine = lines[i];
          this.currentLineStart = currentPos;
          this.currentLineEnd = totalLength;
          break;
        }

        currentPos = totalLength + 1; // +1 for the newline character
      }

      // 如果光标在文本末尾或内容为空
      if (!this.currentLine) {
        this.currentLine = "";
        this.currentLineStart = content.length;
        this.currentLineEnd = content.length;
      }
    },
    isBookSelected(book) {
      return this.currentLine.includes(book);
    },
    isPageSelected(book, page) {
      return this.currentLine.includes(page);
    },
    handleBookClick(book) {
      if (this.isBookSelected(book)) {
        // 删除包含该作业本的整行
        const lines = this.content.split('\n');
        const lineToDelete = lines.findIndex(line => line.includes(book));
        if (lineToDelete !== -1) {
          lines.splice(lineToDelete, 1);
          this.content = lines.join('\n');
        }
      } else {
        // 在末尾插入新行
        const hasContent = this.content.trim().length > 0;
        this.content = (hasContent ? this.content.trim() + '\n' : '') + book;
      }
      this.$nextTick(() => {
        const textarea = this.getTextarea();
        if (!textarea) return;
        textarea.focus();

        if (!this.isBookSelected(book)) {
          // 找到新插入的行的末尾位置
          const lines = this.content.split('\n');
          let position = 0;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(book)) {
              position += lines[i].length;
              break;
            }
            position += lines[i].length + 1; // +1 for newline
          }
          textarea.setSelectionRange(position, position);
        }
        this.updateCurrentLine();
      });
    },
    handlePageClick(book, page) {
      if (this.isPageSelected(book, page)) {
        // 删除当前行最后一处匹配的页码
        const start = this.currentLineStart;
        const end = this.currentLineEnd;
        const currentLineContent = this.content.slice(start, end);
        const lastIndex = currentLineContent.lastIndexOf(page);
        if (lastIndex !== -1) {
          const newLineContent =
            currentLineContent.slice(0, lastIndex) +
            currentLineContent.slice(lastIndex + page.length);
          this.content = this.content.slice(0, start) +
            newLineContent.trim() +
            this.content.slice(end);
        }
      } else {
        // 在当前行末尾插入
        const start = this.currentLineStart;
        const end = this.currentLineEnd;
        const currentLineContent = this.content.slice(start, end);
        this.content = this.content.slice(0, start) +
          currentLineContent.trim() +
          (currentLineContent.trim().length > 0 ? ' ' : '') +
          page +
          this.content.slice(end);
      }
      this.$nextTick(() => {
        const textarea = this.getTextarea();
        if (!textarea) return;
        textarea.focus();

        // 将光标移动到当前行末尾
        const lines = this.content.split('\n');
        let position = 0;
        for (let i = 0; i < lines.length; i++) {
          position += lines[i].length;
          if (position > this.currentLineStart) {
            break;
          }
          position += 1; // +1 for newline
        }
        textarea.setSelectionRange(position, position);
        this.updateCurrentLine();
      });
    },
    insertTemplate(text) {
      const textarea = this.getTextarea();
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // 在快捷操作前添加空格
      const needsSpace = start > 0 && this.content[start - 1] !== ' ' && this.content[start - 1] !== '\n';
      this.content = this.content.slice(0, start) + (needsSpace ? ' ' : '') + text + this.content.slice(end);

      this.$nextTick(() => {
        textarea.focus();
        const newPosition = start + text.length + (needsSpace ? 1 : 0);
        textarea.setSelectionRange(newPosition, newPosition);
        this.updateCurrentLine();
      });
    },
    insertAtCursor(text) {
      if (!text) return;

      const textarea = this.getTextarea();
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      this.content = this.content.slice(0, start) + text + this.content.slice(end);

      this.$nextTick(() => {
        textarea.focus();
        const newPosition = start + text.length;
        textarea.setSelectionRange(newPosition, newPosition);
        this.updateCurrentLine();
      });
    },
    deleteLastChar() {
      const textarea = this.getTextarea();
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (start === end) {
        // 如果没有选中文本，删除光标前一个字符
        if (start > 0) {
          this.content = this.content.slice(0, start - 1) + this.content.slice(start);
          this.$nextTick(() => {
            textarea.focus();
            textarea.setSelectionRange(start - 1, start - 1);
            this.updateCurrentLine();
          });
        }
      } else {
        // 如果有选中文本，删除选中部分
        this.content = this.content.slice(0, start) + this.content.slice(end);
        this.$nextTick(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start);
          this.updateCurrentLine();
        });
      }
    },
    insertMdSyntax(tool) {
      const textarea = this.getTextarea();
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = this.content.slice(start, end);

      if (tool.prefix && tool.suffix) {
        // 行内格式：粗体、粗斜体
        const text = selectedText || tool.placeholder;
        const before = this.content.slice(0, start);
        const after = this.content.slice(end);
        this.content = before + tool.prefix + text + tool.suffix + after;

        this.$nextTick(() => {
          textarea.focus();
          const newPos = start + tool.prefix.length + text.length;
          if (!selectedText) {
            textarea.setSelectionRange(start + tool.prefix.length, newPos);
          } else {
            textarea.setSelectionRange(newPos + tool.suffix.length, newPos + tool.suffix.length);
          }
          this.updateCurrentLine();
        });
      } else if (tool.linePrefix) {
        // 行级格式：标题、列表
        const lineStart = this.currentLineStart;
        const lineEnd = this.currentLineEnd;
        const currentLineContent = this.content.slice(lineStart, lineEnd);

        // 检测当前行的前缀
        const prefixMatch = currentLineContent.match(/^(##\s?|###\s?|-\s?|\d+\.\s?)/);
        
        if (tool.name === 'ol') {
          // 编号列表特殊处理
          if (prefixMatch && /^\d+\.\s?/.test(prefixMatch[1])) {
            // 已有编号前缀，移除它
            const newLineContent = currentLineContent.slice(prefixMatch[1].length);
            this.content = this.content.slice(0, lineStart) + newLineContent + this.content.slice(lineEnd);
          } else {
            // 智能检测上一个编号
            let nextNum = this.getNextOrderedNumber(lineStart);
            const newPrefix = nextNum + '. ';
            let newLineContent;
            if (prefixMatch) {
              newLineContent = newPrefix + currentLineContent.slice(prefixMatch[1].length);
            } else {
              newLineContent = newPrefix + currentLineContent;
            }
            this.content = this.content.slice(0, lineStart) + newLineContent + this.content.slice(lineEnd);
          }
        } else {
          // 其他格式：标题、无序列表
          const currentHasSamePrefix = prefixMatch && (
            (tool.name === 'h2' && /^##\s?/.test(prefixMatch[1])) ||
            (tool.name === 'h3' && /^###\s?/.test(prefixMatch[1])) ||
            (tool.name === 'ul' && /^-\s?/.test(prefixMatch[1]))
          );
          
          if (currentHasSamePrefix) {
            // 已有相同前缀，移除它
            const newLineContent = currentLineContent.slice(prefixMatch[1].length);
            this.content = this.content.slice(0, lineStart) + newLineContent + this.content.slice(lineEnd);
          } else {
            let newLineContent;
            if (prefixMatch) {
              newLineContent = tool.linePrefix + currentLineContent.slice(prefixMatch[1].length);
            } else {
              newLineContent = tool.linePrefix + currentLineContent;
            }
            this.content = this.content.slice(0, lineStart) + newLineContent + this.content.slice(lineEnd);
          }
        }

        this.$nextTick(() => {
          textarea.focus();
          this.updateCurrentLine();
        });
      }
    },
    getNextOrderedNumber(cursorPos) {
      // 从光标位置向前查找最近的编号项
      const lines = this.content.split('\n');
      let currentPos = 0;
      let lastNumber = 0;
      let foundInBlock = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineStart = currentPos;
        const lineEnd = currentPos + line.length;
        
        // 检查是否是编号行
        const match = line.match(/^(\d+)\.\s/);
        if (match) {
          lastNumber = parseInt(match[1]);
          foundInBlock = true;
        } else if (line.trim() && !line.match(/^(##\s?|###\s?|-\s?)/)) {
          // 非空行且不是其他格式，可能是段落结束
          if (foundInBlock && lineStart >= cursorPos) {
            break;
          }
        }
        
        // 如果已经过了光标位置
        if (lineEnd >= cursorPos) {
          break;
        }
        
        currentPos = lineEnd + 1; // +1 for newline
      }
      
      return lastNumber + 1;
    }
  }
};
</script>

<style scoped>
.md-toolbar {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border: 1px solid rgba(var(--v-border-color, var(--v-theme-on-surface)), 0.12);
  border-radius: var(--radius-sm);
  background-color: rgba(var(--v-theme-on-surface), 0.02);
}

.md-tool-btn {
  min-width: auto !important;
  padding: var(--space-1) var(--space-compat-10px)!important;
  font-size: 13px;
  border-radius: var(--radius-xs);
}

.md-tool-btn:hover {
  background-color: rgba(var(--v-theme-primary), 0.1);
}

.notebook-btn {
  font-weight: var(--font-weight-emphasis);
}

.template-books {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-compat-6px) var(--space-compat-10px);
  border: 1px solid rgba(var(--v-border-color, var(--v-theme-on-surface)), 0.12);
  border-radius: var(--radius-sm);
  background-color: rgba(var(--v-theme-on-surface), 0.02);
}

.book-chip {
}

.pages-container {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-left: 8px;
  padding-left: 8px;
  border-left: 2px solid rgba(var(--v-theme-primary), 0.3);
}

.actions-group {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-compat-6px) var(--space-compat-10px);
  border: 1px solid rgba(var(--v-border-color, var(--v-theme-on-surface)), 0.12);
  border-radius: var(--radius-sm);
  background-color: rgba(var(--v-theme-primary), 0.05);
  margin-top: 8px;
}

.group-label {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-right: 8px;
  white-space: nowrap;
}

:deep(.v-chip) {
  cursor: pointer;
  user-select: none;
}

.quick-tools {
  border-left: 1px solid var(--color-border);
  padding-left: 16px;
}

.gap-1 {
  gap: var(--space-1);
}

.numeric-keypad {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
  border: 1px solid rgba(var(--v-border-color, var(--v-theme-on-surface)), 0.12);
   border-radius: var(--radius-xs);
}

.keypad-row {
  display: flex;
  gap: var(--space-1);
}

.keypad-btn {
  flex: 1;
  min-width: 36px !important;
}

.space-btn {
  width: 100% !important;
}
</style>
