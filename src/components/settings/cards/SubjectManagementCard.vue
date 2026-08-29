<template>
  <settings-card
    :loading="loading"
    border
    :icon="ICON.BOOK_MULTIPLE"
    title="科目管理"
  >
    <v-alert
      v-if="error"
      class="mb-4"
      closable
      type="error"
      variant="tonal"
    >
      {{ error }}
    </v-alert>

    <!-- 添加新科目 -->
    <v-card
      class="mb-4"
      variant="outlined"
    >
      <v-card-text>
        <v-row>
          <v-col
            cols="12"
            sm="6"
          >
            <v-text-field
              v-model="newSubjectName"
              :rules="[v => !!v || '科目名称不能为空']"
              :append-inner-icon="ICON.PLUS"
              density="comfortable"
              label="科目名称"
              variant="outlined"
              @keyup.enter="addSubject"
              @click:append-inner="addSubject"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- 科目列表 -->
    <v-card variant="outlined">
      <v-card-text class="pa-0">
        <v-list lines="one">
          <v-list-item
            v-for="(subject, index) in subjects"
            :key="subject.order"
          >
            <template #prepend>
              <div class="d-flex flex-column align-center mr-2">
                <v-btn
                  :disabled="index === 0"
                  :icon="ICON.CHEVRON_UP"
                  size="small"
                  variant="text"
                  @click="moveSubject(index, -1)"
                />
                <v-btn
                  :disabled="index === subjects.length - 1"
                  :icon="ICON.CHEVRON_DOWN"
                  size="small"
                  variant="text"
                  @click="moveSubject(index, 1)"
                />
              </div>
            </template>

            <v-list-item-title>
              <v-text-field
                v-model="subject.name"
                density="compact"
                hide-details
                variant="plain"
                @blur="updateSubject(subject)"
              />
            </v-list-item-title>

            <template #append>
              <v-btn
                color="error"
                :icon="ICON.DELETE"
                size="small"
                variant="text"
                @click="deleteSubject(subject)"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <template #status>
      <v-chip
        v-if="hasChanges"
        color="warning"
        variant="elevated"
      >
        有未保存的更改
      </v-chip>
    </template>
    <template #actions>
      <v-btn
        :loading="loading"
        :prepend-icon="ICON.REFRESH"
        color="neutral-surface"
        variant="elevated"
        @click="loadConfig"
      >
        重新加载
      </v-btn>
      <v-btn
        :loading="loading"
        color="success"
        :prepend-icon="ICON.CONTENT_SAVE"
        variant="elevated"
        @click="saveConfig"
      >
        保存
      </v-btn>
      <v-btn
        :loading="loading"
        color="warning"
        :prepend-icon="ICON.RESTORE"
        variant="elevated"
        @click="resetToDefault"
      >
        重置为默认
      </v-btn>
    </template>
  </settings-card>
</template>

<script>
import { ICON } from '@/utils/icons'
import SettingsCard from '@/components/settings/SettingsCard.vue';
import dataProvider from "@/utils/dataProvider.js";
import { useConfigDefaults } from '@/composables/useConfigDefaults';
import { defaultSubjects } from '@/utils/defaults/defaultData';

export default {
  name: 'SubjectManagementCard',

  components: {
    SettingsCard
  },

  data() {
    return {
      ICON,
      loading: false,
      error: null,
      subjects: [],
      originalSubjects: null,
      newSubjectName: '',
      defaultSubjects,
      configLoader: useConfigDefaults({ configKey: 'classworks-config-subject', kind: 'array' })
    };
  },

  computed: {
    hasChanges() {
      return this.originalSubjects &&
        JSON.stringify(this.subjects) !== JSON.stringify(this.originalSubjects);
    }
  },

  created() {
    this.loadConfig();
  },

  methods: {
    async loadConfig() {
      this.loading = true;
      try {
        const { result, message } = await this.configLoader.loadConfig({
          applyLoaded: (response) => {
            this.subjects = response
              .map((subject, index) => ({
                name: subject.name,
                order: subject.order ?? index
              }))
              .sort((a, b) => a.order - b.order);
            this.originalSubjects = JSON.parse(JSON.stringify(this.subjects));
          },
          applyDefault: () => this.applyDefault()
        });

        if (result === 'loaded') {
          this.showMessage('配置已加载', 'success');
        } else if (this.configLoader.isPreset(result)) {
          this.showMessage('使用默认科目列表', 'info');
        } else {
          this.showMessage(
            message ? `加载失败: ${message}，可继续编辑当前配置` : '加载失败，可继续编辑当前配置',
            'warning'
          );
        }
      } finally {
        this.loading = false;
      }
    },

    applyDefault() {
      const snapshot = this.configLoader.defaultSnapshot(this.defaultSubjects);
      this.subjects = snapshot;
      this.originalSubjects = JSON.parse(JSON.stringify(snapshot));
    },

    async saveConfig() {
      this.loading = true;
      try {
        const response = await dataProvider.saveData("classworks-config-subject", this.subjects);
        if (response) {
          this.originalSubjects = JSON.parse(JSON.stringify(this.subjects));
          this.showMessage('配置已保存', 'success');
        } else {
          throw new Error(response || '保存失败');
        }
      } catch (error) {
        console.error('Failed to save config:', error);
        this.showMessage(`保存失败: ${error.message}，请稍后重试`, 'error');
      }
      this.loading = false;
    },

    showMessage(text, color = 'success') {
      if (color === 'success') {
        this.$message?.success(text);
      } else if (color === 'error') {
        this.$message?.error(text);
      } else if (color === 'warning') {
        this.$message?.warning(text);
      } else {
        this.$message?.info(text);
      }
    },

    addSubject() {
      if (!this.newSubjectName) return;

      const subject = {
        name: this.newSubjectName,
        order: this.subjects.length
      };

      this.subjects.push(subject);
      this.newSubjectName = '';
    },

    updateSubject(subject) {
      const index = this.subjects.findIndex(s => s.order === subject.order);
      if (index > -1) {
        this.subjects[index] = {...subject};
      }
    },

    deleteSubject(subject) {
      const index = this.subjects.findIndex(s => s.order === subject.order);
      if (index > -1) {
        this.subjects.splice(index, 1);
        // 更新剩余科目的顺序
        this.subjects.forEach((s, i) => {
          s.order = i;
        });
      }
    },

    moveSubject(index, direction) {
      const newIndex = index + direction;
      if (newIndex >= 0 && newIndex < this.subjects.length) {
        // 交换位置
        const temp = this.subjects[index];
        this.subjects[index] = this.subjects[newIndex];
        this.subjects[newIndex] = temp;
        // 更新顺序
        this.subjects.forEach((subject, i) => {
          subject.order = i;
        });
      }
    },

    resetToDefault() {
      this.subjects = this.configLoader.defaultSnapshot(this.defaultSubjects);
      this.showMessage('已重置为默认科目列表', 'info');
    }
  }
};
</script>

<style scoped>
.v-list-item {
  border-bottom: 1px solid var(--color-border);
}

.v-list-item:last-child {
  border-bottom: none;
}
</style>
