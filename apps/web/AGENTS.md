# AGENTS.md

本文件为 AI Agent 在本仓库的`@classworks/web`包内的工作提供指导。低频背景与专业指南位于 `docs/`，需要时按路由表读取。本文件适用于 `apps/web`（`@classworks/web`）包内工作；monorepo 整体结构与根命令见仓库根 `AGENTS.md`。涉及 web 的命令与规范以本文件为准，根文档对其做透传引用，二者保持一致。

## 项目概况

Classworks 是适用于班级大屏的作业板工具。基于 Vue 3 + Vuetify 4 PWA，通过 Socket.IO 实现实时同步。UI 为中文。

| 属性      | 值                                                                                |
| ------- | -------------------------------------------------------------------------------- |
| 项目名称    | Classworks 作业板                                                                   |
| 框架      | Vue 3.5 + Vuetify 4 + Vue Router 5 + Pinia 4                                     |
| 构建工具    | Vite 8                                                                           |
| 包管理器    | pnpm（monorepo，仓库根有 `pnpm-workspace.yaml`）                                        |
| 语言      | JavaScript（非 TypeScript）                                                         |
| CSS 预处理 | Sass (`sass-embedded`)                                                           |
| 路径别名    | `@/` → `src/`                                                                    |
| 开发端口    | 3031                                                                             |
| 数据层     | 纯前端（IndexedDB 本地 + 远程 KV 服务）；本仓库含 `apps/server` 后端（见根 `AGENTS.md`），web 不直接维护后端实现 |
| 部署      | GitHub Pages（`pnpm run build` 生成 `dist/`），Vercel                                 |
| PWA     | 是（`vite-plugin-pwa` + Workbox，SW 在 `src/sw.js`）                                  |
| 图标体系    | MDI（`@mdi/font`），集中定义在 `src/utils/icons.js`                                      |

## 命令

```bash
pnpm install          # 安装依赖
pnpm run dev          # 开发服务器，localhost:3031（局域网可访问）
pnpm run build        # 生产构建（自动执行 prebuild 重新生成声音列表）
pnpm run preview      # 预览生产构建
pnpm run lint         # oxlint 主检查（JS/script）+ ESLint 补充检查 Vue 模板规则
```

> 注：以上命令在 `apps/web` 目录内执行；或从仓库根用 `pnpm --filter @classworks/web run <script>`。

## 设计规则

### 卡片悬浮效果

卡片在悬浮时不得上浮、改变阴影层级或产生变换。禁止 translateY、elevation 变化、悬浮时添加阴影。卡片在鼠标悬浮时应保持视觉静止。

### 自动保存通知

自动保存的设置（如通过 SettingItem 的 setSetting）不得触发任何应用内通知（$message）。仅用户主动发起的保存操作（如点击"保存"按钮）才可显示确认弹窗。

### 输入框圆角

所有输入框左右两侧的 border-radius 必须对称。不得出现不对称的圆角。

***

## Agent 防护规则

### 包管理与构建命令

* **本项目使用 pnpm，禁止使用 npm 作为包管理器。** 禁止 `npm install`、`npx vite`、`npx oxlint`。

* **禁止使用** **`npx`** **运行** **`devDependencies`** **中的工具。** 使用 `pnpm lint` 而非 `npx oxlint`。

* **禁止修改** **`package.json`** **中的** **`scripts`** **字段**，除非用户明确要求。

### 文件结构约定

* **纯 JavaScript 项目，禁止引入 TypeScript 文件（`.ts`）。** 不要创建 `tsconfig.json`，不要加类型注解。

* **路径别名** **`@/`** 已配置，始终使用 `@/` 导入，不要使用相对路径。

* **组件自动导入已配置。** 不要手动 import 已自动导入的 Vue API（`ref`、`computed`、`watch`、`useRouter` 等）。

* **Vue 单文件组件文件名使用 PascalCase。**

### UI 框架约束

* **Vuetify 4.x 组件自动导入**，不要手动 import Vuetify 组件。

