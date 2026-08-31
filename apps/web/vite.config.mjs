// Plugins
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Fonts from 'unplugin-fonts/vite'
import Layouts from 'vite-plugin-vue-layouts-next'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'
import replace from '@rollup/plugin-replace'
//import { TDesignResolver } from 'unplugin-vue-components/resolvers'

// Utilities
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import vueDevTools from 'vite-plugin-vue-devtools'
import packageJson from './package.json' with { type: 'json' }

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    'process.env': {},
  },
  plugins: [
    VueRouter(),
    mode === 'development' && vueDevTools(),
    Layouts(),
    Vue({
      template: { transformAssetUrls },
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
      injectManifest: {
        plugins: [
          replace({
            preventAssignment: true,
            values: {
              __APP_VERSION__: JSON.stringify(packageJson.version),
            },
          }),
        ],
      },

      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,txt,json,woff2,ttf,mp3}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io\//],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => {
              return sameOrigin && url.pathname.startsWith('/assets/')
            },
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 天
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url, sameOrigin }) => {
              return sameOrigin && url.pathname.startsWith('/sounds/')
            },
            handler: 'CacheFirst',
            options: {
              cacheName: 'sound-cache',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 天
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url, sameOrigin }) => {
              return sameOrigin && url.pathname.startsWith('/pwa/')
            },
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'pwa-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 天
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // 匹配当前域名下除了上述规则外的所有请求
            urlPattern: ({ url, sameOrigin }) => {
              if (!sameOrigin) return false
              const path = url.pathname
              // 排除已经由其他规则处理的路径
              return !(
                path.includes('/assets/') ||
                path.includes('/pwa/') ||
                path.includes('/sounds/')
              )
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'other-resources',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 1 天
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        additionalManifestEntries: [],
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        lang: 'zh-CN',
        id: '7C24F2B3.ClassworksPWA',
        name: 'Classworks PWA',
        short_name: 'Classworks PWA',
        description: '适用于班级大屏的作业板小工具，支持记录、查看并同步作业。',
        theme_color: '#212121',
        background_color: '#212121',
        dir: 'ltr',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui', 'fullscreen'],
        start_url: './',
        scope: './',
        orientation: 'any',
        categories: ['education', 'productivity', 'utilities'],
        prefer_related_applications: false,
        launch_handler: {
          client_mode: 'navigate-existing',
        },
        screenshots: [
          {
            src: './images/1.jpeg',
            sizes: '1901x1080',
            type: 'image/jpeg',
            form_factor: 'wide',
            label: 'Classworks 作业板主界面',
          },
          {
            src: './images/2.jpeg',
            sizes: '1901x1080',
            type: 'image/jpeg',
            form_factor: 'wide',
            label: 'Classworks 设置与管理界面',
          },
        ],
        file_handlers: [
          {
            action: './?file-handler=true',
            accept: {
              'application/octet-stream': ['.csb', '.csi'],
              'application/x-classworks-backup': ['.csb'],
              'application/x-classworks-install': ['.csi'],
            },
          },
        ],
        protocol_handlers: [
          {
            protocol: 'cs',
            url: './?protocol=%s',
          },
        ],
        icons: [
          {
            src: './pwa/image/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: './pwa/image/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: './pwa/image/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: './pwa/image/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
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
                type: 'image/png',
              },
            ],
          },
        ],
      },
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
      preload: true,
      display: 'swap',
      google: {
        preconnect: true,
        families: [
          {
            name: 'Noto Serif SC',
            styles: 'wght@300;400;500;600;700',
            defer: true,
          },
        ],
      },
    }),
    AutoImport({
      imports: ['vue', 'vue-router'],
      eslintrc: {
        enabled: true,
      },
      vueTemplate: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue'],
  },
  build: {
    // ===== Chunk 分割优化 =====
    chunkSizeWarningLimit: 500,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // 核心框架（极少变动，长缓存）
            { test: /[\\/]node_modules[\\/](vue|vue-router|pinia)[\\/]/, name: 'vendor-vue' },
            // UI 框架
            { test: /[\\/]node_modules[\\/]vuetify[\\/]/, name: 'vendor-vuetify' },
            // 监控（异步加载，独立 chunk）
            { test: /[\\/]node_modules[\\/]@sentry[\\/]vue[\\/]/, name: 'vendor-sentry' },
            // 实时通信
            { test: /[\\/]node_modules[\\/]socket\.io-client[\\/]/, name: 'vendor-socket' },
            // 通用工具库
            { test: /[\\/]node_modules[\\/](axios|uuid|js-base64)[\\/]/, name: 'vendor-utils' },
          ],
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
}))
