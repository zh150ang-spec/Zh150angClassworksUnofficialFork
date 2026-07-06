<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="isMobile"
    fullscreen-breakpoint="sm"
    max-width="900"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon
          start
          :icon="ICON.ACCOUNT_GROUP"
        />
        考勤
        <v-spacer />
        <v-chip
          v-if="!isMobile"
          class="ml-2"
          color="primary"
          size="small"
        >
          {{ formatDateDisplay(dateString) }}
        </v-chip>
        <v-btn
          v-if="isMobile"
          :icon="ICON.CLOSE"
          variant="text"
          @click="$emit('update:modelValue', false)"
        />
      </v-card-title>

      <v-card-text>
        <!-- 批量操作和搜索 -->
        <v-row class="mb-4">
          <v-col
            cols="12"
            md="12"
          >
            <v-text-field
              v-model="attendanceSearch"
              clearable
              hint="支持筛选姓氏，如输入'孙'可筛选所有姓孙的学生"
              label="搜索学生"
              :prepend-inner-icon="ICON.SEARCH"
              variant="outlined"
            />

            <!-- 姓氏筛选 -->
            <div class="d-flex flex-wrap mt-2 gap-1">
              <v-btn
                v-for="surname in extractedSurnames"
                :key="surname.name"
                :color="attendanceSearch === surname.name ? 'primary' : ''"
                :variant="
                  attendanceSearch === surname.name ? 'elevated' : 'text'
                "
                @click="
                  attendanceSearch =
                    attendanceSearch === surname.name ? '' : surname.name
                "
              >
                {{ surname.name }}
                ({{ surname.count }})
              </v-btn>
            </div>
          </v-col>
        </v-row>

        <!-- 过滤器 -->
        <div class="d-flex flex-wrap mb-4 gap-2">
          <div>
            <v-chip
              :append-icon="
                attendanceFilter.includes('present') ? 'mdi-check' : ''
              "
              :color="attendanceFilter.includes('present') ? 'success' : ''"
              :variant="
                attendanceFilter.includes('present') ? 'elevated' : 'tonal'
              "
              class="px-2 filter-chip"
              :prepend-icon="ICON.ACCOUNT_CHECK"
              value="present"
              @click="toggleFilter('present')"
            >
              到课
            </v-chip>

            <v-chip
              :append-icon="
                attendanceFilter.includes('absent') ? 'mdi-check' : ''
              "
              :color="attendanceFilter.includes('absent') ? 'error' : ''"
              :variant="
                attendanceFilter.includes('absent') ? 'elevated' : 'tonal'
              "
              class="px-2 filter-chip"
              :prepend-icon="ICON.ACCOUNT_OFF"
              value="absent"
              @click="toggleFilter('absent')"
            >
              请假
            </v-chip>
            <v-chip
              :append-icon="
                attendanceFilter.includes('late') ? 'mdi-check' : ''
              "
              :color="attendanceFilter.includes('late') ? 'warning' : ''"
              :variant="
                attendanceFilter.includes('late') ? 'elevated' : 'tonal'
              "
              class="px-2 filter-chip"
              :prepend-icon="ICON.CLOCK_ALERT"
              value="late"
              @click="toggleFilter('late')"
            >
              迟到
            </v-chip>
            <v-chip
              :append-icon="
                attendanceFilter.includes('exclude') ? 'mdi-check' : ''
              "
              :color="attendanceFilter.includes('exclude') ? 'grey' : ''"
              :variant="
                attendanceFilter.includes('exclude') ? 'elevated' : 'tonal'
              "
              class="px-2 filter-chip"
              :prepend-icon="ICON.ACCOUNT_CANCEL"
              value="exclude"
              @click="toggleFilter('exclude')"
            >
              不参与
            </v-chip>
          </div>
        </div>

        <!-- 学生列表 -->
        <v-row>
          <v-col
            v-for="student in filteredStudents"
            :key="student"
            cols="12"
            lg="4"
            md="6"
            sm="6"
          >
            <v-card
              border
              class="student-card"
            >
              <v-card-text class="d-flex align-center pa-2">
                <div class="flex-grow-1">
                  <div class="d-flex align-center">
                    <v-avatar
                      :color="getStudentStatusColor(student)"
                      class="mr-2"
                      size="24"
                    >
                      <v-icon size="small">
                        {{ getStudentStatusIcon(student) }}
                      </v-icon>
                    </v-avatar>
                    <div class="text-body-large">
                      {{ student }}
                    </div>
                  </div>
                </div>
                <div class="attendance-actions">
                  <v-btn
                    :color="isPresent(student) ? 'success' : ''"
                    :title="'设为到课'"
                    :icon="ICON.ACCOUNT_CHECK"
                    :size="isMobile ? 'default' : 'small'"
                    variant="text"
                    @click="setPresent(student)"
                  />
                  <v-btn
                    :color="isAbsent(student) ? 'error' : ''"
                    :title="'设为请假'"
                    :icon="ICON.ACCOUNT_OFF"
                    :size="isMobile ? 'default' : 'small'"
                    variant="text"
                    @click="setAbsent(student)"
                  />
                  <v-btn
                    :color="isLate(student) ? 'warning' : ''"
                    :title="'设为迟到'"
                    :icon="ICON.CLOCK_ALERT"
                    :size="isMobile ? 'default' : 'small'"
                    variant="text"
                    @click="setLate(student)"
                  />
                  <v-btn
                    :color="isExclude(student) ? 'grey' : ''"
                    :title="'设为不参与'"
                    :icon="ICON.ACCOUNT_CANCEL"
                    :size="isMobile ? 'default' : 'small'"
                    variant="text"
                    @click="setExclude(student)"
                  />
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
        <v-row>
          <v-col
            cols="12"
            md="12"
          >
            <v-card
              class="mb-4"
              color="primary"
              variant="tonal"
            >
              <v-card-text>
                <div class="text-label-large mb-2">
                  批量操作
                </div>
                <div class="d-flex flex-wrap gap-2">
                  <v-btn
                    class="flex-grow-1"
                    color="success"
                    :prepend-icon="ICON.ACCOUNT_CHECK"
                    @click="setAllPresent"
                  >
                    全部到齐
                  </v-btn>
                  <v-btn
                    class="flex-grow-1"
                    color="error"
                    :prepend-icon="ICON.ACCOUNT_OFF"
                    @click="setAllAbsent"
                  >
                    全部请假
                  </v-btn>
                  <v-btn
                    class="flex-grow-1"
                    color="warning"
                    :prepend-icon="ICON.CLOCK_ALERT"
                    @click="setAllLate"
                  >
                    全部迟到
                  </v-btn>
                  <v-btn
                    class="flex-grow-1"
                    color="medium-emphasis"
                    :prepend-icon="ICON.ACCOUNT_CANCEL"
                    @click="setAllExclude"
                  >
                    全部不参与
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />

        <v-btn
          color="primary"
          @click="$emit('save')"
        >
          <v-icon
            start
            :icon="ICON.CONTENT_SAVE"
          />
          保存
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { ICON } from '@/utils/icons'
import { useDisplay } from "vuetify";
import { getSetting } from "@/utils/settings";
import { formatDateDisplay8Char } from "@/utils/dateUtils";

