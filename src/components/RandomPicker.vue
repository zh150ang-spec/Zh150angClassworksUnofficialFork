<template>
  <v-dialog
    v-model="dialog"
    fullscreen-breakpoint="sm"
    max-width="600"
    persistent
  >
    <v-card
      border
      class="random-picker-card"
      rounded="xl"
      :style="$vuetify.display.smAndDown ? { borderRadius: 0, border: 'none' } : {}"
    >
      <v-card-title class="text-headline-medium d-flex align-center">
        <v-icon
          class="mr-2"
          :icon="ICON.ACCOUNT_QUESTION"
        />
        随机点名
        <v-spacer />
        <v-btn
          :icon="ICON.CLOSE"
          variant="text"
          @click="dialog = false"
        />
      </v-card-title>

      <v-card-text
        v-if="!isPickingStarted"
        class="text-center py-6"
      >
        <div class="text-headline-small mb-4">
          请选择抽取人数
        </div>

        <div class="d-flex justify-center align-center counter-container">
          <v-btn
            :disabled="count <= 1"
            class="counter-btn"
            color="primary"
            :icon="ICON.MINUS"
            size="x-large"
            variant="tonal"
            @click="decrementCount"
          />

          <div class="count-display mx-8">
            <span class="text-display-medium font-weight-bold">{{ count }}</span>
            <span class="text-body-large ml-2">人</span>
          </div>

          <v-btn
            :disabled="count >= maxAllowedCount"
            class="counter-btn"
            color="primary"
            :icon="ICON.PLUS"
            size="x-large"
            variant="tonal"
            @click="incrementCount"
          />
        </div>

        <!-- 添加模式切换 -->
        <div class="mode-switch-container mt-6">
          <v-btn-toggle
            v-model="pickerMode"
            class="mode-toggle"
            color="primary"
            mandatory
          >
            <v-btn
              :prepend-icon="ICON.ACCOUNT"
              value="name"
            >
              姓名模式
            </v-btn>
            <v-btn
              :prepend-icon="ICON.NUMERIC_ICON"
              value="number"
            >
              学号模式
            </v-btn>
          </v-btn-toggle>
        </div>

        <!-- 学号范围设置 -->
        <div
          v-if="pickerMode === 'number'"
          class="number-range-container mt-4"
        >
          <div class="text-body-large mb-2">
            学号范围设置
          </div>
          <div class="d-flex justify-center align-center gap-4">
            <v-text-field
              v-model.number="minNumber"
              class="number-input"
              density="compact"
              hide-details
              label="最小值"
              max="100"
              min="1"
              type="number"
            />
            <span class="mx-2">至</span>
            <v-text-field
              v-model.number="maxNumber"
              class="number-input"
              density="compact"
              hide-details
              label="最大值"
              max="100"
              min="1"
              type="number"
            />
          </div>
        </div>

        <div class="mt-4">
          <v-btn
            :disabled="filteredStudents.length === 0"
            class="start-btn"
            color="primary"
            :prepend-icon="ICON.DICE_MULTIPLE"
            size="x-large"
            @click="startPicking"
          >
            开始抽取
          </v-btn>
        </div>

        <div
          v-if="filteredStudents.length === 0"
          class="mt-4 text-error"
        >
          <template v-if="pickerMode === 'name'">
            没有可抽取的学生，请调整过滤选项
          </template>
          <template v-else>
            请设置有效的学号范围
          </template>
        </div>

        <div class="mt-4 text-body-small">
          当前可抽取学生: {{ filteredStudents.length }}人
          <v-tooltip
            v-if="pickerMode === 'name'"
            location="bottom"
          >
            <template #activator="{ props }">
              <v-icon
                class="ml-1"
                :icon="ICON.INFORMATION_OUTLINE"
                size="small"
                v-bind="props"
              />
            </template>
            <div class="pa-2">
              <div v-if="tempFilters.excludeAbsent">
                • 已排除请假学生 ({{ absentCount }}人)
              </div>
              <div v-if="tempFilters.excludeLate">
                • 已排除迟到学生 ({{ lateCount }}人)
              </div>
              <div v-if="tempFilters.excludeExcluded">
                • 已排除不参与学生 ({{ excludedCount }}人)
              </div>
            </div>
          </v-tooltip>

          <!-- 添加临时过滤选项 -->
          <div
            v-if="pickerMode === 'name'"
            class="d-flex flex-wrap justify-center gap-2 mt-4"
          >
            <v-chip
              :color="tempFilters.excludeLate ? 'warning' : 'default'"
              :variant="tempFilters.excludeLate ? 'elevated' : 'text'"
              class="filter-chip"
              :prepend-icon="ICON.CLOCK_ALERT"
              @click="tempFilters.excludeLate = !tempFilters.excludeLate"
            >
              {{ tempFilters.excludeLate ? "排除" : "包含" }}迟到学生
            </v-chip>
            <v-chip
              :color="tempFilters.excludeAbsent ? 'error' : 'default'"
              :variant="tempFilters.excludeAbsent ? 'elevated' : 'text'"
              class="filter-chip"
              :prepend-icon="ICON.ACCOUNT_OFF"
              @click="tempFilters.excludeAbsent = !tempFilters.excludeAbsent"
            >
              {{ tempFilters.excludeAbsent ? "排除" : "包含" }}请假学生
            </v-chip>

            <v-chip
              :color="tempFilters.excludeExcluded ? 'grey' : 'default'"
              :variant="tempFilters.excludeExcluded ? 'elevated' : 'text'"
              class="filter-chip"
              :prepend-icon="ICON.ACCOUNT_CANCEL"
              @click="tempFilters.excludeExcluded = !tempFilters.excludeExcluded"
            >
              {{ tempFilters.excludeExcluded ? "排除" : "包含" }}不参与学生
            </v-chip>
          </div>
        </div>
      </v-card-text>

      <v-card-text
        v-else
        class="text-center py-6"
      >
        <transition
          mode="out-in"
          name="result-fade"
        >
          <div
            v-if="isAnimating"
            key="animation"
            class="animation-container"
          >
            <div class="animation-wrapper">
              <transition-group
                class="shuffle-container"
                name="shuffle"
                tag="div"
              >
                <div
                  v-for="(student, index) in animationStudents"
                  :key="student.id"
                  :class="{ highlighted: highlightedIndices.includes(index) }"
                  class="student-item"
                >
                  {{ student.name }}
                </div>
              </transition-group>
            </div>
          </div>

          <div
            v-else
            key="result"
            class="result-container"
          >
            <div class="text-headline-small mb-4">
              抽取结果
            </div>
            <v-card
              v-for="(student, index) in pickedStudents"
              :key="index"
              class="mb-2 result-card"
              color="primary"
              variant="outlined"
            >
              <v-card-text class="text-headline-large text-center py-4 d-flex align-center justify-center">
                {{ student }}
                <v-btn
                  :disabled="remainingStudents.length === 0"
                  :title="
                    remainingStudents.length === 0
                      ? '没有更多可用学生'
                      : '重新抽取此学生'
                  "
                  class="ml-2 refresh-btn"
                  :icon="ICON.REFRESH"
                  size="small"
                  variant="text"
                  @click="refreshSingleStudent(index)"
                />
              </v-card-text>
            </v-card>

            <div class="mt-8 d-flex justify-center">
              <v-btn
                class="mx-2"
                color="primary"
                :prepend-icon="ICON.REFRESH"
                size="large"
                @click="resetPicker"
              >
                重新抽取
              </v-btn>
              <v-btn
                class="mx-2"
                color="medium-emphasis"
                size="large"
                variant="outlined"
                @click="dialog = false"
              >
                关闭
              </v-btn>
            </div>
          </div>
        </transition>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { ICON } from '@/utils/icons'
