<template>
  <v-dialog
    v-model="dialogVisible"
    :fullscreen="isMobile"
    max-width="600"
    width="auto"
  >
    <v-card border>
      <v-card-title class="d-flex align-center">
        <v-btn
          v-if="isMobile"
          :icon="ICON.ARROW_LEFT"
          variant="text"
          class="mr-2"
          @click="handleClose"
        />
        <v-icon
          v-else
          class="mr-2"
          color="primary"
        >
          mdi-notebook
        </v-icon>
        <span class="text-truncate">作业本作业</span>
        <v-spacer />
        <v-chip
          color="primary"
          variant="flat"
          size="small"
        >
          第 {{ currentTimes }} 次
        </v-chip>
        <v-btn
          v-if="!isMobile"
          :icon="ICON.CLOSE"
          variant="text"
          class="ml-2"
          @click="handleClose"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pt-4">
        <v-form
          ref="formRef"
          @submit.prevent="addHomework"
        >
          <v-row density="compact">
            <v-col cols="12">
              <v-select
                v-model="form.notebook"
                :items="availableNotebooks"
                density="comfortable"
                item-title="name"
                item-value="name"
                label="作业本"
                variant="outlined"
              >
                <template #append-item>
                  <v-divider class="mb-2" />
                  <v-list-item @click="showCustomNotebook = true">
                    <v-list-item-title>
                      <v-icon
                        class="mr-1"
                        size="small"
                      >
                        mdi-plus
                      </v-icon>
                      自定义...
                    </v-list-item-title>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>

            <v-col cols="12">
              <v-text-field
                ref="contentInput"
                v-model="form.content"
                density="comfortable"
                label="内容"
                placeholder="如：第5课读读写写、3A、第3页注释"
                variant="outlined"
              />
            </v-col>

            <v-col
              v-if="hasTemplates"
              cols="12"
            >
              <div class="template-section">
                <div class="template-books">
                  <template v-if="subjectBooks">
                    <div
                      v-for="(pages, book) in subjectBooks"
                      :key="book"
                      class="button-group"
                    >
                      <v-chip
                        :color="form.content.includes(book) ? 'success' : 'default'"
                        :variant="form.content.includes(book) ? 'elevated' : 'flat'"
                        class="ma-1"
                        @click="insertToContent(book)"
                      >
                        {{ book }}
                      </v-chip>
                      <div
                        v-if="form.content.includes(book)"
                        class="pages-container mt-1"
                      >
                        <v-chip
                          v-for="page in pages"
                          :key="page"
                          :color="form.content.includes(page) ? 'info' : 'default'"
                          :variant="form.content.includes(page) ? 'elevated' : 'flat'"
                          class="ma-1"
                          size="small"
                          @click="insertToContent(page)"
                        >
                          {{ page }}
                        </v-chip>
                      </div>
                    </div>
                  </template>

                  <template v-if="commonBooks">
                    <div
                      v-for="(pages, book) in commonBooks"
                      :key="book"
                      class="button-group"
                    >
                      <v-chip
                        :color="form.content.includes(book) ? 'success' : 'default'"
                        :variant="form.content.includes(book) ? 'elevated' : 'flat'"
                        class="ma-1"
                        @click="insertToContent(book)"
                      >
                        {{ book }}
                      </v-chip>
                      <div
                        v-if="form.content.includes(book)"
                        class="pages-container mt-1"
                      >
                        <v-chip
                          v-for="page in pages"
                          :key="page"
                          :color="form.content.includes(page) ? 'info' : 'default'"
                          :variant="form.content.includes(page) ? 'elevated' : 'flat'"
                          class="ma-1"
                          size="small"
                          @click="insertToContent(page)"
                        >
                          {{ page }}
                        </v-chip>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </v-col>

            <v-col cols="12">
              <div class="optional-sections">
                <div class="optional-section">
                  <div class="optional-section-header">
                    <span>页码（可选）</span>
                    <v-btn-toggle
                      v-model="pageMode"
                      color="primary"
                      density="compact"
                      mandatory
                      class="ml-2"
                    >
                      <v-btn
                        size="x-small"
                        value="single"
                      >
                        单页
                      </v-btn>
                      <v-btn
                        size="x-small"
                        value="range"
                      >
                        范围
                      </v-btn>
                    </v-btn-toggle>
                  </div>
                  
                  <div
                    v-if="pageMode === 'single'"
                    class="input-row"
                  >
                    <div class="input-label">
                      第
                    </div>
                    <v-btn
                      :disabled="!form.pageStart || form.pageStart <= 1"
                      density="comfortable"
                      :icon="ICON.MINUS"
                      size="small"
                      variant="tonal"
                      @click="form.pageStart = Math.max(1, (form.pageStart || 1) - 1)"
                    />
                    <v-text-field
                      v-model.number="form.pageStart"
                      class="input-field"
                      density="comfortable"
                      hide-details
                      min="1"
                      type="number"
                      variant="outlined"
                    />
                    <v-btn
                      density="comfortable"
                      :icon="ICON.PLUS"
                      size="small"
                      variant="tonal"
                      @click="form.pageStart = (form.pageStart || 0) + 1"
                    />
                    <div class="input-label">
                      页
                    </div>
                  </div>
                  
                  <div
                    v-else-if="pageMode === 'range'"
                    class="input-row"
                  >
                    <div class="input-label">
                      第
                    </div>
                    <v-btn
                      :disabled="!form.pageStart || form.pageStart <= 1"
                      density="comfortable"
                      :icon="ICON.MINUS"
                      size="small"
                      variant="tonal"
                      @click="form.pageStart = Math.max(1, (form.pageStart || 1) - 1)"
                    />
                    <v-text-field
                      v-model.number="form.pageStart"
                      class="input-field"
                      density="comfortable"
                      hide-details
                      min="1"
                      type="number"
                      variant="outlined"
                    />
                    <v-btn
                      density="comfortable"
                      :icon="ICON.PLUS"
                      size="small"
                      variant="tonal"
                      @click="form.pageStart = (form.pageStart || 0) + 1"
                    />
                    <div class="input-label">
                      至
                    </div>
                    <v-btn
                      :disabled="!form.pageEnd || form.pageEnd <= (form.pageStart || 1)"
                      density="comfortable"
                      :icon="ICON.MINUS"
                      size="small"
                      variant="tonal"
                      @click="form.pageEnd = Math.max(form.pageStart || 1, (form.pageEnd || 1) - 1)"
                    />
                    <v-text-field
                      v-model.number="form.pageEnd"
                      class="input-field"
                      density="comfortable"
                      hide-details
                      min="1"
                      type="number"
                      variant="outlined"
                    />
                    <v-btn
                      density="comfortable"
                      :icon="ICON.PLUS"
                      size="small"
                      variant="tonal"
                      @click="form.pageEnd = (form.pageEnd || form.pageStart || 1) + 1"
                    />
                    <div class="input-label">
                      页
                    </div>
                  </div>
                  
                  <div class="numpad">
                    <div class="numpad-row">
                      <v-btn
                        v-for="n in [1,2,3]"
                        :key="n"
                        class="numpad-btn"
                        density="comfortable"
                        size="small"
                        variant="tonal"
                        @click="inputPageNumber(n)"
                      >
                        {{ n }}
                      </v-btn>
                    </div>
                    <div class="numpad-row">
                      <v-btn
                        v-for="n in [4,5,6]"
                        :key="n"
                        class="numpad-btn"
                        density="comfortable"
                        size="small"
                        variant="tonal"
                        @click="inputPageNumber(n)"
                      >
                        {{ n }}
                      </v-btn>
                    </div>
                    <div class="numpad-row">
                      <v-btn
                        v-for="n in [7,8,9]"
                        :key="n"
                        class="numpad-btn"
                        density="comfortable"
                        size="small"
                        variant="tonal"
                        @click="inputPageNumber(n)"
                      >
                        {{ n }}
                      </v-btn>
                    </div>
                    <div class="numpad-row">
                      <v-btn
                        class="numpad-btn"
                        density="comfortable"
                        size="small"
                        variant="tonal"
                        @click="backspacePage"
                      >
                        ←
                      </v-btn>
                      <v-btn
                        class="numpad-btn"
                        density="comfortable"
                        size="small"
                        variant="tonal"
                        @click="inputPageNumber(0)"
                      >
                        0
                      </v-btn>
                      <v-btn
                        class="numpad-btn"
                        color="error"
                        density="comfortable"
                        size="small"
                        variant="tonal"
                        @click="clearPage"
                      >
                        C
                      </v-btn>
                    </div>
                  </div>
                </div>

                <div class="optional-section">
                  <div class="optional-section-header">
                    <span>题号（可选）</span>
                    <v-btn-toggle
                      v-model="questionMode"
                      color="primary"
                      density="compact"
                      mandatory
                      class="ml-2"
                    >
                      <v-btn
                        size="x-small"
                        value="single"
                      >
                        单题
                      </v-btn>
                      <v-btn
                        size="x-small"
                        value="range"
                      >
                        范围
                      </v-btn>
                      <v-btn
                        size="x-small"
                        value="multi"
                      >
                        多选
                      </v-btn>
                    </v-btn-toggle>
                  </div>
                  
                  <div
                    v-if="questionMode === 'single'"
                    class="input-row"
                  >
                    <div class="input-label">
                      第
                    </div>
                    <v-btn
                      :disabled="!form.questionStart || form.questionStart <= 1"
                      density="comfortable"
                      :icon="ICON.MINUS"
                      size="small"
                      variant="tonal"
                      @click="form.questionStart = Math.max(1, (form.questionStart || 1) - 1)"
                    />
                    <v-text-field
                      v-model.number="form.questionStart"
                      class="input-field"
                      density="comfortable"
                      hide-details
                      min="1"
                      type="number"
                      variant="outlined"
                    />
                    <v-btn
                      density="comfortable"
                      :icon="ICON.PLUS"
                      size="small"
                      variant="tonal"
                      @click="form.questionStart = (form.questionStart || 0) + 1"
                    />
                    <div class="input-label">
                      题
                    </div>
                  </div>
                  
                  <div
                    v-else-if="questionMode === 'range'"
                    class="input-row"
                  >
                    <div class="input-label">
                      第
                    </div>
                    <v-btn
                      :disabled="!form.questionStart || form.questionStart <= 1"
                      density="comfortable"
                      :icon="ICON.MINUS"
                      size="small"
                      variant="tonal"
                      @click="form.questionStart = Math.max(1, (form.questionStart || 1) - 1)"
                    />
                    <v-text-field
                      v-model.number="form.questionStart"
                      class="input-field"
                      density="comfortable"
                      hide-details
                      min="1"
                      type="number"
                      variant="outlined"
                    />
                    <v-btn
                      density="comfortable"
                      :icon="ICON.PLUS"
                      size="small"
                      variant="tonal"
                      @click="form.questionStart = (form.questionStart || 0) + 1"
                    />
                    <div class="input-label">
                      至
                    </div>
                    <v-btn
                      :disabled="!form.questionEnd || form.questionEnd <= (form.questionStart || 1)"
                      density="comfortable"
                      :icon="ICON.MINUS"
                      size="small"
                      variant="tonal"
                      @click="form.questionEnd = Math.max(form.questionStart || 1, (form.questionEnd || 1) - 1)"
                    />
                    <v-text-field
                      v-model.number="form.questionEnd"
                      class="input-field"
                      density="comfortable"
                      hide-details
                      min="1"
                      type="number"
                      variant="outlined"
                    />
                    <v-btn
                      density="comfortable"
                      :icon="ICON.PLUS"
                      size="small"
                      variant="tonal"
                      @click="form.questionEnd = (form.questionEnd || form.questionStart || 1) + 1"
                    />
                    <div class="input-label">
                      题
                    </div>
                  </div>
                  
                  <div
                    v-else-if="questionMode === 'multi'"
                    class="multi-question-section"
                  >
                    <div class="question-grid">
                      <v-btn
                        v-for="n in 20"
                        :key="n"
                        :color="selectedQuestions.includes(n) ? 'primary' : 'default'"
                        :variant="selectedQuestions.includes(n) ? 'elevated' : 'tonal'"
                        class="question-grid-btn"
                        density="comfortable"
                        size="small"
                        @click="toggleQuestion(n)"
                      >
                        {{ n }}
                      </v-btn>
                    </div>
                    <div class="d-flex align-center justify-center mt-2">
                      <v-btn
                        density="comfortable"
                        size="small"
                        variant="tonal"
                        @click="selectedQuestions = []"
                      >
                        清空
                      </v-btn>
                      <span
                        v-if="selectedQuestions.length"
                        class="ml-2 text-body-medium"
                      >已选 {{ selectedQuestions.length }} 题</span>
                    </div>
                  </div>
                  
                  <div
                    v-if="questionMode !== 'multi'"
                    class="numpad"
                  >
                    <div class="numpad-row">
                      <v-btn
                        v-for="n in [1,2,3]"
                        :key="n"
                        class="numpad-btn"
                        density="comfortable"
                        size="small"
                        variant="tonal"
                        @click="inputQuestionNumber(n)"
                      >
                        {{ n }}
                      </v-btn>
                    </div>
                    <div class="numpad-row">
                      <v-btn
                        v-for="n in [4,5,6]"
                        :key="n"
                        class="numpad-btn"
                        density="comfortable"
                        size="small"
                        variant="tonal"
                        @click="inputQuestionNumber(n)"
                      >
                        {{ n }}
                      </v-btn>
                    </div>
                    <div class="numpad-row">
                      <v-btn
                        v-for="n in [7,8,9]"
                        :key="n"
                        class="numpad-btn"
                        density="comfortable"
                        size="small"
                        variant="tonal"
                        @click="inputQuestionNumber(n)"
                      >
                        {{ n }}
                      </v-btn>
                    </div>
                    <div class="numpad-row">
                      <v-btn
                        class="numpad-btn"
                        density="comfortable"
                        size="small"
                        variant="tonal"
                        @click="backspaceQuestion"
                      >
                        ←
                      </v-btn>
                      <v-btn
                        class="numpad-btn"
                        density="comfortable"
                        size="small"
                        variant="tonal"
                        @click="inputQuestionNumber(0)"
                      >
                        0
                      </v-btn>
                      <v-btn
                        class="numpad-btn"
                        color="error"
                        density="comfortable"
                        size="small"
                        variant="tonal"
                        @click="clearQuestion"
                      >
                        C
                      </v-btn>
                    </div>
                  </div>
                </div>

                <div class="optional-section">
                  <div class="optional-section-header">
                    写几遍（可选）
                  </div>
                  <div class="repeat-buttons">
                    <v-btn
                      v-for="n in [1,2,3,5,10]"
                      :key="n"
                      :color="form.repeat === n ? 'primary' : 'default'"
                      :variant="form.repeat === n ? 'elevated' : 'tonal'"
                      class="repeat-btn"
                      density="comfortable"
                      size="default"
                      @click="form.repeat = form.repeat === n ? null : n"
                    >
                      {{ n }}遍
                    </v-btn>
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>

          <div
            v-if="previewText"
            class="preview-box mt-4 pa-3 rounded"
          >
            <div class="text-body-small text-medium-emphasis mb-1">
              预览
            </div>
            <div class="text-body-large">
              {{ previewText }}
            </div>
          </div>

          <div class="d-flex justify-end mt-4">
            <v-btn
              :disabled="!form.content"
              color="primary"
              type="submit"
              variant="elevated"
            >
              <v-icon class="mr-1">
                mdi-plus
              </v-icon>
              添加第 {{ currentTimes }} 次
            </v-btn>
          </div>
        </v-form>

        <v-divider class="my-4" />

        <div class="mb-2 d-flex align-center">
          <span class="text-label-large">已添加</span>
          <v-chip
            v-if="pendingItems.length"
            class="ml-2"
            color="primary"
            size="small"
          >
            {{ pendingItems.length }} 条
          </v-chip>
          <v-spacer />
          <v-btn
            v-if="pendingItems.length"
            color="error"
            size="small"
            variant="text"
            @click="clearPending"
          >
            清空
          </v-btn>
        </div>

        <v-list
          v-if="pendingItems.length"
          border
          density="compact"
          rounded
        >
          <draggable
            v-model="pendingItems"
            item-key="id"
            handle=".drag-handle"
            animation="200"
          >
            <template #item="{ element, index }">
              <v-list-item class="py-2">
                <template #prepend>
                  <v-icon
                    :icon="ICON.DRAG_VERTICAL"
                    class="drag-handle mr-2"
                    color="medium-emphasis"
                    size="small"
                  />
                  <v-chip
                    color="primary"
                    size="small"
                    variant="flat"
                  >
                    第{{ index + 1 }}次
                  </v-chip>
                </template>
                <v-list-item-title class="ml-2">
                  {{ element.text }}
                </v-list-item-title>
                <template #append>
                  <v-btn
                    color="error"
                    :icon="ICON.CLOSE"
                    size="small"
                    variant="text"
                    @click="removePending(index)"
                  />
                </template>
              </v-list-item>
            </template>
          </draggable>
        </v-list>
        <div
          v-else
          class="text-center text-body-medium text-disabled py-4"
        >
          暂无待添加的作业
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="text"
          @click="handleClose"
        >
          取消
        </v-btn>
        <v-btn
          :disabled="!pendingItems.length"
          color="primary"
          variant="elevated"
          @click="confirmAdd"
        >
          确认添加
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog
      v-model="showCustomNotebook"
      max-width="400"
    >
      <v-card>
        <v-card-title>自定义作业本</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="customNotebookName"
            density="comfortable"
            label="作业本名称"
            variant="outlined"
            @keyup.enter="confirmCustomNotebook"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showCustomNotebook = false"
          >
            取消
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            @click="confirmCustomNotebook"
          >
            确定
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script>
import { ICON } from '@/utils/icons'
import { useDisplay } from "vuetify";
import { getSetting } from "@/utils/settings";
import draggable from 'vuedraggable';

