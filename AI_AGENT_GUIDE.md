# Classworks AI Agent 提示库

> 本文档为你（AI Agent）提供项目上下文约束，防止你在自动编码过程中做出错误的操作决策。

---

## 二、本项目概况
| 属性 | 值 |
|---|---|
| 项目名称 | Classworks 作业板 |
| 框架 | Vue 3.5 + Vuetify 4 + Vue Router 5 + Pinia 3 |
| 构建工具 | Vite 5.4 |
| 包管理器 | pnpm（项目根目录有 `pnpm-workspace.yaml`） |
| 语言 | JavaScript（非 TypeScript） |
| CSS 预处理 | Sass (`sass-embedded 1.77.8`) |
| 路径别名 | `@/` → `src/` |
| 开发端口 | 3031 |
| 数据层 | 纯前端（IndexedDB 本地 + 远程 KV 服务），**无自有后端** |
| 部署 | GitHub Pages（`npm run build` 生成 `dist/`），Vercel |
| PWA | 是（`vite-plugin-pwa` + Workbox，SW 在 `src/sw.js`） |
| 图标体系 | MDI（`@mdi/font`），集中定义在 `src/utils/icons.js` |

---

## 三、Agent 典型错误清单与防护规则

以下每一条都是从实际 agent coding 场景中总结的高频错误。

### 3.1 包管理与构建命令

**规则：本项目使用 pnpm，禁止使用 npm 作为包管理器。**

```bash
# ❌ 禁止
npm install
npm run dev
npx vite
npx eslint

# ✅ 正确
pnpm install
pnpm dev
pnpm build
pnpm lint
```

***规则：禁止使用 `npx` 来运行任何已存在于 `devDependencies` 中的工具（vite、eslint 等）。*** 如果需要执行 lint，使用 `pnpm lint`，不要用 `npx eslint`。

**规则：禁止修改 `package.json` 中的 `scripts` 字段，除非用户明确要求。** agent 经常试图添加新的 npm scripts，这会引入不可预期的行为。

### 3.2 文件结构约定

**规则：项目是纯 JavaScript 项目（`.js`、`.vue`），禁止引入 TypeScript 文件（`.ts`）。** 不要创建 `tsconfig.json`，不要给任何文件加 TypeScript 类型注解，不要安装 TypeScript 相关依赖。

**规则：路径别名 `@/` 已在 `vite.config.mjs` 和 `jsconfig.json` 中配置完成。** 在代码中始终使用 `@/` 导入，不要使用相对路径如 `../../utils/settings`。

**规则：组件自动导入已配置。** `unplugin-vue-components` 自动扫描 `src/components/**/[A-Z]*.vue`，`unplugin-auto-import` 自动导入 `vue` 和 `vue-router` 的 API。不要手动 import 已自动导入的 Vue API（如 `ref`、`computed`、`watch`、`useRouter` 等）。

**规则：Vue 单文件组件文件名使用 PascalCase。** 如 `TimeCard.vue`，不要创建 `timeCard.vue` 或 `time-card.vue`。

### 3.3 UI 框架约束

**规则：本项目使用 Vuetify 4.x，禁止引入其他 UI 框架。** 如果需要 UI 组件，使用 Vuetify 提供的组件（`v-btn`、`v-card`、`v-dialog`、`v-text-field` 等）。

**规则：Vuetify 组件自动导入已通过 `vite-plugin-vuetify` 配置，不要在代码中手动 import Vuetify 组件。**

**规则：图标体系使用 MDI（Material Design Icons），字体包为 `@mdi/font`。** 图标名称集中定义在 `src/utils/icons.js` 的 `ICON` 对象中。使用图标时应通过该文件引用，而非在模板中直接写图标名字符串。

