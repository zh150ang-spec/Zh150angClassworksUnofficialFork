// Plugins
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Fonts from 'unplugin-fonts/vite'
import Layouts from 'vite-plugin-vue-layouts'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'
//import { TDesignResolver } from 'unplugin-vue-components/resolvers'

// Utilities
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    VueRouter(),
    vueDevTools(),
    Layouts(),
    Vue({
      template: { transformAssetUrls }
    }),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        navigateFallback: 'index.html',
        enabled: false,
        suppressWarnings: true,
      },

      injectRegister: 'auto',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',


      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf,eot,webmanifest}'],
      },
      manifest: {
        lang: 'zh-CN',
        name: 'Classworks作业板',
        short_name: 'Classworks',
        description: '记录，查看并同步作业',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: './',
        edge_side_panel: {
          default_path: './',
        },
        icons: [
          {
            src: './pwa/image/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: './pwa/image/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: './pwa/image/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: './pwa/image/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: '随机点名',
            short_name: '随机点名',
            url: './#random-picker',
            icons: [
              {
                src: './pwa/image/pwa-64x64.png',
                sizes: '64x64',
                type: 'image/png'
              }
            ]
          },
        ],
      }
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify({
      autoImport: true,
      styles: {
        configFile: 'src/styles/settings.scss',
      },
    }),
    Components({
      directoryAsNamespace: false,
      globs: ['src/components/**/[A-Z]*.vue'],
      exclude: [/pages\/index\.vue$/],
    }),
    Fonts({
      preload: false,
      display: 'swap',
      google: false,
      custom: [],
    }),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
      ],
      eslintrc: {
        enabled: true,
      },
      vueTemplate: true,
    }),
  ],
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  build: {
    // ===== Chunk 分割优化 =====
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          // 核心框架（极少变动，长缓存）
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          // UI 框架
          'vendor-vuetify': ['vuetify'],
          // 监控（异步加载，独立 chunk）
          'vendor-sentry': ['@sentry/vue'],
          // 实时通信
          'vendor-socket': ['socket.io-client'],
          // 通用工具库
          'vendor-utils': ['axios', 'uuid', 'js-base64'],
        },
      },
    },
  },
  server: {
    port: 3031,
  },
  css: {
    preprocessorOptions: {
      sass: {
        api: 'modern-compiler',
      },
    },
  },
})
