<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-headline-small">
        预览考试看板
      </v-card-title>
      <v-card-text>
        <v-list v-if="examList.length > 0">
          <v-list-item
            v-for="exam in examList"
            :key="exam.id"
            :title="exams[exam.id]?.examName || exam.id"
            :subtitle="exam.id"
            @click="$emit('add-exam', exam.id)"
          >
            <template #prepend>
              <v-icon
                color="primary"
                :icon="ICON.CALENDAR_TEXT"
              />
            </template>
            <template #append>
              <v-btn
                :icon="addedExamIds.has(exam.id) ? 'mdi-check' : 'mdi-plus'"
                :color="addedExamIds.has(exam.id) ? 'success' : 'grey'"
                variant="text"
              />
            </template>
          </v-list-item>
        </v-list>
        <div
          v-else
          class="text-center py-4 text-medium-emphasis"
        >
          暂无考试配置
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          variant="text"
          @click="$emit('update:modelValue', false)"
        >
          关闭
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ICON } from '@/utils/icons'
defineProps({
  modelValue: Boolean,
  examList: {
    type: Array,
    default: () => [],
  },
  exams: {
    type: Object,
    default: () => ({}),
  },
  addedExamIds: {
    type: Set,
    default: () => new Set(),
  },
});

defineEmits(["update:modelValue", "add-exam"]);
</script>
