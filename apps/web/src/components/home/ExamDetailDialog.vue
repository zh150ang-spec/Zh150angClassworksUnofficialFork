<template>
  <v-dialog
    :model-value="modelValue"
    persistent
    fullscreen
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card v-if="selectedExamId">
      <v-card-title class="d-flex align-center pa-4">
        编辑考试配置
        <v-spacer />
        <v-btn :icon="ICON.CLOSE" variant="text" @click="$emit('update:modelValue', false)" />
      </v-card-title>
      <v-card-text class="pa-4" style="max-height: 70vh; overflow-y: auto">
        <exam-config-editor
          :config-id="selectedExamId"
          :dialog-mode="true"
          @saved="$emit('saved')"
          @deleted="$emit('deleted')"
        />
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-btn
          color="error"
          :prepend-icon="ICON.DELETE"
          variant="tonal"
          @click="$emit('remove-card')"
        >
          移除卡片
        </v-btn>
        <v-spacer />
        <v-btn color="primary" variant="text" @click="$emit('update:modelValue', false)">
          关闭
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ICON } from '@/utils/icons'
import { defineAsyncComponent } from 'vue'
import AsyncLoadingPlaceholder from '@/components/common/AsyncLoadingPlaceholder.vue'

const ExamConfigEditor = defineAsyncComponent({
  loader: () => import('@/components/editing/ExamConfigEditor.vue'),
  loadingComponent: AsyncLoadingPlaceholder,
  delay: 0,
})

defineProps({
  modelValue: Boolean,
  selectedExamId: {
    type: String,
    default: null,
  },
})

defineEmits(['update:modelValue', 'saved', 'deleted', 'remove-card'])
</script>