* **图标体系使用 MDI**，集中定义在 `src/utils/icons.js` 的 `ICON` 对象中。使用图标时通过 `ICON` 引用，禁止直接写 `mdi-xxx` 字符串。新增图标需先添加到 `ICON` 对象（全大写 + 下划线命名）。

* **主题色定义在** **`src/plugins/vuetify.js`**，不要硬编码颜色值。

* **Sass 使用** **`modern-compiler`**，用 `:deep()` 代替已废弃的 `::v-deep`。

### 数据层与后端相关

* **本项目是纯前端应用，没有自有后端服务器。禁止要求或尝试修改后端代码。**

* **远程数据存储使用外部 KV 服务。** 禁止请求修改远程服务的逻辑和行为。

* **数据提供者模式有五种：** `local`、`kv-server`、`classworkscloud`、`dual-cloud`、`dual-server`。修改数据读写逻辑时必须兼容所有模式。

* **环境变量以** **`VITE_`** **开头**，使用 `import.meta.env.VITE_XXX`，不要使用 `process.env`。

* **HTTP 请求优先使用** **`@/axios/axios.js`** **实例。** 部分组件直接 `import axios from 'axios'` 是既有代码，不要为了统一而批量修改。

### PWA 与 Service Worker

* **SW 文件为** **`src/sw.js`，由** **`vite-plugin-pwa`** **以** **`injectManifest`** **策略构建。** 不要在 `public/` 下放 `sw.js`，不要手动编写缓存逻辑。

* **PWA manifest 配置在** **`vite.config.mjs`** **中。** 不要单独创建 `manifest.json`。

### Git 与部署

* **禁止执行** **`git push`。** 所有修改仅供本地使用。

* **部署目标是 GitHub Pages 和 Vercel（静态站点）。** 不要尝试 SSR 或 Node.js 后端。

* **`vercel.json`** **已配置**，不要修改，除非用户明确要求。

* **`base: './'`** **配置表示相对路径部署。** 所有资源引用使用相对路径。

***

## 代码风格

* 2 空格缩进，去除行尾空白（`.editorconfig`）

* 路径别名：`@/` 映射到 `src/`（`jsconfig.json`）

* 双 lint 工具链：**oxlint 主查**（`.oxlintrc.json`，覆盖 JS 与 `<script>` 块），**ESLint 补查**（`eslint.config.js`，经 `eslint-plugin-oxlint` 去重后仅保留 oxlint 不支持的 Vue 模板解析规则）。不要创建额外的配置文件

* Composition API 和 Options API 混用；不使用 TypeScript

* **新增组件优先使用 Composition API +** **`<script setup>`** **语法。** 修改旧文件时保持原有风格，不要将 Options API 重写为 Composition API

* **Composables** 放在 `src/composables/`，命名以 `use` 开头

* **工具函数** 放在 `src/utils/`，不要在其中放置 Vue 组件或 composables

* **Pinia store** 放在 `src/stores/`；**页面组件** 放在 `src/pages/`；**布局** 在 `src/layouts/`

* **`vue/multi-word-component-names`** **规则已关闭。** 组件名可以使用单词形式

***

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

***

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

***

## 文档路由

低频、专业性的内容已拆分，**需要时读取对应文档**：

| 场景                                              | 读取文档                       |
| ----------------------------------------------- | -------------------------- |
| 需要了解技术栈细节、数据层/实时通信/设置层/UI 层架构、关键工具路径            | `docs/ARCHITECTURE.md`     |
| 涉及子 Agent 协作、样式根因、跨组件改动流程                       | `docs/EXPERIENCE_RULES.md` |
| 用户要求合并远程 PR 到本地定制版本                             | `docs/PR_MERGE_GUIDE.md`   |
| 需要了解离线/同步体系（数据可达性、合并、后台同步、离线队列）                 | `docs/OFFLINE_SYSTEM.md`   |
| 需要了解排版系统（字体/字号/字重/行高/字距/渲染）                     | `docs/TYPOGRAPHY.md`       |
| 需要了解阴影与层级系统（shadow token / z-index / elevation） | `docs/SHADOW_LAYERING.md`  |
| 需要了解版本号规范（SemVer）                               | `docs/VERSIONING.md`       |

