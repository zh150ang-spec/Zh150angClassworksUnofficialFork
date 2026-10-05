<template>
  <v-dialog
    :model-value="modelValue"
    max-width="400"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-headline-small"> 确认保存 </v-card-title>
      <v-card-text> 您正在修改 {{ dateText }} 的数据，确定要保存吗？ </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="medium-emphasis" variant="text" @click="$emit('reject')"> 取消 </v-btn>
        <v-btn color="primary" @click="$emit('resolve')"> 确认保存 </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
defineProps({
  modelValue: Boolean,
  dateText: {
    type: String,
    default: '',
  },
})

defineEmits(['update:modelValue', 'resolve', 'reject'])
</script>