import {getSetting, setSetting} from "@/utils/settings";

export default {
  name: "RandomPicker",
  props: {
    studentList: {
      type: Array,
      required: true,
    },
    attendance: {
      type: Object,
      default: () => ({absent: [], late: [], exclude: []}),
    },
  },
  data() {
    return {
      ICON,
      dialog: false,
      count: getSetting("randomPicker.defaultCount"),
      isPickingStarted: false,
      isAnimating: false,
      pickedStudents: [],
      preSelectedStudents: [], // 预先确定的真实结果，用于最后一步诚实展示
      animationStudents: [],
      highlightedIndices: [],
      animationTimer: null,
      getSetting,
      // 添加临时过滤选项
      tempFilters: {
        excludeAbsent: getSetting("randomPicker.excludeAbsent"),
        excludeLate: getSetting("randomPicker.excludeLate"),
        excludeExcluded: getSetting("randomPicker.excludeExcluded"),
      },
      pickerMode: getSetting("randomPicker.mode"),
      minNumber: getSetting("randomPicker.minNumber"),
      maxNumber: getSetting("randomPicker.maxNumber"),
    };
  },
  computed: {
    // 计算请假、迟到、不参与的学生数量
    absentCount() {
      return this.attendance.absent ? this.attendance.absent.length : 0;
    },
    lateCount() {
      return this.attendance.late ? this.attendance.late.length : 0;
    },
    excludedCount() {
      return this.attendance.exclude ? this.attendance.exclude.length : 0;
    },

    // 添加数字模式的学生列表
    numberModeStudents() {
      if (this.pickerMode !== "number") return [];
      const students = [];
      for (let i = this.minNumber; i <= this.maxNumber; i++) {
        students.push(i.toString().padStart(2, "0") + "号");
      }
      return students;
    },

    // 修改 filteredStudents 计算属性
    filteredStudents() {
      if (this.pickerMode === "number") {
        return this.numberModeStudents;
      }

      if (!this.studentList || !this.studentList.length) return [];

      return this.studentList.filter((student) => {
        if (
          this.tempFilters.excludeAbsent &&
          this.attendance.absent.includes(student)
        ) {
          return false;
        }
        if (
          this.tempFilters.excludeLate &&
          this.attendance.late.includes(student)
        ) {
          return false;
        }
        if (
          this.tempFilters.excludeExcluded &&
          this.attendance.exclude.includes(student)
        ) {
          return false;
        }
        return true;
      });
    },

    // 兼容性：保留原有的 availableStudents 计算属性，但使用新的过滤逻辑
    availableStudents() {
      return this.filteredStudents;
    },

    maxAllowedCount() {
      return Math.min(10, this.filteredStudents.length);
    },

    // 计算剩余可用学生（排除已抽取的学生）
    remainingStudents() {
      return this.filteredStudents.filter(
        (student) => !this.pickedStudents.includes(student)
      );
    },
  },
  watch: {
    dialog(newVal) {
      if (newVal) {
        // 打开对话框时重置状态
        this.count = getSetting("randomPicker.defaultCount");
        this.isPickingStarted = false;
        this.isAnimating = false;
        this.pickedStudents = [];
        this.preSelectedStudents = [];

        // 重置临时过滤选项为设置中的值
        this.tempFilters = {
          excludeAbsent: getSetting("randomPicker.excludeAbsent"),
          excludeLate: getSetting("randomPicker.excludeLate"),
          excludeExcluded: getSetting("randomPicker.excludeExcluded"),
        };
      } else {
        // 关闭对话框时清除计时器
        if (this.animationTimer) {
          clearTimeout(this.animationTimer);
          this.animationTimer = null;
        }
      }
    },

    // 监听过滤选项变化，确保count不超过可用学生数
    tempFilters: {
      handler() {
        if (this.count > this.maxAllowedCount) {
          this.count = Math.max(1, this.maxAllowedCount);
        }
      },
      deep: true,
    },

    // 添加模式切换监听
    pickerMode: {
      handler(newMode) {
        setSetting("randomPicker.mode", newMode);
      },
    },
    minNumber: {
      handler(newValue) {
        if (newValue > this.maxNumber) {
          this.minNumber = this.maxNumber;
        }
        if (newValue < 1) {
          this.minNumber = 1;
        }
        setSetting("randomPicker.minNumber", this.minNumber);
      },
    },
    maxNumber: {
      handler(newValue) {
        if (newValue < this.minNumber) {
          this.maxNumber = this.minNumber;
        }
        if (newValue > 100) {
          this.maxNumber = 100;
        }
        setSetting("randomPicker.maxNumber", this.maxNumber);
      },
    },
  },
  methods: {
    open() {
      this.dialog = true;
    },
    incrementCount() {
      if (this.count < this.maxAllowedCount) {
        this.count++;
      }
    },
    decrementCount() {
      if (this.count > 1) {
        this.count--;
      }
    },
    startPicking() {
      if (this.filteredStudents.length === 0) return;

      this.isPickingStarted = true;

      if (getSetting("randomPicker.animation")) {
        this.startAnimation();
      } else {
        this.finishPicking();
      }
    },
    startAnimation() {
      this.isAnimating = true;

      // 创建动画用的学生列表（添加ID以便于动画）
      this.animationStudents = this.filteredStudents.map((name, index) => ({
        id: `student-${index}`,
        name,
      }));

      // 随机高亮显示
      this.animateHighlight();
    },
    animateHighlight() {
      const totalSteps = 22;
      let currentStep = 0;
      const baseInterval = 30;

      // 预先确定最终被选中的学生，最后一步展示真实结果，消除作弊疑虑
      const shuffled = [...this.filteredStudents].sort(() => 0.5 - Math.random());
      this.preSelectedStudents = shuffled.slice(0, this.count);

      // 计算最终选中学生在 animationStudents 中的索引
      const finalIndices = this.preSelectedStudents.map((name) =>
        this.animationStudents.findIndex((s) => s.name === name)
      );

      const animate = () => {
        this.highlightedIndices = [];
        const indices = [];

        if (currentStep < totalSteps - 1) {
          // 前 21 步：随机高亮，营造滚动效果
          for (let i = 0; i < this.count; i++) {
            let randomIndex;
            do {
              randomIndex = Math.floor(
                Math.random() * this.animationStudents.length
              );
            } while (indices.includes(randomIndex));
            indices.push(randomIndex);
          }
        } else {
          // 最后 1 步：展示真实被选中的学生
          indices.push(...finalIndices);
        }

        this.highlightedIndices = indices;
        currentStep++;

        const nextInterval = baseInterval * Math.pow(1.2, currentStep);

        if (currentStep < totalSteps) {
          this.animationTimer = setTimeout(animate, nextInterval);
        } else {
          // 短暂停顿（约 300ms，刚好够视觉捕捉），让用户看到真实结果后再揭示
          this.animationTimer = setTimeout(() => {
            this.finishPicking();
          }, 300);
        }
      };

      animate();
    },
    finishPicking() {
      this.isAnimating = false;

      // 使用动画最后一步已展示的真实结果，与用户看到的一致
      if (this.preSelectedStudents.length > 0) {
        this.pickedStudents = this.preSelectedStudents;
        this.preSelectedStudents = [];
      } else {
        // 无动画模式下的兜底
        const shuffled = [...this.filteredStudents].sort(
          () => 0.5 - Math.random()
        );
        this.pickedStudents = shuffled.slice(0, this.count);
      }
    },
    resetPicker() {
      this.isPickingStarted = false;
      this.isAnimating = false;
      this.pickedStudents = [];
      this.preSelectedStudents = [];
      if (this.animationTimer) {
        clearTimeout(this.animationTimer);
        this.animationTimer = null;
      }
    },
    // 刷新单个学生
    refreshSingleStudent(index) {
      if (this.remainingStudents.length === 0) return;

      // 从剩余学生中随机选择一个
      const randomIndex = Math.floor(
        Math.random() * this.remainingStudents.length
      );
      const newStudent = this.remainingStudents[randomIndex];

      // 直接替换，不使用动画
      this.pickedStudents[index] = newStudent;
    },
  },
};
</script>

