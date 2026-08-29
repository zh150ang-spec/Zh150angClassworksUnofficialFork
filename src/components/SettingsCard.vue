<template>
  <v-card
    class="settings-card"
    border
    flat
    rounded="xl"
  >
    <v-card-item>
      <template #prepend>
        <v-icon
          :icon="icon"
          class="mr-2"
          size="large"
        />
      </template>
      <v-card-title class="text-headline-small">
        {{ title }}
      </v-card-title>
      <v-card-subtitle
        v-if="subtitle"
        class="mt-1"
      >
        {{ subtitle }}
      </v-card-subtitle>
      <template #append>
        <!-- 头部右侧：仅放轻量即时操作（排序、高级编辑等） -->
        <slot name="append" />
      </template>
    </v-card-item>

    <v-card-text>
      <v-progress-linear
        v-if="loading"
        class="mb-4"
        color="primary"
        indeterminate
      />
      <slot />
    </v-card-text>

    <v-card-actions
      v-if="$slots.actions || $slots.status"
      class="pa-4"
    >
      <!-- 左下角：状态提示（不可交互，如"有未保存的更改"） -->
      <div
        v-if="$slots.status"
        class="d-flex align-center mr-auto"
      >
        <slot name="status" />
      </div>
      <!-- 右下角：保存/重载等提交类操作 -->
      <div class="d-flex justify-end flex-grow-1 gap-2">
        <slot name="actions" />
      </div>
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  name: 'SettingsCard',
  props: {
    title: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      required: true
    },
    subtitle: {
      type: String,
      default: ''
    },
    loading: {
      type: Boolean,
      default: false
    },
    border: {
      type: Boolean,
      default: true
    }
  }
}
</script>

<style scoped>
.settings-card {
  height: 100%;
}
</style>
