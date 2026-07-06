import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import vuetify from 'eslint-plugin-vuetify'

export default [
  ...vuetify.configs['flat/recommended-v4'],
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  {
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      'no-unused-vars': 'off',
      // Vue template formatting — align with upstream project convention
      'vue/html-closing-bracket-spacing': ['error', { selfClosingTag: 'always' }],
      'vue/first-attribute-linebreak': ['error', { multiline: 'below', singleline: 'beside' }],
      'vue/html-closing-bracket-newline': ['error', { multiline: 'always' }],
      'vue/singleline-html-element-content-newline': 'error',
    },
  },
  {
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
      },
    },
  }
]