<style lang="scss" scoped>
.random-picker-card {
  overflow: hidden;
}

.counter-container {
  margin: 2rem 0;
}

.counter-btn {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-circle);
}

.count-display {
  min-width: 100px;
  text-align: center;
}

.start-btn {
  min-width: 200px;
  height: 64px;
  border-radius: var(--radius-lg);
  font-size: 1.2rem;
}

// 过滤选项卡片样式
.filter-options-card {
  max-width: 450px;
  margin: 0 auto;
}

.filter-chip {
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-apple);

  &:active {
    transform: scale(0.95);
  }
}

// 学生列表提示框样式
.student-list-tooltip {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 5px;
  font-size: 0.9em;
}

.animation-container {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.animation-wrapper {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.shuffle-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-compat-10px);
}

.student-item {
  padding: var(--space-compat-10px) var(--space-compat-15px);
  background-color: rgba(var(--v-theme-surface-variant), 0.7);
  border-radius: var(--radius-sm);
  transition: all var(--duration-normal) var(--ease-apple);
  font-size: 1.2rem;

  &.highlighted {
    background-color: rgb(var(--v-theme-primary));
    color: rgb(var(--v-theme-on-primary));
    transform: scale(1.15);
    font-weight: bold;
    box-shadow: 0 0 24px rgba(var(--v-theme-primary), 0.45);
    animation: highlight-pop 0.25s ease-out;
  }
}