export default {
  name: "AttendanceManagementDialog",
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    studentList: {
      type: Array,
      required: true,
    },
    attendance: {
      type: Object,
      required: true,
    },
    dateString: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue", "update:attendance", "save", "change"],
  setup() {
    const { mobile } = useDisplay();
    return { mobile, ICON };
  },
  data() {
    return {
      attendanceSearch: "",
      attendanceFilter: [],
    };
  },
  computed: {
    localAttendance: {
      get() {
        return this.attendance;
      },
      set(value) {
        this.$emit("update:attendance", value);
      },
    },
    isMobile() {
      // 如果启用了强制一体机UI模式，返回false（使用桌面UI）
      const forceDesktopMode = getSetting('display.forceDesktopMode');
      if (forceDesktopMode) {
        return false;
      }
      return this.mobile;
    },
    filteredStudents() {
      let students = [...this.studentList];

      if (this.attendanceSearch) {
        const searchTerm = this.attendanceSearch.toLowerCase();
        students = students.filter((student) =>
          student.toLowerCase().includes(searchTerm)
        );
      }

      if (this.attendanceFilter && this.attendanceFilter.length > 0) {
        students = students.filter((student) => {
          if (this.attendanceFilter.includes("present") && this.isPresent(student))
            return true;
          if (this.attendanceFilter.includes("absent") && this.isAbsent(student))
            return true;
          if (this.attendanceFilter.includes("late") && this.isLate(student))
            return true;
          if (this.attendanceFilter.includes("exclude") && this.isExclude(student))
            return true;
          return false;
        });
      }

      return students;
    },
    extractedSurnames() {
      if (!this.studentList || this.studentList.length === 0) {
        return [];
      }

      const surnameMap = new Map();

      this.studentList.forEach((student) => {
        if (student && student.length > 0) {
          const surname = student.charAt(0);
          surnameMap.set(surname, (surnameMap.get(surname) || 0) + 1);
        }
      });

      return Array.from(surnameMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    },
  },
  methods: {
    formatDateDisplay: formatDateDisplay8Char,
    toggleFilter(filter) {
      const index = this.attendanceFilter.indexOf(filter);
      if (index === -1) {
        this.attendanceFilter.push(filter);
      } else {
        this.attendanceFilter.splice(index, 1);
      }
    },
    isPresent(student) {
      const { absent, late, exclude } = this.attendance;
      return (
        !absent.includes(student) &&
        !late.includes(student) &&
        !exclude.includes(student)
      );
    },
    isAbsent(student) {
      return this.attendance.absent.includes(student);
    },
    isLate(student) {
      return this.attendance.late.includes(student);
    },
    isExclude(student) {
      return this.attendance.exclude.includes(student);
    },
    getStudentStatusColor(student) {
      if (this.attendance.absent.includes(student)) return "error";
      if (this.attendance.late.includes(student)) return "warning";
      if (this.attendance.exclude.includes(student)) return "grey";
      return "success";
    },
    getStudentStatusIcon(student) {
      if (this.attendance.absent.includes(student)) return ICON.ACCOUNT_OFF;
      if (this.attendance.late.includes(student)) return ICON.CLOCK_ALERT;
      if (this.attendance.exclude.includes(student)) return ICON.ACCOUNT_CANCEL;
      return ICON.ACCOUNT_CHECK;
    },
    removeFromAll(student) {
      const newAbsent = this.attendance.absent.filter((s) => s !== student);
      const newLate = this.attendance.late.filter((s) => s !== student);
      const newExclude = this.attendance.exclude.filter((s) => s !== student);

      if (
        newAbsent.length !== this.attendance.absent.length ||
        newLate.length !== this.attendance.late.length ||
        newExclude.length !== this.attendance.exclude.length
      ) {
        this.localAttendance = {
          absent: newAbsent,
          late: newLate,
          exclude: newExclude,
        };
      }
    },
    setPresent(student) {
      this.removeFromAll(student);
      this.$emit("change");
    },
    setAbsent(student) {
      const newAbsent = this.attendance.absent.filter((s) => s !== student);
      const newLate = this.attendance.late.filter((s) => s !== student);
      const newExclude = this.attendance.exclude.filter((s) => s !== student);

      this.localAttendance = {
        absent: [...newAbsent, student],
        late: newLate,
        exclude: newExclude,
      };
      this.$emit("change");
    },
    setLate(student) {
      const newAbsent = this.attendance.absent.filter((s) => s !== student);
      const newLate = this.attendance.late.filter((s) => s !== student);
      const newExclude = this.attendance.exclude.filter((s) => s !== student);

      this.localAttendance = {
        absent: newAbsent,
        late: [...newLate, student],
        exclude: newExclude,
      };
      this.$emit("change");
    },
    setExclude(student) {
      const newAbsent = this.attendance.absent.filter((s) => s !== student);
      const newLate = this.attendance.late.filter((s) => s !== student);
      const newExclude = this.attendance.exclude.filter((s) => s !== student);

      this.localAttendance = {
        absent: newAbsent,
        late: newLate,
        exclude: [...newExclude, student],
      };
      this.$emit("change");
    },
    setAllPresent() {
      this.localAttendance = {
        absent: [],
        late: [],
        exclude: [],
      };
      this.$emit("change");
    },
    setAllAbsent() {
      this.localAttendance = {
        absent: [...this.studentList],
        late: [],
        exclude: [],
      };
      this.$emit("change");
    },
    setAllLate() {
      this.localAttendance = {
        absent: [],
        late: [...this.studentList],
        exclude: [],
      };
      this.$emit("change");
    },
    setAllExclude() {
      this.localAttendance = {
        absent: [],
        late: [],
        exclude: [...this.studentList],
      };
      this.$emit("change");
    },
  },
};
</script>

<style scoped>
.gap-1 {
  gap: 4px;
}
.gap-2 {
  gap: 8px;
}
</style>
