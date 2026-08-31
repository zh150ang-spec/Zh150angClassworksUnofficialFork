# 技术栈与架构

> 本文档是 AGENTS.md 的补充，提供技术栈详细介绍与架构背景。仅在需要了解系统结构时参阅。

## 技术栈

- **框架**：Vue 3（Composition API + Options API 混用），JavaScript（非 TypeScript）

- **UI**：Vuetify 4，`@mdi/font` 图标，SCSS

- **状态管理**：Pinia 4

- **路由**：Vue Router 5，基于文件的自动路由（`vue-router/auto` 内建文件路由 + `vite-plugin-vue-layouts-next`）

- **构建**：Vite 8，pnpm

- **实时通信**：Socket.IO 客户端（单例，位于 `src/utils/socketClient.js`）

- **数据层**：可插拔 KV Provider 抽象（`src/utils/dataProvider.js`），支持 IndexedDB 本地和 HTTP 服务端后端

- **PWA**：`vite-plugin-pwa` + Workbox Service Worker

## 架构

### 数据层

`src/utils/dataProvider.js` 抽象数据操作，根据配置路由到：

- `src/utils/providers/kvLocalProvider.js` — IndexedDB（通过 `idb`）

- `src/utils/providers/kvServerProvider.js` — HTTP API（通过 axios）

服务端故障转移由 `src/utils/serverRotation.js` 处理。

### 实时通信层

`src/utils/socketClient.js` — Socket.IO 单例，基于 room 的 token join/leave 实现实时更新。

### 设置层

`src/utils/settings.js` — 基于 localStorage 的完整设置系统，包含类型定义、默认值和旧版迁移。

### UI 层

基于文件的路由：`src/pages/` 中每个 `.vue` 文件自动成为路由。布局在 `src/layouts/`。主仪表盘为 `src/pages/index.vue`（核心视图，耦合了作业网格、时间卡片、随机抽选、考试日程等）。

组件按功能组织：

- `src/components/home/` — 首页组件（含作业板、考勤）

- `src/components/settings/` — 设置卡片

- `src/components/auth/` — 认证流程

- `src/components/system/` — 初始化 / 服务 / PWA 基础设施

- `src/components/editing/` — 作业 / 考试编辑

- `src/components/common/` — 通用组件

### 关键工具

- `src/axios/axios.js` — Axios 实例，含认证拦截器和速率限制处理

- `src/utils/visitorId.js` — FingerprintJS 设备识别

- `src/utils/soundList.js` — 由 `scripts/generate-sound-list.js` 从 `public/sounds/` 自动生成（作为 `prebuild` 运行）
