<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-headline-small"> 确认应用URL配置 </v-card-title>
      <v-card-text>
        <p>以下配置将应用于当前班级：</p>
        <v-list density="compact">
          <v-list-item v-for="change in changes" :key="change.key">
            <template #prepend>
              <v-icon :icon="change.icon" class="mr-2" size="small" />
            </template>
            <v-list-item-title class="d-flex align-center">
              <span class="text-body-large">{{ change.name }}</span>
              <v-tooltip activator="parent" location="top">
                {{ change.description || change.key }}
              </v-tooltip>
            </v-list-item-title>
            <v-list-item-subtitle>
              <span class="text-medium-emphasis">{{ change.oldValue }}</span>
              <v-icon class="mx-1" :icon="ICON.ARROW_RIGHT" size="small" />
              <span class="text-primary font-weight-medium">{{ change.newValue }}</span>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="medium-emphasis" variant="text" @click="$emit('cancel')"> 取消 </v-btn>
        <v-btn color="primary" @click="$emit('confirm')"> 确认应用 </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ICON } from '@/utils/icons'
defineProps({
  modelValue: Boolean,
  changes: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['update:modelValue', 'confirm', 'cancel'])
</script>
