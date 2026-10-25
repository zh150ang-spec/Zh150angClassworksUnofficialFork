<template>
  <v-dialog v-model="dialogVisible" :fullscreen="isMobile" max-width="600" width="auto">
    <v-card border>
      <v-card-title class="d-flex align-center">
        <v-btn
          v-if="isMobile"
          :icon="ICON.ARROW_LEFT"
          variant="text"
          class="mr-2"
          aria-label="关闭作业本"
          @click="handleClose"
        />
        <v-icon v-else class="mr-2" color="primary">
          {{ ICON.BOOK_NOTEBOOK }}
        </v-icon>
        <span class="text-truncate">作业本作业</span>
        <v-spacer />
        <v-chip color="primary" variant="flat" size="small"> 第 {{ currentTimes }} 次 </v-chip>
        <v-btn
          v-if="!isMobile"
          :icon="ICON.CLOSE"
          variant="text"
          class="ml-2"
          aria-label="关闭作业本"
          @click="handleClose"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pt-4">
        <v-form ref="formRef" @submit.prevent="addHomework">
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
                      <v-icon class="mr-1" size="small">
                        {{ ICON.PLUS }}
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

            <v-col v-if="hasTemplates" cols="12">
              <div class="template-section">
                <div class="template-books">
                  <template v-if="subjectBooks">
                    <div v-for="(pages, book) in subjectBooks" :key="book" class="button-group">
                      <v-chip
                        :color="form.content.includes(book) ? 'success' : 'default'"
                        :variant="form.content.includes(book) ? 'elevated' : 'flat'"
                        class="ma-1"
                        @click="insertToContent(book)"
                      >
                        {{ book }}
                      </v-chip>
                      <div v-if="form.content.includes(book)" class="pages-container mt-1">
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
                    <div v-for="(pages, book) in commonBooks" :key="book" class="button-group">
                      <v-chip
                        :color="form.content.includes(book) ? 'success' : 'default'"
                        :variant="form.content.includes(book) ? 'elevated' : 'flat'"
                        class="ma-1"
                        @click="insertToContent(book)"
                      >
                        {{ book }}
                      </v-chip>
                      <div v-if="form.content.includes(book)" class="pages-container mt-1">
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
                    <v-radio-group
                      v-model="pageMode"
                      density="compact"
                      hide-details
                      inline
                      class="ml-2"
                    >
                      <v-radio value="single" label="单页" />
                      <v-radio value="range" label="范围" />
                    </v-radio-group>
                  </div>

                  <div v-if="pageMode === 'single'" class="input-row">
                    <div class="input-label">第</div>
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
                      @focus="activePageInput = 'start'"
                    />
                    <v-btn
                      density="comfortable"
                      :icon="ICON.PLUS"
                      size="small"
                      variant="tonal"
                      @click="form.pageStart = (form.pageStart || 0) + 1"
                    />
                    <div class="input-label">页</div>
                  </div>

                  <div v-else-if="pageMode === 'range'" class="input-row">
                    <div class="input-label">第</div>
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
                      @focus="activePageInput = 'start'"
                    />
                    <v-btn
                      density="comfortable"
                      :icon="ICON.PLUS"
                      size="small"
                      variant="tonal"
                      @click="form.pageStart = (form.pageStart || 0) + 1"
                    />
                    <div class="input-label">至</div>
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
                      @focus="activePageInput = 'end'"
                    />
                    <v-btn
                      density="comfortable"
                      :icon="ICON.PLUS"
                      size="small"
                      variant="tonal"
                      @click="form.pageEnd = (form.pageEnd || form.pageStart || 1) + 1"
                    />
                    <div class="input-label">页</div>
                  </div>

                  <div v-if="pageMode === 'range'" class="d-flex justify-center mb-2">
                    <v-btn-toggle
                      v-model="activePageInput"
                      mandatory
                      density="compact"
                      divided
                      variant="outlined"
                    >
                      <v-btn value="start" size="small">起始页</v-btn>
                      <v-btn value="end" size="small">结束页</v-btn>
                    </v-btn-toggle>
                  </div>

                  <div class="numpad">
                    <div class="numpad-row">
                      <v-btn
                        v-for="n in [1, 2, 3]"
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
                        v-for="n in [4, 5, 6]"
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
                        v-for="n in [7, 8, 9]"
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
                    <v-radio-group
                      v-model="questionMode"
                      density="compact"
                      hide-details
                      inline
                      class="ml-2"
                    >
                      <v-radio value="single" label="单题" />
                      <v-radio value="range" label="范围" />
                      <v-radio value="multi" label="多选" />
                    </v-radio-group>
                  </div>

                  <div v-if="questionMode === 'single'" class="input-row">
                    <div class="input-label">第</div>
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
                      @focus="activeQuestionInput = 'start'"
                    />
                    <v-btn
                      density="comfortable"
                      :icon="ICON.PLUS"
                      size="small"
                      variant="tonal"
                      @click="form.questionStart = (form.questionStart || 0) + 1"
                    />
                    <div class="input-label">题</div>
                  </div>

                  <div v-else-if="questionMode === 'range'" class="input-row">
                    <div class="input-label">第</div>
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
                      @focus="activeQuestionInput = 'start'"
                    />
                    <v-btn
                      density="comfortable"
                      :icon="ICON.PLUS"
                      size="small"
                      variant="tonal"
                      @click="form.questionStart = (form.questionStart || 0) + 1"
                    />
                    <div class="input-label">至</div>
                    <v-btn
                      :disabled="!form.questionEnd || form.questionEnd <= (form.questionStart || 1)"
                      density="comfortable"
                      :icon="ICON.MINUS"
                      size="small"
                      variant="tonal"
                      @click="
                        form.questionEnd = Math.max(
                          form.questionStart || 1,
                          (form.questionEnd || 1) - 1,
                        )
                      "
                    />
                    <v-text-field
                      v-model.number="form.questionEnd"
                      class="input-field"
                      density="comfortable"
                      hide-details
                      min="1"
                      type="number"
                      variant="outlined"
                      @focus="activeQuestionInput = 'end'"
                    />
                    <v-btn
                      density="comfortable"
                      :icon="ICON.PLUS"
                      size="small"
                      variant="tonal"
                      @click="form.questionEnd = (form.questionEnd || form.questionStart || 1) + 1"
                    />
                    <div class="input-label">题</div>
                  </div>

                  <div v-else-if="questionMode === 'multi'" class="multi-question-section">
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
                    <div class="d-flex align-center justify-center mt-2 flex-wrap gap-2">
                      <v-text-field
                        v-model.number="customQuestionInput"
                        class="input-field"
                        density="comfortable"
                        hide-details
                        label="其他题号"
                        min="1"
                        style="max-width: 120px"
                        type="number"
                        variant="outlined"
                        @keyup.enter="addCustomQuestion"
                      />
                      <v-btn
                        density="comfortable"
                        size="small"
                        variant="tonal"
                        @click="addCustomQuestion"
                      >
                        添加
                      </v-btn>
                      <v-btn
                        density="comfortable"
                        size="small"
                        variant="text"
                        @click="selectedQuestions = []"
                      >
                        清空
                      </v-btn>
                      <span v-if="selectedQuestions.length" class="text-body-medium"
                        >已选 {{ selectedQuestions.length }} 题</span
                      >
                    </div>
                    <div v-if="sortedSelectedQuestions.length" class="d-flex flex-wrap mt-1">
                      <v-chip
                        v-for="n in sortedSelectedQuestions"
                        :key="n"
                        class="ma-1"
                        closable
                        color="primary"
                        size="small"
                        variant="tonal"
                        @click:close="toggleQuestion(n)"
                      >
                        {{ n }}
                      </v-chip>
                    </div>
                  </div>

                  <div v-if="questionMode === 'range'" class="d-flex justify-center mt-2 mb-2">
                    <v-btn-toggle
                      v-model="activeQuestionInput"
                      mandatory
                      density="compact"
                      divided
                      variant="outlined"
                    >
                      <v-btn value="start" size="small">起始题</v-btn>
                      <v-btn value="end" size="small">结束题</v-btn>
                    </v-btn-toggle>
                  </div>

                  <div v-if="questionMode !== 'multi'" class="numpad">
                    <div class="numpad-row">
                      <v-btn
                        v-for="n in [1, 2, 3]"
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
                        v-for="n in [4, 5, 6]"
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
                        v-for="n in [7, 8, 9]"
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
                  <div class="optional-section-header">写几遍（可选）</div>
                  <div class="repeat-buttons">
                    <v-btn
                      v-for="n in [1, 2, 3, 5, 10]"
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

          <div v-if="previewText" class="preview-box mt-4 pa-3 rounded">
            <div class="text-body-small text-medium-emphasis mb-1">预览</div>
            <div class="text-body-large">
              {{ previewText }}
            </div>
          </div>

          <div v-if="formError && form.content" class="text-error text-body-small text-right mb-2">
            {{ formError }}
          </div>

          <div class="d-flex justify-end mt-4">
            <v-btn
              :disabled="!form.content.trim() || !!formError"
              color="primary"
              type="submit"
              variant="elevated"
            >
              <v-icon class="mr-1">
                {{ ICON.PLUS }}
              </v-icon>
              添加第 {{ currentTimes }} 次
            </v-btn>
          </div>
        </v-form>

        <v-divider class="my-4" />

        <div class="mb-2 d-flex align-center">
          <span class="text-label-large">已添加</span>
          <v-chip v-if="pendingItems.length" class="ml-2" color="primary" size="small">
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

        <v-list v-if="pendingItems.length" border density="compact" rounded>
          <draggable v-model="pendingItems" item-key="id" handle=".drag-handle" animation="200">
            <template #item="{ element, index }">
              <v-list-item class="py-2">
                <template #prepend>
                  <v-icon
                    :icon="ICON.DRAG_VERTICAL"
                    class="drag-handle mr-2"
                    color="medium-emphasis"
                    size="small"
                    aria-hidden="true"
                  />
                </template>
                <v-list-item-title class="ml-2">
                  {{ formatNotebookItem(element, index + 1) }}
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
        <div v-else class="text-center text-body-medium text-disabled py-4">暂无待添加的作业</div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="handleClose"> 取消 </v-btn>
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

    <v-dialog v-model="showCustomNotebook" max-width="400">
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
          <v-btn variant="text" @click="showCustomNotebook = false"> 取消 </v-btn>
          <v-btn color="primary" variant="elevated" @click="confirmCustomNotebook"> 确定 </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script>