export default {
  name: "NotebookHomeworkDialog",
  components: {
    draggable
  },
  props: {
    modelValue: {
      type: Boolean,
      required: true
    },
    subject: {
      type: String,
      default: ""
    }
  },
  emits: ["update:modelValue", "insert"],
  setup() {
    const { mobile } = useDisplay();
    return { mobile, ICON };
  },
  data() {
    return {
      form: {
        notebook: "",
        content: "",
        pageStart: null,
        pageEnd: null,
        questionStart: null,
        questionEnd: null,
        repeat: null
      },
      pageMode: "single",
      questionMode: "single",
      activePageInput: "start",
      activeQuestionInput: "start",
      selectedQuestions: [],
      pendingItems: [],
      showCustomNotebook: false,
      customNotebookName: "",
      notebookConfig: null,
      templateData: null,
      itemIdCounter: 0
    };
  },
  computed: {
    isMobile() {
      const forceDesktopMode = getSetting('display.forceDesktopMode');
      if (forceDesktopMode) return false;
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
    currentTimes() {
      return this.pendingItems.length + 1;
    },
    availableNotebooks() {
      const notebooks = [];
      if (this.notebookConfig?.notebookTemplates?.[this.subject]?.notebooks) {
        notebooks.push(...this.notebookConfig.notebookTemplates[this.subject].notebooks.map(n => ({ name: n })));
      }
      if (!notebooks.length) {
        const defaults = {
          "语文": ["作业本", "作文本"],
          "数学": ["作业本"],
          "英语": ["作业本"],
          "物理": ["作业本"],
          "化学": ["作业本"],
          "生物": ["作业本"],
          "历史": ["作业本"],
          "地理": ["作业本"],
          "政治": ["作业本"]
        };
        const subjectDefaults = defaults[this.subject] || ["作业本"];
        notebooks.push(...subjectDefaults.map(n => ({ name: n })));
      }
      return notebooks;
    },
    hasTemplates() {
      return !!(this.subjectBooks || this.commonBooks);
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
    pageText() {
      if (this.pageMode === 'single' && this.form.pageStart) {
        return `第${this.form.pageStart}页`;
      }
      if (this.pageMode === 'range' && this.form.pageStart && this.form.pageEnd) {
        return `第${this.form.pageStart}-${this.form.pageEnd}页`;
      }
      return '';
    },
    questionText() {
      if (this.questionMode === 'single' && this.form.questionStart) {
        return `第${this.form.questionStart}题`;
      }
      if (this.questionMode === 'range' && this.form.questionStart && this.form.questionEnd) {
        return `第${this.form.questionStart}-${this.form.questionEnd}题`;
      }
      if (this.questionMode === 'multi' && this.selectedQuestions.length) {
        return `第${[...this.selectedQuestions].sort((a,b) => a-b).join(',')}题`;
      }
      return '';
    },
    previewText() {
      if (!this.form.content) return "";
      const parts = [];
      if (this.form.notebook) {
        parts.push(`📖 ${this.form.notebook}`);
      }
      parts.push(this.form.content);
      if (this.pageText) {
        parts.push(this.pageText);
      }
      if (this.questionText) {
        parts.push(this.questionText);
      }
      if (this.form.repeat) {
        parts.push(`写${this.form.repeat}遍`);
      }
      return parts.join(" | ");
    }
  },
  watch: {
    modelValue(newValue) {
      if (newValue) {
        this.loadConfig();
        this.resetForm();
      }
    }
  },
  methods: {
    resetForm() {
      this.form = {
        notebook: this.availableNotebooks[0]?.name || "",
        content: "",
        pageStart: null,
        pageEnd: null,
        questionStart: null,
        questionEnd: null,
        repeat: null
      };
      this.pageMode = "single";
      this.questionMode = "single";
      this.activePageInput = "start";
      this.activeQuestionInput = "start";
    },
    async loadConfig() {
      try {
        const dataProvider = await import("@/utils/dataProvider");
        this.notebookConfig = await dataProvider.default.loadData("classworks-config-homework-template");
        this.templateData = this.notebookConfig;
        if (this.availableNotebooks.length && !this.form.notebook) {
          this.form.notebook = this.availableNotebooks[0].name;
        }
      } catch (error) {
        console.error("Failed to load notebook template config:", error);
        this.notebookConfig = null;
        this.templateData = null;
      }
    },
    insertToContent(text) {
      const hasContent = this.form.content.trim().length > 0;
      this.form.content = this.form.content.trim() + (hasContent ? ' ' : '') + text;
    },
    toggleQuestion(n) {
      const index = this.selectedQuestions.indexOf(n);
      if (index > -1) {
        this.selectedQuestions.splice(index, 1);
      } else {
        this.selectedQuestions.push(n);
      }
    },
    inputPageNumber(n) {
      if (this.pageMode === 'single') {
        this.form.pageStart = (this.form.pageStart || 0) * 10 + n;
      } else {
        if (this.activePageInput === 'start') {
          this.form.pageStart = (this.form.pageStart || 0) * 10 + n;
        } else {
          this.form.pageEnd = (this.form.pageEnd || 0) * 10 + n;
        }
      }
    },
    backspacePage() {
      if (this.pageMode === 'single') {
        this.form.pageStart = Math.floor((this.form.pageStart || 0) / 10);
        if (this.form.pageStart === 0) this.form.pageStart = null;
      } else {
        if (this.activePageInput === 'start') {
          this.form.pageStart = Math.floor((this.form.pageStart || 0) / 10);
          if (this.form.pageStart === 0) this.form.pageStart = null;
        } else {
          this.form.pageEnd = Math.floor((this.form.pageEnd || 0) / 10);
          if (this.form.pageEnd === 0) this.form.pageEnd = null;
        }
      }
    },
    clearPage() {
      if (this.pageMode === 'single') {
        this.form.pageStart = null;
      } else {
        if (this.activePageInput === 'start') {
          this.form.pageStart = null;
        } else {
          this.form.pageEnd = null;
        }
      }
    },
    inputQuestionNumber(n) {
      if (this.questionMode === 'single') {
        this.form.questionStart = (this.form.questionStart || 0) * 10 + n;
      } else {
        if (this.activeQuestionInput === 'start') {
          this.form.questionStart = (this.form.questionStart || 0) * 10 + n;
        } else {
          this.form.questionEnd = (this.form.questionEnd || 0) * 10 + n;
        }
      }
    },
    backspaceQuestion() {
      if (this.questionMode === 'single') {
        this.form.questionStart = Math.floor((this.form.questionStart || 0) / 10);
        if (this.form.questionStart === 0) this.form.questionStart = null;
      } else {
        if (this.activeQuestionInput === 'start') {
          this.form.questionStart = Math.floor((this.form.questionStart || 0) / 10);
          if (this.form.questionStart === 0) this.form.questionStart = null;
        } else {
          this.form.questionEnd = Math.floor((this.form.questionEnd || 0) / 10);
          if (this.form.questionEnd === 0) this.form.questionEnd = null;
        }
      }
    },
    clearQuestion() {
      if (this.questionMode === 'single') {
        this.form.questionStart = null;
      } else {
        if (this.activeQuestionInput === 'start') {
          this.form.questionStart = null;
        } else {
          this.form.questionEnd = null;
        }
      }
    },
    addHomework() {
      if (!this.form.content) return;
      
      this.pendingItems.push({
        id: ++this.itemIdCounter,
        text: this.previewText
      });
      
      this.form.content = "";
      this.form.pageStart = null;
      this.form.pageEnd = null;
      this.form.questionStart = null;
      this.form.questionEnd = null;
      this.form.repeat = null;
    },
    removePending(index) {
      this.pendingItems.splice(index, 1);
    },
    clearPending() {
      this.pendingItems = [];
    },
    confirmAdd() {
      if (this.pendingItems.length) {
        const text = this.pendingItems.map((item, index) => {
          const parts = [];
          if (item.text.includes('📖')) {
            const notebookMatch = item.text.match(/📖\s*(\S+)/);
            if (notebookMatch) {
              parts.push(`📖 ${notebookMatch[1]}`);
            }
          }
          parts.push(`第${index + 1}次`);
          const contentWithoutNotebook = item.text.replace(/📖\s*\S+\s*\|\s*/, '');
          parts.push(contentWithoutNotebook);
          return parts.join(' | ');
        }).join("\n");
        this.$emit("insert", text);
        this.pendingItems = [];
        this.dialogVisible = false;
      }
    },
    handleClose() {
      this.dialogVisible = false;
    },
    confirmCustomNotebook() {
      if (this.customNotebookName.trim()) {
        this.form.notebook = this.customNotebookName.trim();
        this.showCustomNotebook = false;
        this.customNotebookName = "";
      }
    }
  }
};
</script>

<style scoped>
.v-card-text {
  max-height: 70vh;
  overflow-y: auto;
}

.number-input {
  padding: var(--space-2);
  border: 1px solid rgba(var(--v-border-color, var(--v-theme-on-surface)), 0.15);
  border-radius: var(--radius-sm);
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.optional-sections {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.optional-section {
  flex: 1;
  min-width: 180px;
  padding: var(--space-3);
  border: 1px solid rgba(var(--v-border-color, var(--v-theme-on-surface)), 0.15);
  border-radius: var(--radius-sm);
  background: rgba(var(--v-theme-surface-variant), 0.3);
}

.optional-section-header {
  font-size: 14px;
  font-weight: var(--font-weight-emphasis);
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.input-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  margin-bottom: 12px;
  padding: var(--space-2);
  background: rgba(var(--v-theme-surface), 0.5);
  border-radius: var(--radius-sm);
}

.input-label {
  font-size: 15px;
  font-weight: var(--font-weight-emphasis);
  color: rgba(var(--v-theme-on-surface), 0.8);
  min-width: 20px;
  text-align: center;
}

.input-field {
  width: 70px !important;
  max-width: 70px;
}

.repeat-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: center;
}

.repeat-btn {
  min-width: 56px !important;
}

.numpad {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.numpad-row {
  display: flex;
  gap: var(--space-1);
}

.numpad-btn {
  flex: 1;
  min-width: 36px !important;
}

.preview-box {
  background: rgba(var(--v-theme-primary), 0.05);
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
}

.template-section {
  margin-top: 8px;
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
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.pages-container {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-left: 8px;
  padding-left: 8px;
  border-left: 2px solid rgba(var(--v-theme-primary), 0.3);
}

.multi-question-section {
  padding: var(--space-2);
  border: 1px solid rgba(var(--v-border-color, var(--v-theme-on-surface)), 0.1);
  border-radius: var(--radius-sm);
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.question-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-1);
}

.question-grid-btn {
  min-width: 32px !important;
}

.drag-handle {
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}
</style>
