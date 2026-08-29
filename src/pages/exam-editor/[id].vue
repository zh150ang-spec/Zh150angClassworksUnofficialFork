<template>
  <v-container class="pa-0">
    <v-app-bar elevation="1">
      <template #prepend>
        <v-btn
          :icon="ICON.ARROW_LEFT"
          variant="text"
          @click="$router.back()"
        />
      </template>
      <v-app-bar-title class="text-headline-small">
        编辑考试配置
      </v-app-bar-title>
      <v-spacer />
      <v-btn
        :loading="saving"
        color="success"
        :prepend-icon="ICON.CONTENT_SAVE"
        variant="outlined"
        @click="save"
      >
        保存
      </v-btn>
    </v-app-bar>

    <v-container
      class="py-4"
      style="max-width: 1200px"
    >
      <ExamConfigEditor
        v-if="id"
        ref="editor"
        :config-id="id"
        @error="onError"
        @saved="onSaved"
      />
    </v-container>
  </v-container>
</template>

<script>
import { ICON } from '@/utils/icons'
import ExamConfigEditor from '@/components/editing/ExamConfigEditor.vue'

export default {
  name: 'ExamEditorPage',
  components: {ExamConfigEditor},
  data() {
    return {
      ICON,
      id: this.$route.params.id,
      saving: false,
    }
  },
  watch: {
    '$route.params.id'(val) {
      this.id = val
    }
  },
  methods: {
    async save() {
      if (!this.$refs.editor) return
      this.saving = true
      try {
        await this.$refs.editor.saveConfig()
      } finally {
        this.saving = false
      }
    },
    onSaved() {
      // 轻提示
      this.$toast?.success?.('保存成功')
    },
    onError(msg) {
      this.$toast?.error?.(msg || '保存失败')
    }
  }
}
</script>

<style scoped></style>
