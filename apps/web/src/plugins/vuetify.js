/**
 * plugins/vuetify.js
 *
 * Framework documentation: https://vuetifyjs.com`
 * Theme: Apple/Pinguo design system palette
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Composables
import { createVuetify } from 'vuetify'
import { zhHans } from 'vuetify/locale'

// Apple Design System color palette (Pinguo)
// Extended with surface-container hierarchy for elevation-aware surfaces.
// Text hierarchy is handled via CSS custom properties in tokens.scss,
// NOT here — Vuetify's theme colors are for component base colors only.
const appleColors = {
  // Dark mode (default)
  dark: {
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
  // Light mode
  light: {
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
}

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  // 全局默认：所有未显式指定 variant 的按钮默认为实心 elevated，
  // 避免 Vuetify 默认 tonal 导致的浅色底色与低对比度问题。
  // 显式写 variant（text / outlined / tonal / flat 等）的按钮不受影响。
  defaults: {
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
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: appleColors.dark,
        // tonal 变体的填充不透明度（Vuetify 默认 0.12，约 88% 透过去）。
        // 抬到 0.18：保留半透明质感，同时让中性填充可辨；卡片与页面的
        // 分隔主要靠边框/阴影（纯填充在数学上到不了 3:1）。
        variables: {
          'activated-opacity': 0.18,
        },
      },
      light: {
        dark: false,
        colors: appleColors.light,
        variables: {
          'activated-opacity': 0.18,
        },
      },
    },
  },
})