// 高亮弹跳脉冲动画
@keyframes highlight-pop {
  0% {
    transform: scale(1);
    box-shadow: none;
  }
  40% {
    transform: scale(1.22);
    box-shadow: 0 0 32px rgba(var(--v-theme-primary), 0.6);
  }
  100% {
    transform: scale(1.15);
    box-shadow: 0 0 24px rgba(var(--v-theme-primary), 0.45);
  }
}

.result-container {
  min-height: 300px;
}

.result-card {
  max-width: 400px;
  margin: 0 auto;
  animation: result-appear 0.45s ease-out both;
}

.result-card:nth-child(1) { animation-delay: 0.05s; }
.result-card:nth-child(2) { animation-delay: 0.13s; }
.result-card:nth-child(3) { animation-delay: 0.21s; }
.result-card:nth-child(4) { animation-delay: 0.29s; }
.result-card:nth-child(5) { animation-delay: 0.37s; }
.result-card:nth-child(6) { animation-delay: 0.45s; }
.result-card:nth-child(7) { animation-delay: 0.53s; }
.result-card:nth-child(8) { animation-delay: 0.61s; }
.result-card:nth-child(9) { animation-delay: 0.69s; }
.result-card:nth-child(10) { animation-delay: 0.77s; }

// 结果卡片入场动画
@keyframes result-appear {
  from {
    opacity: 0;
    transform: scale(0.85) translateY(24px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.result-card:hover .refresh-btn {
  opacity: 1;
}

.refresh-btn {
  opacity: 0.7;
  transition: opacity var(--duration-normal) var(--ease-apple);

  &:hover {
    opacity: 1;
  }
}

// 动画与结果之间的过渡
.result-fade-enter-active {
  transition: all 0.35s ease-out;
}

.result-fade-leave-active {
  transition: all 0.2s ease-in;
}

.result-fade-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.result-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

// 动画效果
.shuffle-enter-active,
.shuffle-leave-active {
  transition: all var(--duration-slow) var(--ease-apple);
}

.shuffle-enter-from,
.shuffle-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.shuffle-move {
  transition: transform var(--duration-slow) var(--ease-apple);
}

// 触摸屏优化
@media (hover: none) {
  .counter-btn,
  .start-btn {
    min-height: 72px;
  }

  .student-item {
    padding: var(--space-3) var(--space-5);
    font-size: 1.4rem;
  }

  .refresh-btn {
    opacity: 1;
    min-width: 36px;
    min-height: 36px;
  }

  .filter-chip {
    min-height: 40px;
    font-size: 1rem;
  }
}

// 添加模式切换样式
.mode-switch-container {
  .mode-toggle {
    border: 1px solid rgba(var(--v-theme-primary), 0.2);
    border-radius: var(--radius-full);
    padding: var(--space-1);
    box-shadow: var(--shadow-hover);

    .v-btn {
      min-width: 120px;
      height: 40px;
      font-weight: var(--font-weight-emphasis);
      letter-spacing: 0.5px;

      &.v-btn--active {
        transform: scale(1.02);
        font-weight: var(--font-weight-label);
      }
    }
  }
}

// 添加学号范围设置样式
.number-range-container {
  max-width: 300px;
  margin: 0 auto;
  padding: var(--space-4);
  background: rgba(var(--v-theme-surface-variant), 0.1);
  border-radius: var(--radius-md);
  border: 1px solid rgba(var(--v-theme-primary), 0.1);

  .number-input {
    width: 100px;

    :deep(.v-field) {
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow);
    }
  }
}
</style>
