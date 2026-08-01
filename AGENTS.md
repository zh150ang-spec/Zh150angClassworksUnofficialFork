# AGENTS.md

本文件为 AI Agent 在本仓库中工作时提供指导。

## 项目概况

Classworks 是适用于班级大屏的作业板工具。基于 Vue 3 + Vuetify 4 PWA，通过 Socket.IO 实现实时同步。UI 为中文。

| 属性 | 值 |
|---|---|
| 项目名称 | Classworks 作业板 |
| 框架 | Vue 3.5 + Vuetify 4 + Vue Router 5 + Pinia 4 |
| 构建工具 | Vite 8 |
| 包管理器 | pnpm（项目根目录有 `pnpm-workspace.yaml`） |
| 语言 | JavaScript（非 TypeScript） |
| CSS 预处理 | Sass (`sass-embedded 1.77.8`) |
| 路径别名 | `@/` → `src/` |
| 开发端口 | 3031 |
| 数据层 | 纯前端（IndexedDB 本地 + 远程 KV 服务），**无自有后端** |
| 部署 | GitHub Pages（`pnpm run build` 生成 `dist/`），Vercel |
| PWA | 是（`vite-plugin-pwa` + Workbox，SW 在 `src/sw.js`） |
| 图标体系 | MDI（`@mdi/font`），集中定义在 `src/utils/icons.js` |

## 命令

```bash
pnpm install          # 安装依赖
pnpm run dev          # 开发服务器，localhost:3031（局域网可访问）
pnpm run build        # 生产构建（自动执行 prebuild 重新生成声音列表）
pnpm run preview      # 预览生产构建
pnpm run lint         # ESLint 检查并自动修复
```

## 技术栈

- **框架**：Vue 3（Composition API + Options API 混用），JavaScript（非 TypeScript）
- **UI**：Vuetify 4，`@mdi/font` 图标，SCSS
- **状态管理**：Pinia 4
- **路由**：Vue Router 5，基于文件的路由（`unplugin-vue-router` + `vite-plugin-vue-layouts`）
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

`src/utils/settings.js` — 基于 localStorage 的完整设置系统，包含类型定义、默认值和旧版迁移。约 600 行。

### UI 层

基于文件的路由：`src/pages/` 中每个 `.vue` 文件自动成为路由。布局在 `src/layouts/`。主仪表盘为 `src/pages/index.vue`（78KB — 核心视图，组合了作业网格、时间卡片、噪音监测、随机抽选、考试日程等）。

组件按功能组织：
- `src/components/home/` — 首页组件
- `src/components/settings/` — 设置卡片
- `src/components/auth/` — 认证流程
- `src/components/attendance/` — 考勤管理
- `src/components/common/` — 通用组件

### 关键工具

- `src/axios/axios.js` — Axios 实例，含认证拦截器和速率限制处理
- `src/utils/api.js` — API 辅助函数、命名空间信息、服务端轮转
- `src/utils/visitorId.js` — FingerprintJS 设备识别
- `src/utils/soundList.js` — 由 `scripts/generate-sound-list.js` 从 `public/sounds/` 自动生成（作为 `prebuild` 运行）

## 代码风格

- 2 空格缩进，去除行尾空白（`.editorconfig`）
- 路径别名：`@/` 映射到 `src/`（`jsconfig.json`）
- ESLint flat config，Vue 推荐规则（`eslint.config.js`）
- Composition API 和 Options API 混用
- 不使用 TypeScript

## 设计规则

### 卡片悬浮效果
卡片在悬浮时不得上浮、改变阴影层级或产生变换。禁止 translateY、elevation 变化、悬浮时添加阴影。卡片在鼠标悬浮时应保持视觉静止。

### 自动保存通知
自动保存的设置（如通过 SettingItem 的 setSetting）不得触发任何应用内通知（$message）。仅用户主动发起的保存操作（如点击"保存"按钮）才可显示确认弹窗。

### 输入框圆角
所有输入框左右两侧的 border-radius 必须对称。不得出现不对称的圆角。

---

## Agent 防护规则

### 包管理与构建命令

