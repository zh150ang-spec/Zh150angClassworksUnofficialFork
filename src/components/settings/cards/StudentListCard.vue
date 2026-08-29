<template>
  <settings-card
    :loading="loading"
    :icon="ICON.ACCOUNT_GROUP"
    title="学生列表"
  >
    <template #status>
      <unsaved-warning
        :show="unsavedChanges"
        message="有未保存的更改"
      />
    </template>
    <template #append>
      <div class="d-flex gap-2">
        <v-btn
          :prepend-icon="ICON.SORT_ALPHABETICAL_VARIANT"
          color="neutral-surface"
          variant="elevated"
          @click="sortStudentsByPinyin"
        >
          按姓名首字母排序
        </v-btn>
        <v-btn
          :color="modelValue.advanced ? 'primary' : 'neutral-surface'"
          :prepend-icon="ICON.CODE_BRACES"
          variant="elevated"
          @click="toggleAdvanced"
        >
          {{ modelValue.advanced ? "返回基础编辑" : "高级编辑" }}
        </v-btn>
      </div>
    </template>

    <v-alert
      v-if="error"
      class="mb-4"
      closable
      type="error"
      variant="tonal"
    >
      {{ error }}
    </v-alert>

    <v-expand-transition>
      <!-- 普通编辑模式 -->
      <div v-if="!modelValue.advanced">
        <v-row class="mb-6">
          <v-col
            cols="12"
            md="4"
            sm="6"
          >
            <v-text-field
              v-model="newStudentName"
              class="mb-4"
              hide-details
              label="添加学生"
              placeholder="输入学生姓名后回车添加"
              :prepend-inner-icon="ICON.ACCOUNT_PLUS"
              variant="outlined"
              @keyup.enter="addStudent"
            >
              <template #append>
                <v-btn
                  :disabled="!newStudentName.trim()"
                  color="primary"
                  :icon="ICON.PLUS"
                  size="small"
                  variant="text"
                  @click="addStudent"
                />
              </template>
            </v-text-field>
          </v-col>
        </v-row>

        <!-- 空状态提示 -->
        <v-empty-state
          v-if="modelValue.list.length === 0"
          :icon="ICON.ACCOUNT_OFF"
          title="暂无学生"
          text="还没有添加学生，请在上方添加"
        />

        <v-row v-if="modelValue.list.length > 0">
          <v-col
            v-for="(student, index) in modelValue.list"
            :key="index"
            cols="12"
            lg="3"
            md="4"
            sm="6"
          >
            <v-card
              elevation="1"
              border
              class="student-card"
            >
              <v-card-text class="d-flex align-center pa-3">
                <v-menu
                  :open-on-hover="!isMobile"
                  location="bottom"
                >
                  <template #activator="{ props: menuProps }">
                    <v-btn
                      class="mr-3 font-weight-medium"
                      size="small"
                      v-bind="menuProps"
                    >
                      {{ index + 1 }}
                    </v-btn>
                  </template>

                  <v-list
                    density="compact"
                    nav
                  >
                    <v-list-item
                      :disabled="index === 0"
                      :prepend-icon="ICON.ARROW_UP_BOLD"
                      @click="moveStudent(index, 'top')"
                    >
                      置顶
                    </v-list-item>
                    <v-divider />
                    <v-list-item
                      :disabled="index === 0"
                      :prepend-icon="ICON.ARROW_UP"
                      @click="moveStudent(index, 'up')"
                    >
                      上移
                    </v-list-item>
                    <v-list-item
                      :disabled="index === modelValue.list.length - 1"
                      :prepend-icon="ICON.ARROW_DOWN"
                      @click="moveStudent(index, 'down')"
                    >
                      下移
                    </v-list-item>
                  </v-list>
                </v-menu>

                <v-text-field
                  v-if="editState.index === index"
                  v-model="editState.name"
                  autofocus
                  class="flex-grow-1"
                  density="compact"
                  hide-details
                  variant="underlined"
                  @blur="saveEdit"
                  @keyup.enter="saveEdit"
                />
                <span
                  v-else
                  class="text-body-large flex-grow-1"
                  @click="handleClick(index, student)"
                >
                  {{ student.name }}
                </span>

                <div class="d-flex gap-2">
                  <v-btn
                    color="primary"
                    :icon="ICON.EDIT"
                    size="small"
                    variant="text"
                    @click="startEdit(index, student)"
                  />
                  <v-btn
                    color="error"
                    :icon="ICON.DELETE"
                    size="small"
                    variant="text"
                    @click="removeStudent(index)"
                  />
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- 高级编辑模式 -->
      <div
        v-else
        class="pt-2"
      >
        <v-alert
          v-if="!modelValue.text"
          class="mb-4"
          :icon="ICON.INFORMATION_OUTLINE"
          type="info"
          variant="tonal"
        >
          在此粘贴学生名单，每行一个
        </v-alert>
        <v-textarea
          v-model="modelValue.text"
          hint="使用文本编辑模式批量编辑学生名单，保存时会自动去除空行"
          label="批量编辑学生列表"
          persistent-hint
          placeholder="每行输入一个学生姓名"
          rows="10"
          variant="outlined"
          @update:model-value="handleTextInput"
        />
      </div>
    </v-expand-transition>

    <template #actions>
      <v-btn
        :disabled="loading"
        :loading="loading"
        color="success"
        :prepend-icon="ICON.CONTENT_SAVE"
        variant="elevated"
        @click="saveStudents"
      >
        保存名单
      </v-btn>
      <v-btn
        :disabled="loading"
        :loading="loading"
        color="neutral-surface"
        :prepend-icon="ICON.REFRESH"
        variant="elevated"
        @click="loadStudents"
      >
        重载名单
      </v-btn>
    </template>
  </settings-card>
