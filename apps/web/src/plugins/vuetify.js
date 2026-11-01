/**
 * plugins/vuetify.js
 *
 * Framework documentation: https://vuetifyjs.com`
 *
 * 本文件只负责装配：
 *   - 色板来自 src/tokens/colors.js（色板 SSOT）；
 *   - 几何/排版/动效数值来自 src/tokens/base.js
 *     （经 src/styles/settings.scss 编译期注入 + tokens.scss 运行时注入）；
 *   - 组件默认契约（defaults）集中在本文件。
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Composables
import { createVuetify } from 'vuetify'
import { zhHans } from 'vuetify/locale'

import { defaultTheme, themes } from '@/tokens/colors'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  // 全局组件默认契约。
  // 能用 prop/defaults 表达的视觉约定，一律不写运行时 CSS 覆盖；
  // 编译期 SASS 覆盖不到的少数几何（圆角等）在 settings.scss 处理。
  defaults: {
    // 所有未显式指定 variant 的按钮默认为实心 elevated，
    // 避免 Vuetify 默认 tonal 导致的浅色底色与低对比度问题。
    // 显式写 variant（text / outlined / tonal / flat 等）的按钮不受影响。
    // 按钮圆角由 settings.scss 的 $button-border-radius（25.6px）统一控制。
    VBtn: {
      variant: 'elevated',
    },
  },
  locale: {
    locale: 'zhHans',
    fallback: 'zhHans',
    messages: { zhHans },
  },
  theme: {
    defaultTheme,
    themes,
  },
})