- **本项目使用 pnpm，禁止使用 npm 作为包管理器。** 禁止 `npm install`、`npx vite`、`npx eslint`。
- **禁止使用 `npx` 运行 `devDependencies` 中的工具。** 使用 `pnpm lint` 而非 `npx eslint`。
- **禁止修改 `package.json` 中的 `scripts` 字段**，除非用户明确要求。

### 文件结构约定

- **纯 JavaScript 项目，禁止引入 TypeScript 文件（`.ts`）。** 不要创建 `tsconfig.json`，不要加类型注解。
- **路径别名 `@/`** 已配置，始终使用 `@/` 导入，不要使用相对路径。
- **组件自动导入已配置。** 不要手动 import 已自动导入的 Vue API（`ref`、`computed`、`watch`、`useRouter` 等）。
- **Vue 单文件组件文件名使用 PascalCase。**

### UI 框架约束

- **Vuetify 4.x 组件自动导入**，不要手动 import Vuetify 组件。
- **图标体系使用 MDI**，集中定义在 `src/utils/icons.js` 的 `ICON` 对象中。使用图标时通过 `ICON` 引用，禁止直接写 `mdi-xxx` 字符串。新增图标需先添加到 `ICON` 对象（全大写 + 下划线命名）。
- **主题色定义在 `src/plugins/vuetify.js`**，不要硬编码颜色值。
- **Sass 使用 `modern-compiler`**，用 `:deep()` 代替已废弃的 `::v-deep`。

### 数据层与后端相关

- **本项目是纯前端应用，没有自有后端服务器。禁止要求或尝试修改后端代码。**
- **远程数据存储使用外部 KV 服务。** 禁止请求修改远程服务的逻辑和行为。
- **数据提供者模式有五种：** `local`、`kv-server`、`classworkscloud`、`dual-cloud`、`dual-server`。修改数据读写逻辑时必须兼容所有模式。
- **环境变量以 `VITE_` 开头**，使用 `import.meta.env.VITE_XXX`，不要使用 `process.env`。
- **HTTP 请求优先使用 `@/axios/axios.js` 实例。** 部分组件直接 `import axios from 'axios'` 是既有代码，不要为了统一而批量修改。

### PWA 与 Service Worker

- **SW 文件为 `src/sw.js`，由 `vite-plugin-pwa` 以 `injectManifest` 策略构建。** 不要在 `public/` 下放 `sw.js`，不要手动编写缓存逻辑。
- **PWA manifest 配置在 `vite.config.mjs` 中。** 不要单独创建 `manifest.json`。

### Git 与部署

- **禁止执行 `git push`。** 所有修改仅供本地使用。
- **部署目标是 GitHub Pages 和 Vercel（静态站点）。** 不要尝试 SSR 或 Node.js 后端。
- **`vercel.json` 已配置**，不要修改，除非用户明确要求。
- **`base: './'` 配置表示相对路径部署。** 所有资源引用使用相对路径。

---

## 代码风格补充

- **新增组件优先使用 Composition API + `<script setup>` 语法。** 修改旧文件时保持原有风格，不要将 Options API 重写为 Composition API。
- **Composables** 放在 `src/composables/`，命名以 `use` 开头。
- **工具函数** 放在 `src/utils/`，不要在其中放置 Vue 组件或 composables。
- **Pinia store** 放在 `src/stores/`。
- **页面组件** 放在 `src/pages/`。
- **ESLint 使用 flat config（`eslint.config.js`）。** 不要创建 `.eslintrc.js` 或 `.eslintrc.json`。
- **`vue/multi-word-component-names` 规则已关闭。** 组件名可以使用单词形式。

---

## 危险操作警告清单

以下操作必须先向用户报告并获得同意后才能执行：

1. 删除任何 `src/` 下的文件
2. 修改 `vite.config.mjs`
3. 修改 `package.json` 的 `dependencies` 或 `devDependencies`
4. 修改 `src/plugins/vuetify.js` 中的主题配置
5. 修改 `src/utils/dataProvider.js` 或其 provider 文件
6. 修改 `src/sw.js`
7. 修改 `src/router/index.js`
8. 执行 `git reset`、`git checkout`、`git clean`
9. 批量修改多个组件文件的 import 语句
10. 安装新的 npm 包
11. 将任何 Options API 文件重写为 Composition API