```vue
<!-- ❌ 禁止：在模板中直接写 mdi-xxx 字符串 -->
<v-icon icon="mdi-check" />
<v-icon>mdi-close</v-icon>

<!-- ✅ 正确：通过 ICON 常量引用 -->
<script setup>
import { ICON } from '@/utils/icons'
</script>
<template>
  <v-icon :icon="ICON.CHECK" />
  <v-icon :icon="ICON.CLOSE" />
</template>
```

**规则：如需使用 `ICON` 对象中不存在的 MDI 图标，先将新图标添加到 `src/utils/icons.js` 的 `ICON` 对象中（遵循全大写 + 下划线命名），然后引用。** 不要在组件中直接写字符串。添加前需查阅 [MDI 图标库](https://pictogrammers.com/library/mdi/) 确认图标名称真实存在。

**规则：主题色定义在 `src/plugins/vuetify.js` 中，包含 dark 和 light 两套 Apple Design System 配色。** 不要在其他文件中硬编码颜色值，应使用 `useTheme().current.value.colors` 获取当前主题颜色，或使用 CSS 变量。

**规则：Sass API 使用 `modern-compiler`。** 不要使用 `::v-deep`（已废弃），使用 `:deep()` 代替。

### 3.4 数据层与后端相关

**核心规则：本项目是纯前端应用，没有自有后端服务器。禁止要求或尝试修改后端代码。** 所有功能必须在前端实现。

**规则：远程数据存储使用外部 KV 服务（`kv-service.houlang.cloud`）。** Agent 不应修改远程服务的行为。如果数据操作需要在本地完成，使用 `dataProvider.js` 的统一接口。

**规则：数据提供者模式有四种：`local`（仅本地 IndexedDB）、`kv-server`（仅云端）、`classworkscloud`（Classworks 云服务）、`dual-cloud` / `dual-server`（双模式）。** 修改数据读写逻辑时必须兼容所有模式。

**规则：环境变量以 `VITE_` 开头（`VITE_DEFAULT_KV_SERVER`、`VITE_DEFAULT_AUTH_SERVER`）。** 不要使用 `process.env`（已在 vite 配置中 mock 为空对象）。使用 `import.meta.env.VITE_XXX`。

**规则：HTTP 请求优先使用项目内的 `@/axios/axios.js` 实例。** 该实例已配置了基础拦截器和错误处理。但注意：项目中存在部分组件直接 `import axios from 'axios'` 的情况（如 `DataProviderSettingsCard.vue`、`HitokotoCard.vue`、`HitokotoSettings.vue`），这是既有代码，不要为了统一而批量修改它们。

### 3.5 PWA 与 Service Worker

**规则：Service Worker 文件为 `src/sw.js`，由 `vite-plugin-pwa` 以 `injectManifest` 策略构建。** 不要在 `public/` 目录下放置 `sw.js`，不要手动编写缓存逻辑（已由 Workbox 处理）。

**规则：PWA manifest 配置在 `vite.config.mjs` 中。** 修改应用名称、图标等应修改该配置，不要单独创建 `manifest.json`。

### 3.6 Git 与 PR 操作

**规则：本项目是上游仓库的本地定制版本，禁止执行 `git push`。**

**规则：合并 PR 时禁止使用 `git merge`。** 必须手动逐文件、逐功能应用 PR 的更改（使用 Read + SearchReplace）。详见 `pr-merge-guidelines.md`。

**规则：禁止自动提交到远程仓库。** 因为***所有修改仅供本地使用***。

### 3.7 部署相关

**规则：部署目标是 GitHub Pages 和 Vercel，均为静态站点托管。** 不要尝试配置服务器端渲染（SSR）、Node.js 后端、或任何需要服务器运行时的方案。

**规则：`vercel.json` 已配置 SPA rewrite 和缓存策略。** 不要修改该文件，除非用户明确要求调整缓存策略。

**规则：`base: './'` 配置表示相对路径部署。** 所有资源引用必须使用相对路径，不要使用绝对路径（`/assets/xxx` 应为 `./assets/xxx`）。

### 3.8 敏感信息与安全

**规则：代码中出现的 token、API key（如 `VITE_APP_ID`）仅供部署使用。** 不要在代码中暴露真实 token 值，不要将 `.env` 文件提交到版本控制。

**规则：Sentry DSN、Clarity ID 等监控服务的配置写死在代码中是有意为之（仅用于前端错误追踪）。** 不要尝试将其移至后端。

---

## 四、代码风格与格式约束

**规则：新增组件优先使用 Composition API + `<script setup>` 语法。** 但项目中有大量既有页面使用 Options API（`data()`、`methods`、`computed` 等，如 `index.vue`、`settings.vue`、`examschedule.vue`、`list/[id].vue` 等），这些是历史代码。新增代码用 Composition API，修改旧文件时保持原有风格不变，不要将 Options API 重写为 Composition API。

```vue
<!-- ✅ 新增组件使用 script setup -->
<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<!-- ✅ 修改旧 Options API 文件时保持原样 -->
<script>
export default {
  data() {
    return { count: 0 }
  }
}
</script>

<!-- ❌ 禁止：将旧文件的 Options API 强行重写为 Composition API -->
```

**规则：Composables 文件放在 `src/composables/` 目录下，命名以 `use` 开头（如 `useAutoRefresh.js`）。**

**规则：工具函数放在 `src/utils/` 目录下。不要在 `src/utils/` 中放置 Vue 组件或 composables。**

**规则：Pinia store 放在 `src/stores/` 目录下。** 如果需要新增全局状态，在已有 store 中扩展或新建 store 文件。

**规则：页面组件放在 `src/pages/` 目录下。** 新增页面需在 `src/router/index.js` 中注册路由。

**规则：ESLint 配置已在 `eslint.config.js` 中完成，使用 flat config 格式。** 不要创建 `.eslintrc.js` 或 `.eslintrc.json`。

**规则：`vue/multi-word-component-names` 规则已关闭。** 组件名可以使用单词形式（如 `CacheManager.vue`）。

---

## 五、危险操作警告清单

以下操作必须先向用户报告并获得同意后才能执行：

1. **删除任何 `src/` 下的文件** — 可能导致功能丢失
2. **修改 `vite.config.mjs`** — 可能破坏构建流程
3. **修改 `package.json` 的 `dependencies` 或 `devDependencies`** — 可能引入不兼容的版本
4. **修改 `src/plugins/vuetify.js` 中的主题配置** — 影响全局视觉
5. **修改 `src/utils/dataProvider.js` 或其 provider 文件** — 影响数据读写核心逻辑
6. **修改 `src/sw.js`** — 影响 PWA 离线功能
7. **修改 `src/router/index.js`** — 影响路由结构
8. **执行 `git reset`、`git checkout`、`git clean`** — 不可逆的 Git 操作
9. **批量修改多个组件文件的 import 语句** — 可能破坏自动导入机制
10. **安装新的 npm 包** — 可能引入不兼容或安全风险
11. **将任何 Options API 文件重写为 Composition API** — 改动面太大，容易引入回归缺陷
12. **批量统一 `import axios` 的引用方式** — 既有代码中存在直接引用 axios 的特例，不应批量修改

---

## 六、快速参考卡（你启动时优先阅读）

```
语言: JavaScript (非 TypeScript)
包管理: pnpm (禁止 npm/npx)
框架: Vue 3 + Vuetify 4 + Pinia 3
构建: Vite 5.4 (禁止直接调用 vite 命令)
后端: 无 (禁止修改后端，所有功能在前端实现)
路径: @/ = src/
图标: MDI (@mdi/font)，集中定义在 src/utils/icons.js 的 ICON 对象中
自动导入: Vue API / Vuetify 组件 / 自定义组件均已配置
主题: Apple Design System 配色，定义在 src/plugins/vuetify.js
组件风格: 新增用 Composition API (script setup)，旧文件保持 Options API 不动
部署: 静态站点 (GitHub Pages / Vercel)
Git: 禁止 push / 禁止 git merge 合并 PR
```