</template>

<script>
import { ICON } from '@/utils/icons'
import SettingsCard from "@/components/settings/SettingsCard.vue";
import UnsavedWarning from "@/components/common/UnsavedWarning.vue";
import "@/styles/warnings.scss";
import dataProvider from "@/utils/dataProvider";

// pinyin-pro (~100KB) 按需动态加载
let _pinyin = null;
async function loadPinyin() {
  if (!_pinyin) {
    _pinyin = (await import('pinyin-pro')).pinyin;
  }
  return _pinyin;
}
import {getSetting} from "@/utils/settings";

export default {
  name: "StudentListCard",
  components: {
    SettingsCard,
    UnsavedWarning,
  },
  props: {
    isMobile: Boolean,
  },

  data() {
    return {
      ICON,
      newStudentName: "",
      editState: {
        index: -1,
        name: "",
      },
      modelValue: {
        list: [],
        text: "",
        advanced: false,
      },
      loading: false,
      error: null,
      lastSavedData: null,
      unsavedChanges: false,
    };
  },

  watch: {
    modelValue: {
      handler(newData) {
        if (this.lastSavedData) {
          this.unsavedChanges = JSON.stringify(newData.list) !== JSON.stringify(this.lastSavedData);
        }
        if (!this.modelValue.advanced) {
          this.modelValue.text = newData.list
            .slice()
            .sort((a, b) => a.id - b.id)
            .map(s => s.name)
            .join("\n");
        }
      },
      deep: true,
    },
  },

  mounted() {
    this.loadStudents();
  },

  methods: {
    async loadStudents() {
      this.error = null;
      try {
        this.loading = true;
        const classNum = getSetting("server.classNumber");

        if (!classNum) {
          throw new Error("请先设置班号");
        }

        try {
          const response = await dataProvider.loadData("classworks-list-main");

          if (response.success != false && Array.isArray(response)) {
            this.modelValue.list = response.map((item, index) => {
              if (typeof item === 'string') {
                return {id: index + 1, name: item};
              }
              return {
                id: item.id || index + 1,
                name: item.name || item.toString()
              };
            });

            this.modelValue.list.sort((a, b) => a.id - b.id);
            this.modelValue.text = this.modelValue.list.map(s => s.name).join("\n");
            this.lastSavedData = JSON.parse(JSON.stringify(this.modelValue.list));
            this.unsavedChanges = false;

          }
        } catch (error) {
          console.warn(
            "Failed to load student list from dedicated key, falling back to config",
            error
          );
          this.modelValue.list = [];
        }
      } catch (error) {
        console.error("加载学生列表失败:", error);
        this.error = error.message || "加载失败，请检查设置";
        this.$message?.error("加载失败", this.error);
      } finally {
        this.loading = false;
      }
    },

    async saveStudents() {
      try {
        const classNum = getSetting("server.classNumber");

        if (!classNum) {
          throw new Error("请先设置班号");
        }

        const formattedList = this.modelValue.list
          .slice()
          .sort((a, b) => a.id - b.id)
          .map((student, index) => ({
            id: index + 1,
            name: student.name
          }));

        const response = await dataProvider.saveData(
          "classworks-list-main",
          formattedList
        );

        if (response.success === false) {
          throw new Error(response.error?.message || "保存失败");
        }

        this.modelValue.list = formattedList;
        this.lastSavedData = JSON.parse(JSON.stringify(formattedList));
        this.unsavedChanges = false;
        this.$message?.success("保存成功", "学生列表已更新");
      } catch (error) {
        console.error("保存学生列表失败:", error);
        this.$message?.error("保存失败", error.message || "请重试");
      }
    },

    toggleAdvanced() {
      this.modelValue.advanced = !this.modelValue.advanced;
    },

    handleTextInput(text) {
      if (!this.modelValue.advanced) return;

      // Split the text into lines and filter out empty lines
      const lines = text.split("\n").filter((line) => line.trim());

      // Create a map of existing student names to their IDs
      const currentIds = new Map(this.modelValue.list.map(s => [s.name, s.id]));
      let maxId = Math.max(0, ...this.modelValue.list.map(s => s.id));

      // Create new list preserving IDs for existing names and generating new IDs for new names
      const newList = lines.map(name => {
        name = name.trim();
        if (currentIds.has(name)) {
          return {id: currentIds.get(name), name};
        }
        return {id: ++maxId, name};
      });

      // Update the list
      this.modelValue.list = newList;
    },

    addStudent() {
      const name = this.newStudentName.trim();
      if (name && !this.modelValue.list.some(s => s.name === name)) {
        const maxId = Math.max(0, ...this.modelValue.list.map(s => s.id));
        this.modelValue.list.push({id: maxId + 1, name});
        this.newStudentName = "";
      }
    },

    startEdit(index, student) {
      this.editState.index = index;
      this.editState.name = student.name;
    },

    saveEdit() {
      if (this.editState.index !== -1) {
        const newName = this.editState.name.trim();
        if (newName && newName !== this.modelValue.list[this.editState.index].name) {
          this.modelValue.list[this.editState.index].name = newName;
        }
        this.editState.index = -1;
        this.editState.name = "";
      }
    },

    removeStudent(index) {
      if (index !== undefined) {
        this.modelValue.list.splice(index, 1);
      }
    },

    moveStudent(index, direction) {
      if (direction === "top") {
        if (index > 0) {
          const student = this.modelValue.list[index];
          this.modelValue.list.splice(index, 1);
          this.modelValue.list.unshift(student);
          this.modelValue.list.forEach((s, i) => s.id = i + 1);
        }
      } else {
        const newIndex = direction === "up" ? index - 1 : index + 1;
        if (newIndex >= 0 && newIndex < this.modelValue.list.length) {
          [this.modelValue.list[index], this.modelValue.list[newIndex]] = [
            this.modelValue.list[newIndex],
            this.modelValue.list[index],
          ];
          [this.modelValue.list[index].id, this.modelValue.list[newIndex].id] = [
            this.modelValue.list[newIndex].id,
            this.modelValue.list[index].id,
          ];
        }
      }
    },

    handleClick(index, student) {
      if (this.isMobile) {
        this.startEdit(index, student);
      }
    },

    async sortStudentsByPinyin() {
      if (this.modelValue.list.length === 0) {
        this.$message?.warning("提示", "还没有添加学生，请添加学生后重试");
        return;
      }
      const pinyinFn = await loadPinyin();
      const sorted = [...this.modelValue.list].sort((a, b) => {
        const pinyinA = pinyinFn(a.name, {toneType: "none"});
        const pinyinB = pinyinFn(b.name, {toneType: "none"});
        return pinyinA.localeCompare(pinyinB);
      });
      sorted.forEach((s, i) => s.id = i + 1);
      this.modelValue.list = sorted;
    },
  },
};
</script>