import { ICON } from '@/utils/icons'
import { useDisplay } from 'vuetify'
import { getSetting, setSetting } from '@/utils/settings'
import {
  formatNotebookItem,
  mergeNotebookOptions,
  parseCustomNotebooks,
  toPositiveInt,
  validateNotebookItem,
} from '@/utils/notebookHomework'
import draggable from 'vuedraggable'

export default {
  name: 'NotebookHomeworkDialog',
  components: {
    draggable,
  },
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    subject: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue', 'insert'],
  setup() {
    const { mobile } = useDisplay()
    return { mobile, ICON, formatNotebookItem }
  },
  data() {
    return {
      form: {
        notebook: '',
        content: '',
        pageStart: null,
        pageEnd: null,
        questionStart: null,
        questionEnd: null,
        repeat: null,
      },
      pageMode: 'single',
      questionMode: 'single',
      activePageInput: 'start',
      activeQuestionInput: 'start',
      selectedQuestions: [],
      customQuestionInput: null,
      pendingItems: [],
      showCustomNotebook: false,
      customNotebookName: '',
      customNotebooks: [],
      notebookConfig: null,
      templateData: null,
      itemIdCounter: 0,
    }
  },
  computed: {
    isMobile() {
      const forceDesktopMode = getSetting('display.forceDesktopMode')
      if (forceDesktopMode) return false
      return this.mobile
    },
    dialogVisible: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit('update:modelValue', value)
      },
    },
    currentTimes() {
      return this.pendingItems.length + 1
    },
    availableNotebooks() {
      return mergeNotebookOptions(this.notebookConfig, this.subject, this.customNotebooks)
    },
    hasTemplates() {
      return !!(this.subjectBooks || this.commonBooks)
    },
    subjectBooks() {
      if (!this.subject || !this.templateData?.subjects?.[this.subject]?.books) {
        return null
      }
      return this.templateData.subjects[this.subject].books
    },
    commonBooks() {
      if (!this.templateData?.commonSubject?.books) {
        return null
      }
      return this.templateData.commonSubject.books
    },
    sortedSelectedQuestions() {
      return [...new Set(this.selectedQuestions)].sort((a, b) => a - b)
    },
    draftItem() {
      return {
        notebook: this.form.notebook,
        content: this.form.content,
        pageMode: this.pageMode,
        pageStart: this.form.pageStart,
        pageEnd: this.form.pageEnd,
        questionMode: this.questionMode,
        questionStart: this.form.questionStart,
        questionEnd: this.form.questionEnd,
        questions: this.selectedQuestions,
        repeat: this.form.repeat,
      }
    },
    formError() {
      return validateNotebookItem(this.draftItem)
    },
    previewText() {
      if (!this.form.content.trim()) return ''
      return formatNotebookItem(this.draftItem, this.currentTimes)
    },
  },
  watch: {
    async modelValue(newValue) {
      if (!newValue) return
      this.customNotebooks = parseCustomNotebooks(getSetting('edit.customNotebooks'))
      // 先按当前可用项初始化，保证弹窗可立即输入；配置返回后只校正作业本选项，
      // 不整体 resetForm，避免把用户已经输入的内容清掉。
      this.resetForm()
      this.$nextTick(() => {
        if (this.$refs.contentInput) {
          this.$refs.contentInput.focus()
        }
      })
      await this.loadConfig()
      if (!this.availableNotebooks.some((item) => item.name === this.form.notebook)) {
        this.form.notebook = this.availableNotebooks[0]?.name || ''
      }
    },
    pageMode() {
      this.form.pageEnd = null
      this.activePageInput = 'start'
    },
    questionMode() {
      this.form.questionEnd = null
      this.selectedQuestions = []
      this.customQuestionInput = null
      this.activeQuestionInput = 'start'
    },
  },
  methods: {
    resetForm() {
      this.form = {
        notebook: this.availableNotebooks[0]?.name || '',
        content: '',
        pageStart: null,
        pageEnd: null,
        questionStart: null,
        questionEnd: null,
        repeat: null,
      }
      this.pageMode = 'single'
      this.questionMode = 'single'
      this.activePageInput = 'start'
      this.activeQuestionInput = 'start'
      this.selectedQuestions = []
      this.customQuestionInput = null
    },
    async loadConfig() {
      try {
        const dataProvider = await import('@/utils/dataProvider')
        this.notebookConfig = await dataProvider.default.loadData(
          'classworks-config-homework-template',
        )
        this.templateData = this.notebookConfig
      } catch (error) {
        console.error('Failed to load notebook template config:', error)
        this.notebookConfig = null
        this.templateData = null
      }
    },
    insertToContent(text) {
      const hasContent = this.form.content.trim().length > 0
      this.form.content = this.form.content.trim() + (hasContent ? ' ' : '') + text
    },
    toggleQuestion(n) {
      const value = toPositiveInt(n)
      if (!value) return
      const index = this.selectedQuestions.indexOf(value)
      if (index > -1) {
        this.selectedQuestions.splice(index, 1)
      } else {
        this.selectedQuestions.push(value)
      }
    },
    addCustomQuestion() {
      const value = toPositiveInt(this.customQuestionInput)
      if (value && !this.selectedQuestions.includes(value)) {
        this.selectedQuestions.push(value)
      }
      this.customQuestionInput = null
    },
    inputPageNumber(n) {
      if (this.pageMode === 'single') {
        this.form.pageStart = (this.form.pageStart || 0) * 10 + n
      } else {
        if (this.activePageInput === 'start') {
          this.form.pageStart = (this.form.pageStart || 0) * 10 + n
        } else {
          this.form.pageEnd = (this.form.pageEnd || 0) * 10 + n
        }
      }
    },
    backspacePage() {
      if (this.pageMode === 'single') {
        this.form.pageStart = Math.floor((this.form.pageStart || 0) / 10)
        if (this.form.pageStart === 0) this.form.pageStart = null
      } else {
        if (this.activePageInput === 'start') {
          this.form.pageStart = Math.floor((this.form.pageStart || 0) / 10)
          if (this.form.pageStart === 0) this.form.pageStart = null
        } else {
          this.form.pageEnd = Math.floor((this.form.pageEnd || 0) / 10)
          if (this.form.pageEnd === 0) this.form.pageEnd = null
        }
      }
    },
    clearPage() {
      if (this.pageMode === 'single') {
        this.form.pageStart = null
      } else {
        if (this.activePageInput === 'start') {
          this.form.pageStart = null
        } else {
          this.form.pageEnd = null
        }
      }
    },
    inputQuestionNumber(n) {
      if (this.questionMode === 'single') {
        this.form.questionStart = (this.form.questionStart || 0) * 10 + n
      } else {
        if (this.activeQuestionInput === 'start') {
          this.form.questionStart = (this.form.questionStart || 0) * 10 + n
        } else {
          this.form.questionEnd = (this.form.questionEnd || 0) * 10 + n
        }
      }
    },
    backspaceQuestion() {
      if (this.questionMode === 'single') {
        this.form.questionStart = Math.floor((this.form.questionStart || 0) / 10)
        if (this.form.questionStart === 0) this.form.questionStart = null
      } else {
        if (this.activeQuestionInput === 'start') {
          this.form.questionStart = Math.floor((this.form.questionStart || 0) / 10)
          if (this.form.questionStart === 0) this.form.questionStart = null
        } else {
          this.form.questionEnd = Math.floor((this.form.questionEnd || 0) / 10)
          if (this.form.questionEnd === 0) this.form.questionEnd = null
        }
      }
    },
    clearQuestion() {
      if (this.questionMode === 'single') {
        this.form.questionStart = null
      } else {
        if (this.activeQuestionInput === 'start') {
          this.form.questionStart = null
        } else {
          this.form.questionEnd = null
        }
      }
    },
    addHomework() {
      const content = this.form.content.trim()
      if (!content || this.formError) return

      // 保存结构化条目，最终文本只在 confirmAdd 时统一格式化，
      // 不再把预览文本用正则反解回字段。
      this.pendingItems.push({
        id: ++this.itemIdCounter,
        notebook: this.form.notebook,
        content,
        pageMode: this.pageMode,
        pageStart: toPositiveInt(this.form.pageStart),
        pageEnd: toPositiveInt(this.form.pageEnd),
        questionMode: this.questionMode,
        questionStart: toPositiveInt(this.form.questionStart),
        questionEnd: toPositiveInt(this.form.questionEnd),
        questions: this.sortedSelectedQuestions,
        repeat: this.form.repeat || null,
      })

      this.form.content = ''
      this.form.pageStart = null
      this.form.pageEnd = null
      this.form.questionStart = null
      this.form.questionEnd = null
      this.form.repeat = null
      this.selectedQuestions = []
      this.customQuestionInput = null
    },
    removePending(index) {
      this.pendingItems.splice(index, 1)
    },
    clearPending() {
      this.pendingItems = []
    },
    confirmAdd() {
      if (!this.pendingItems.length) return
      const text = this.pendingItems
        .map((item, index) => formatNotebookItem(item, index + 1))
        .join('\n')
      this.$emit('insert', text)
      this.pendingItems = []
      this.dialogVisible = false
    },
    handleClose() {
      // 取消即丢弃未确认条目，避免“取消后重开仍在”的假取消。
      this.pendingItems = []
      this.selectedQuestions = []
      this.customQuestionInput = null
      this.dialogVisible = false
    },
    confirmCustomNotebook() {
      const name = this.customNotebookName.trim()
      if (!name) return
      if (!this.customNotebooks.includes(name)) {
        this.customNotebooks = [...this.customNotebooks, name]
        setSetting('edit.customNotebooks', JSON.stringify(this.customNotebooks))
      }
      this.form.notebook = name
      this.showCustomNotebook = false
      this.customNotebookName = ''
    },
  },
}
</script>

<style scoped>
@media (min-width: 600px) {
  .v-card-text {
    max-height: 70vh;
    overflow-y: auto;
  }
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
