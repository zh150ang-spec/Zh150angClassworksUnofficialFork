<template>
  <v-icon
    :icon="resolvedName"
    :color="color"
    :size="size"
    :start="start"
    :end="end"
    v-bind="$attrs"
  >
    <!-- slot 内容留空，icon prop 决定了图标内容 -->
  </v-icon>
</template>

<script>
import { ICON } from '@/utils/icons'

/**
 * AppIcon — 统一图标组件
 *
 * 属性：
 *   name:  图标键名（ICON 对象的 key）或直接传 mdi-xxx 字符串
 *   color: 可选，按语义分类传值（inherit|brand|success|error|warning|info|on-dark|muted）
 *   size:  可选
 *   start/end: 可选，内联文本旁的间距控制
 *
 * 使用方式：
 *   <AppIcon name="CHAT" start color="brand" />
 *   <AppIcon name=ICON.SETTINGS start />
 */
export default {
  name: 'AppIcon',
  inheritAttrs: false,
  props: {
    name: { type: String, required: true },
    color: { type: String, default: undefined },
    size: { type: [String, Number], default: undefined },
    start: { type: Boolean, default: false },
    end: { type: Boolean, default: false },
  },
  computed: {
    resolvedName() {
      if (this.name.startsWith('mdi-')) return this.name
      return ICON[this.name] || this.name
    },
  },
}
</script>
