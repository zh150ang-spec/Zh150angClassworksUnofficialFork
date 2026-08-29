# Pages

`src/pages/**/*.vue` 通过 [vue-router/auto](https://router.vuejs.org/) **自动转换为路由**（文件名即路径）。

## 目录说明

| 文件 | 路由 | 说明 |
|------|------|------|
| `index.vue` | `/` | 首页（作业板） |
| `settings.vue` | `/settings` | 设置页 |
| `examschedule.vue` | `/examschedule` | 考试看板 |
| `list/index.vue` `list/[id].vue` | `/list`、`/list/:id` | 列表 |
| `exam-editor/[id].vue` | `/exam-editor/:id` | 考试编辑器 |
| `authorize.vue` | `/authorize` | OAuth 授权回调 |
| `cses2wakeup.vue` | `/cses2wakeup` | CSES2 唤醒页 |
| `CacheManagement.vue` | `/CacheManagement` | 缓存管理 |
| `404.vue` | 兜底 | 404 |

## 调试 / 诊断页

`debug.vue`、`debug-init.vue`、`debug-socket.vue`、`socket-debugger.vue` 为开发期诊断页。
生产构建中由 `src/router/index.js` 的路由守卫统一重定向到首页（`DEBUG_PATHS`），仅开发环境可访问，避免线上暴露内部诊断信息。