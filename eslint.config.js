import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'

// ===== 全局变量白名单（单一真源：浏览器与 Node 共有的项只声明一次）=====
// 浏览器与 Node 18+ 均可用的公共全局
const COMMON_GLOBALS = {
  process: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  AbortController: 'readonly',
  WebSocket: 'readonly',
}

// 浏览器全局（dashboard）
const BROWSER_GLOBALS = {
  ...COMMON_GLOBALS,
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  alert: 'readonly',
  confirm: 'readonly',
  prompt: 'readonly',
  XMLHttpRequest: 'readonly',
  atob: 'readonly',
  btoa: 'readonly',
  import: 'readonly',
  self: 'readonly',
  caches: 'readonly',
  Notification: 'readonly',
  ServiceWorker: 'readonly',
  PushManager: 'readonly',
  PushSubscription: 'readonly',
  Storage: 'readonly',
  StorageEvent: 'readonly',
  Worker: 'readonly',
  SharedWorker: 'readonly',
  CustomEvent: 'readonly',
  Event: 'readonly',
  EventTarget: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  requestIdleCallback: 'readonly',
  cancelIdleCallback: 'readonly',
  matchMedia: 'readonly',
  MutationObserver: 'readonly',
  ResizeObserver: 'readonly',
  IntersectionObserver: 'readonly',
  getComputedStyle: 'readonly',
  scrollTo: 'readonly',
  scrollIntoView: 'readonly',
  addEventListener: 'readonly',
  removeEventListener: 'readonly',
  history: 'readonly',
  location: 'readonly',
  screen: 'readonly',
  performance: 'readonly',
}

// Node 全局（apps/server）
const NODE_GLOBALS = {
  ...COMMON_GLOBALS,
  Buffer: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  Headers: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  Blob: 'readonly',
  FormData: 'readonly',
  EventSource: 'readonly',
}

export default [
  // ===== Global ignores =====
  {
    name: 'monorepo/ignores',
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/dev-dist/**',
      '**/generated/**',
      '**/pnpm-lock.yaml',
      '**/package-lock.json',
      '**/*.timestamp-*.mjs',
      // Auto-generated declaration files
      '**/auto-imports.d.ts',
      '**/components.d.ts',
      '**/typed-router.d.ts',
      // Vendored / bundled sources (minified, WASM helpers, etc.)
      '**/vendor/**',
      '**/public/**',
      // apps/web 自治理：使用自身 oxlint + ESLint（见 apps/web/AGENTS.md），根 ESLint 不覆盖
      'apps/web/**',
      'apps/server/generated/**',
    ],
  },

  // ===== Base JS recommendations =====
  js.configs.recommended,

  // ===== Vue app (dashboard) =====
  // apps/web 自治理：由上方 ignores 排除，改用自身 oxlint + ESLint（见 apps/web/AGENTS.md）
  ...pluginVue.configs['flat/recommended'],
  {
    name: 'monorepo/vue-app',
    files: ['apps/dashboard/**/*.{js,mjs,jsx,vue}'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': [
        'error',
        {
          args: 'none',
          caughtErrors: 'none',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
    languageOptions: {
      globals: BROWSER_GLOBALS,
    },
  },

  // ===== Node server (Express backend) =====
  {
    name: 'monorepo/server',
    files: ['apps/server/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: NODE_GLOBALS,
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': [
        'error',
        {
          args: 'none',
          caughtErrors: 'none',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-useless-catch': 'off',
    },
  },

  // ===== Turn off formatting rules that conflict with Prettier =====
  prettier,
]
