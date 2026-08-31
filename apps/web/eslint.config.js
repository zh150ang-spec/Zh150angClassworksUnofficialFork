import fs from 'node:fs'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import oxlint from 'eslint-plugin-oxlint'

// unplugin-auto-import 生成的自动导入声明（ref、computed 等），供 no-undef 识别
let autoImportGlobals = {}
try {
  autoImportGlobals =
    JSON.parse(fs.readFileSync(new URL('./.eslintrc-auto-import.json', import.meta.url), 'utf8'))
      .globals || {}
} catch {
  // 首次未生成时忽略
}

// ESLint 只需补充 oxlint 不支持的部分：Vue 模板解析规则。
// 全部规则块都限定为 .vue，使 ESLint 在文件枚举/匹配阶段就排除 js/mjs/jsx，
// 这些文件完全交给 oxlint，ESLint 不会读取、解析它们。
const VUE_FILES = ['**/*.vue']

export default [
  {
    name: 'app/files-to-lint',
    files: VUE_FILES,
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/vendor/**'],
  },

  // 基础 JS 规则（仅作用于 .vue 的 <script> 部分）
  {
    files: VUE_FILES,
    ...js.configs.recommended,
  },
  ...pluginVue.configs['flat/recommended'].map((cfg) => {
    if (cfg.files) return cfg
    return { ...cfg, files: VUE_FILES }
  }),

  // oxlint 已覆盖的规则在 ESLint 中关闭，避免重复检查。
  // 仅取 oxlint/all（cfg[0]）并限定 .vue；丢弃自带 ignores 的
  // vue-svelte-astro-exceptions 块——它对 ESLint 无价值，且会让非 vue 文件进入匹配。
  ...oxlint.configs['flat/all']
    .filter((cfg) => !cfg.ignores)
    .map((cfg) => ({ ...cfg, files: VUE_FILES })),

  {
    files: VUE_FILES,
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: VUE_FILES,
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        XMLHttpRequest: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        import: 'readonly',
        process: 'readonly',
        self: 'readonly',
        caches: 'readonly',
        Notification: 'readonly',
        ServiceWorker: 'readonly',
        PushManager: 'readonly',
        PushSubscription: 'readonly',
        Storage: 'readonly',
        StorageEvent: 'readonly',
        WebSocket: 'readonly',
        Worker: 'readonly',
        SharedWorker: 'readonly',
        AbortController: 'readonly',
        Event: 'readonly',
        location: 'readonly',
        screen: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        MessageChannel: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        indexedDB: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        clients: 'readonly',
        require: 'readonly',
        module: 'readonly',
        structuredClone: 'readonly',
        AbortSignal: 'readonly',
        ICON: 'readonly',
        ...autoImportGlobals,
      },
    },
  },
]