---

## 快速参考卡

```
语言: JavaScript (非 TypeScript)
包管理: pnpm (禁止 npm/npx)
框架: Vue 3 + Vuetify 4 + Pinia 4
构建: Vite 8 (禁止直接调用 vite 命令)
后端: 无 (禁止修改后端，所有功能在前端实现)
路径: @/ = src/
图标: MDI (@mdi/font)，集中定义在 src/utils/icons.js 的 ICON 对象中
自动导入: Vue API / Vuetify 组件 / 自定义组件均已配置
主题: Apple Design System 配色，定义在 src/plugins/vuetify.js
组件风格: 新增用 Composition API (script setup)，旧文件保持 Options API 不动
部署: 静态站点 (GitHub Pages / Vercel)
Git: 禁止 push / 禁止 git merge 合并 PR
```

---

## PR 合并安全指南

本章节适用于将远程 PR 合并到本地定制版本的场景。

### 核心原则

#### 1. 永不自动提交
- **绝对禁止**自动将合并结果提交到远程仓库
- 本地定制版本是用户私有的，所有更改仅供本地使用
- 只进行本地修改

#### 2. 手动合并优先
当本地有未提交的更改时，采用手动合并而非 git merge：
```
❌ 错误做法：git merge pr-xxx（可能产生冲突，难以控制）
✅ 正确做法：
   1. git fetch origin pull/xxx/head:pr-xxx
   2. git show pr-xxx -p 查看具体更改
   3. 手动应用更改到本地文件
```

#### 3. 合并前必须检查
- 检查本地是否有修改过 PR 涉及的文件
- 分析 PR 的具体更改内容（逐个 commit）
- 评估与本地定制代码的兼容性

#### 4. 逐文件、逐功能合并
- 不要一次性合并所有更改，要按PR的功能点逐个应用
- 每个功能点合并后立即验证

### 合并流程

#### 步骤 1：获取 PR
```bash
git fetch origin pull/xxx/head:pr-xxx
```

#### 步骤 2：分析更改
```bash
git log pr-xxx --oneline -10
git show pr-xxx -p
```

#### 步骤 3：读取本地文件
使用 Read 工具读取 PR 涉及的本地文件，了解当前状态。

#### 步骤 4：手动应用更改
使用 Edit 工具精确应用更改，避免覆盖本地定制内容。

#### 步骤 5：验证
- 运行 lint 检查：`pnpm lint`
- 确保无错误后再继续

#### 步骤 6：报告结果
向用户清晰报告：
- 合并了哪些文件
- 添加了什么功能
- 是否有需要用户注意的事项

### 冲突处理

#### 发现冲突时
1. **立即停止合并**，避免覆盖本地定制代码
2. 向用户报告冲突详情
3. 提供解决方案选项
4. 等待用户确认后再继续

#### 本地代码优先
当 PR 更改与本地定制代码冲突时：
- 保留本地定制代码
- 尝试将 PR 功能以兼容方式添加
- 无法兼容时询问用户

### 禁止事项

1. ❌ 禁止使用 `git merge` 直接合并到有本地更改的分支
2. ❌ 禁止运行 `git push`
3. ❌ 禁止覆盖用户本地定制的代码
4. ❌ 禁止在未验证的情况下批量应用更改

### 示例：安全合并 PR

```
用户请求：合并 PR #49

正确流程：
1. git fetch origin pull/49/head:pr-49
2. git show pr-49 -p → 发现修改 TimeCard.vue 和 settings.js
3. Read TimeCard.vue → 发现本地有大量定制
4. Read settings.js → 发现本地结构不同
5. 手动提取 PR 的核心更改：
   - 添加 timeCard.use12h 设置项
   - 修改 timeString 计算属性
   - 添加 amPmString 计算属性
   - 添加 UI 开关
6. 使用 Edit 工具逐个应用
7. pnpm lint 验证
8. 报告完成，不提交
```
