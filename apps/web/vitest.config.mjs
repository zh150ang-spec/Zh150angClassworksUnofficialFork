import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import Vue from '@vitejs/plugin-vue'

// 单测配置：与 vite.config.mjs 分离，避免为了加测试而改动构建配置（危险操作清单 #2）。
// 运行：pnpm --filter @classworks/web exec vitest run
export default defineConfig({
  define: {
    // sw.js 使用构建期注入的版本号（见 vite.config.mjs 的 replace 插件）
    __APP_VERSION__: JSON.stringify('0.0.0-test'),
  },
  plugins: [Vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    setupFiles: ['./vitest.setup.js'],
    restoreMocks: true,
    clearMocks: true,
  },
})
