/**
 * src/tokens/colors.js
 *
 * 色板 SSOT（raw palette）。
 * 这是全仓库唯一允许出现主题 hex 值的地方：
 *   - 喂给 createVuetify({ theme }) 运行时主题，产出 --v-theme-* CSS 变量；
 *   - styles/tokens.scss 的语义色（文本层级、描边、填充等）只允许
 *     通过 var(--v-theme-*) 引用，不重复定义 hex。
 *
 * Apple 系中性色（深/浅两套），并扩展 surface-container 层级以表达
 * 随海拔变化的面。文字层级不在这里定义——它由 tokens.scss 的
 * 不透明度语义 token 处理。
 */

export const defaultTheme = 'dark'

export const themes = {
  // Dark mode (default)
  dark: {
    dark: true,
    colors: {
      background: '#000000',
      surface: '#1C1C1E',
      'surface-bright': '#2C2C2E',
      'surface-variant': '#2C2C2E',
      'surface-container-lowest': '#111113',
      'surface-container-low': '#1C1C1E',
      'surface-container': '#232326',
      'surface-container-high': '#2C2C2E',
      'surface-container-highest': '#3A3A3C',
      'on-surface-variant': '#AEAEB2',
      primary: '#2E8DFF',
      'on-primary': '#000000',
      secondary: '#2C2C2E',
      'on-secondary': '#F5F5F7',
      success: '#30D158',
      'on-success': '#FFFFFF',
      warning: '#FF9F0A',
      'on-warning': '#000000',
      error: '#FF453A',
      'on-error': '#FFFFFF',
      info: '#64D2FF',
      'on-info': '#000000',
      'on-background': '#F5F5F7',
      'on-surface': '#F5F5F7',
      'border-color': '#3A3A3C',
      'border-opacity': 0.14,
      // Scratch / surface-tone neutrals for custom fills
      outline: '#48484A',
      'outline-variant': '#3A3A3C',
      // Neutral tonal surface for toolbar/utility buttons; brighter than
      // surface-container-high so fills keep contrast in dark mode.
      'neutral-surface': '#46464D',
    },
    // tonal 变体的填充不透明度（Vuetify 默认 0.12，约 88% 透过去）。
    // 抬到 0.18：保留半透明质感，同时让中性填充可辨；卡片与页面的
    // 分隔主要靠边框/阴影（纯填充在数学上到不了 3:1）。
    variables: {
      'activated-opacity': 0.18,
    },
  },

  // Light mode
  light: {
    dark: false,
    colors: {
      background: '#FFFFFF',
      surface: '#F2F2F7',
      'surface-bright': '#FFFFFF',
      'surface-variant': '#E5E5EA',
      'surface-container-lowest': '#F2F2F7',
      'surface-container-low': '#ECECEF',
      'surface-container': '#E5E5EA',
      'surface-container-high': '#DFDFE3',
      'surface-container-highest': '#D1D1D6',
      'on-surface-variant': '#6E6E73',
      primary: '#007AFF',
      'on-primary': '#FFFFFF',
      secondary: '#E5E5EA',
      'on-secondary': '#1D1D1F',
      success: '#34C759',
      'on-success': '#FFFFFF',
      warning: '#FF9500',
      'on-warning': '#000000',
      error: '#FF3B30',
      'on-error': '#FFFFFF',
      info: '#64D2FF',
      'on-info': '#000000',
      'on-background': '#1D1D1F',
      'on-surface': '#1D1D1F',
      'border-color': '#E5E5EA',
      'border-opacity': 0.14,
      // Scratch / surface-tone neutrals for custom fills
      outline: '#8E8E93',
      'outline-variant': '#C7C7CC',
      'neutral-surface': '#E2E2E7',
    },
    variables: {
      'activated-opacity': 0.18,
    },
  },
}
