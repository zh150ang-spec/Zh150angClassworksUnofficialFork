# Changelog

本项目遵循 [语义化版本规范 2.0.0](https://semver.org/lang/zh-CN/)（详见 `docs/VERSIONING.md`）。
权威版本号以 `package.json` 的 `version` 字段为准。

> 格式：版本块按时间倒序排列（新在上、旧在下），**两个版本之间以** **`---`** **横线分界**。
> 每个版本内部通过 `###` 小节区分"重构 / 新增 / 修复 / 一致性 / 文档"等类别。

---

## \[0.13.1\] - 2026-10-05

> 自 v0.13.0 以来的工程治理批次：不含任何业务代码改动，也没有新增功能。核心是修好一处长期静默失效的 pnpm 配置，并统一 monorepo 的依赖、lint、CI 与文档口径。

### 修复

- 修复 pnpm 配置从未生效：`nodeLinker: hoisted` 与 `autoInstallPeers` 原先写在 `.npmrc`，而 pnpm 11 不读取该文件的这些项（`pnpm config get node-linker` 返回 `undefined`，`store-dir` 因写在 `pnpm-workspace.yaml` 才生效），实际长期运行在 isolated 布局下。现移入 `pnpm-workspace.yaml`，并删除已失效的 `.npmrc`。该问题此前会导致 ESLint 启动即崩溃、Vite 解析不到 `local-pkg` 与 `sass-embedded`。
- 根 `README.md` 修正指向不存在的 `apps/server/.env.example`，改指 `apps/server/.env.oauth.example`。

### 一致性

- 移除确认无引用的依赖：根 `eslint-plugin-import` / `eslint-plugin-n` / `eslint-plugin-promise`，`apps/web` 的 `@oxlint/migrate` / `baseline-browser-mapping`，`apps/dashboard` 的 `radix-vue`；`pnpm-lock.yaml` 同步且无版本漂移。
- `apps/web/package.json`：删除重复且过期的 `engines`；`vite` 归入 `devDependencies`，`pinia` / `vue-router` 归入 `dependencies`。
- `apps/server/package.json` 去重 `dotenv`；`apps/server`、`apps/dashboard`、`packages/shared` 补齐 `packageManager` 与 `engines`。
- 根 `eslint.config.js` 的 globals 抽成 `COMMON` / `BROWSER` / `NODE_GLOBALS`，并删除指向 `apps/web` 的死配置；`apps/web/eslint.config.js` 的 globals 收敛到 `.oxlintrc.json` 单一真源。
- 按 Prettier 统一 81 个 Vue 单文件组件格式（经 `prettier(HEAD)` 逐字节比对确认纯排版，无逻辑改动）。

### 工程与 CI

- `ci.yml` 新增 web 双 lint（oxlint + ESLint，使用 `exec`、不加 `--fix`），未改动包内 `scripts`。
- `.prettierignore` 排除 prebuild 生成物 `apps/web/src/utils/soundList.js`。
- `.gitignore` 与 `.prettierignore` 新增 `.dsh/` 与 `.agents/`（机器本地的 harness 技能目录，不应发布）。
- 根 `package.json` 删除空壳脚本 `install:all`。

### 文档

- 根 `AGENTS.md` 与 `CLAUDE.md` 整份同步：如实声明各 app 自治理、补全 `utils/socketClient.js` 与 `utils/socket.js`、env 模板指向真实文件、修正 `format:check` 说明与 CI 表格；两份文件保持一致（仅标题一行不同）。
- `apps/web/AGENTS.md`：修正后端描述三处、Git push 规则、两份 `vercel.json` 分工、`.eslintrc-auto-import.json` 例外说明，并补全文档路由表。
- 新增 `apps/web/README.md`。
- 10 篇散落文档归位：`apps/dashboard/docs/`（4 篇）与 `apps/server/docs/`（6 篇）。

---

## \[0.13.0\] - 2026-08-31

> 从 `v0.12.0-beta`（旧单应用版本线）跨越式整理后的首个正式版标志提交：完成迁移为 pnpm monorepo、清理无效残留、补齐文档并把本仓库确立为公开 Fork 的里程碑节点。

### 新增

- 建立 pnpm monorepo 结构：`apps/web`、`apps/server`、`apps/dashboard` 与共享常量包 `packages/shared`，通过 `pnpm-workspace.yaml` 统一管理（`@classworks/shared` 提供请求头、服务器地址等常量）。
- 新增 `docs/VERSIONING.md`、`docs/SHADOW_LAYERING.md`、`docs/TYPOGRAPHY.md`、`docs/OFFLINE_SYSTEM.md` 等排版、阴影、离线体系维度的设计/架构文档。
- 新增 `scripts/scan-ui-issues.js`（UI 问题扫描脚本）。
- 新增面向人类读者的使用教程 `docs/Classworks作业板使用教程 for human.md`（含目录、各模块配图与常用技巧）。

### 重构

- 组件目录按功能域重新归并（`home/`、`common/`、`system/`、`editing/`、`settings/cards/`、`auth/`），并在 `1d34742` 里程碑中完成 web 迁入 `apps/web`。

### 修复

- 修复 `vite-plugin-pwa` 弃用告警，统一 `__APP_VERSION__` 版本注入与 Service Worker 缓存联动。

### 一致性

- 建立双 lint 工具链：oxlint 主查（`apps/web/.oxlintrc.json`）+ ESLint 补查（`apps/web/eslint.config.js`，经 `eslint-plugin-oxlint` 去重），并修正根 `eslint.config.js` 的全局变量与 `no-unused-vars` 配置。
- 统一 pnpm 版本至 `11.24.0`（根与 `apps/web` 的 `packageManager`/`engines`），`pnpm-workspace.yaml` 采用 pnpm 11 的 `allowBuilds` 字段。

### 工程与 CI

- 统一 CI/Docker 构建：新增根级 `vercel.json`（`rootDirectory=apps/web`、`outputDirectory=dist`），更新 `apps/web/vercel.json` 移除失效的 `sw-cache-manager` 缓存头规则。

### 文档

- 融合 `NEWREADME.md` 草稿与既有 `README.md`，重写为公开 Fork 版（明确非官方定位、AGPL-3.0 归因、克隆地址指向公开 fork 仓库）。
- `AGENTS.md` 声明 web 细节以 `apps/web/AGENTS.md` 为准，根文档透传引用；`README.md` 对齐 pnpm 版本要求。
- 移除本次发布涉及到的无效文档：`docs/auto_commit_md/` 一次性提交元数据目录、根 `NEWREADME.md`（已并入 README）。

### 移除

- 移除噪音监测模块相关无用组件（`NoiseMonitorCard`、`NoiseMonitorDetail`、`NoiseSettingsCard` 等），与 Fork 自用定位（保留除噪音监测外功能）一致。
- 移除其它残余：`sw-cache-manager.js`、哈希残留文件、`ExamScheduleCard`、`ProgressiveRegisterPage`、`api.js`、`safeEvents.js`、`smartSyncManager`、`crdtEngine` 等死代码。
- 删除 `apps/server` 下两个空文档（`API_QUICK_REFERENCE.md`、`NEW_APIS_SUMMARY.md`）。

---

## \[0.12.0-beta\] - 2026-08-30

> 自 `v0.11.1-beta` 之后的设置页功能改进与工程治理批次。

### 新增

- 全新「同步」设置卡片 `SyncSettingsCard`，从 `RefreshSettingsCard` 拆分而来，将同步相关配置集中展示与调整。

- 新增 `docs/SHADOW_LAYERING.md`、`docs/TYPOGRAPHY.md` 两份排版与阴影/层级系统分析文档。

### 重构

- 设置页标签重组，收敛导航粒度：

  - 新设「人员与考勤」标签（原「人员管理」），承接 `TeacherListCard`、`StudentListCard`、`AutoAttendanceCard` 等。

  - 「显示与外观」标签承接主题、背景、通知提示音等外观与展示配置。

  - 新设「编辑与行为」标签（`edit`），合并原「随机点名」「背景」标签，收纳随机点名、作业编辑、刷新设置等行为类配置。

- `RefreshSettingsCard` 职责收敛为刷新控制，同步配置迁移至 `SyncSettingsCard`。

### 工程与 CI

- CI 现代化：`pnpm/action-setup` 改用 Corepack 启用 pnpm，Node 版本 20 → 22，`pnpm install` 改为 `--frozen-lockfile`。

- `pnpm-workspace.yaml` 迁移至 pnpm 11 的 `allowBuilds` 字段，替换废弃的 `onlyBuiltDependencies` 等旧字段。

- 清理冗余配置文件（`.browserslistrc`、`.hintrc` 及部分 `.gitignore` 规则）。

### 文档

- `VERSIONING.md` 移入 `docs/`，统一根目录文档结构。

- 同步更新 `README.md`、`AGENTS.md`、`docs/OFFLINE_SYSTEM.md` 的文档路由与内容。

---

## \[0.11.1-beta] - 2026-08-29

> 自 `v0.11.0-beta` 之后的工程治理与交互优化批次。

### 重构

- 组件目录按功能域重构，将散落组件归并为 `home/`、`common/`、`system/`、`editing/`、`settings/cards/`、`auth/` 六大域：

  - 废除模糊目录：`layout/`（页面框架并入 `home/`）、`exam/`（编辑类改名 `editing/`）、`attendance/`（考勤并入 `home/`）、`error/`。

  - 首页业务归入 `home/`：`TimeCard`、`FloatingToolbar`、`FloatingICP`、`AppHeader`、`RandomPicker`、`ChatWidget`、`HomeSkeleton`、`StudentNameManager` 等。

  - 编辑类归入 `editing/`：`HomeworkEditDialog`、`ExamConfigEditor`、`UrgentNotification`、`UrgentTestDialog`、`NotebookHomeworkDialog`。

  - 基础设施归入 `system/`：`InitServiceChooser`、`RateLimitModal`、`PwaInstallCard`、`OfflineIndicator`、`SwUpdateNotification`、`KvInitialize`、`EventSender` 等。

  - 设置卡片统一收拢到 `settings/cards/`：`AboutCard`、`StudentListCard`、`TeacherListCard`、`HitokotoSettings`、`NotificationSoundSettings` 等。

- 全量将 `src/` 相对导入替换为 `@/` 别名（涉及 `main.js`、`axios.js`、`backgroundSync.js`、`dataProvider.js` 及各组件/页面，消除相对引用）。

- 重写 `404.vue` 页面：移除对 `error/404.vue` 组件的引用，改为内联 Vuetify 布局（提供"返回首页 / 返回上一页"两个入口）。

### 新增

- 新增"交互状态（Interaction States）"语义 token（`src/styles/tokens.scss`）：`--state-hover-opacity`、`--state-active-scale`、`--state-focus-ring`、`--state-press-fill`、`--state-hover-fill` 等，并在 `src/styles/index.scss` 的卡片/按钮 active、hover 反馈中消费。

- 生产环境调试页守卫（`src/router/index.js`）：`/debug`、`/debug-init`、`/debug-socket`、`/socket-debugger` 在生产构建中由路由守卫统一重定向首页，避免线上暴露内部诊断信息。

### 一致性

- 配置默认值收敛到唯一来源 `src/utils/defaults/defaultData.js`（科目、作业模板默认值）；`SubjectManagementCard` 与 `HomeworkTemplateCard` 改为引用；`composables/useConfigDefaults` 专注加载兜底行为。

### 文档

- 同步组件结构：更新 `docs/ARCHITECTURE.md`、`src/components/README.md`、`src/pages/README.md`。

- 对齐三份分析报告（`排版系统分析报告.md`、`离线系统体系文档.md`、`阴影与层级系统分析报告.md`）到重构后的组件路径。

- `VERSIONING.md`：版本号说明同步更新至 `0.11.1-beta`，并统一列表样式。

- `docs/EXPERIENCE_RULES.md`：精简措辞，统一标题（"交互工业级"改为"交互优化"）。

- `docs/microsoft-store-pwa.md`：补充 Microsoft Store 上架流程细则（手动运行 workflow、必填输入 `production_url`、`build:store` 三步说明）。

- 新增本 `CHANGELOG.md`；清理一次性提交元数据目录 `docs/auto_commit_md/`。

---

## \[0.11.0-beta] - 2026-08-29

为正式发布夯实依赖与工程/工作流底座。

### 修复

- 修复 `vite-plugin-pwa` 弃用告警（以 `codeSplitting: false` 替代了 `inlineDynamicImports`）。

### 工作流

- 建立双 lint 工具链：oxlint 主查 + ESLint（`eslint-plugin-oxlint` 去重后仅保留 Vue 模板规则）。

- 音频文件名规范化与 `scripts/generate-sound-list.js` 脚本优化。

### 依赖

- 依赖与配置项整理。
