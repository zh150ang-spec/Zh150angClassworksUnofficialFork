<template>
  <v-card
    class="settings-card"
    elevation="2"
    hover
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
      v-if="$slots.actions"
      class="pa-4"
    >
      <slot name="actions" />
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
    loading: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style scoped>
.settings-card {
  height: 100%;
}
</style>
