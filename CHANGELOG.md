# Changelog

本项目遵循 [语义化版本规范 2.0.0](https://semver.org/lang/zh-CN/)（详见 `docs/VERSIONING.md`）。
权威版本号以 `package.json` 的 `version` 字段为准。

> 格式：版本块按时间倒序排列（新在上、旧在下），**两个版本之间以** **`---`** **横线分界**。
> 每个版本内部通过 `###` 小节区分"重构 / 新增 / 修复 / 一致性 / 文档"等类别。

***

## \[0.11.1-beta] - 2026-08-29

> 自 `v0.11.0-beta` 之后的工程治理与交互优化批次。

### 重构

* 组件目录按功能域重构，将散落组件归并为 `home/`、`common/`、`system/`、`editing/`、`settings/cards/`、`auth/` 六大域：

  * 废除模糊目录：`layout/`（页面框架并入 `home/`）、`exam/`（编辑类改名 `editing/`）、`attendance/`（考勤并入 `home/`）、`error/`。

  * 首页业务归入 `home/`：`TimeCard`、`FloatingToolbar`、`FloatingICP`、`AppHeader`、`RandomPicker`、`ChatWidget`、`HomeSkeleton`、`StudentNameManager` 等。

  * 编辑类归入 `editing/`：`HomeworkEditDialog`、`ExamConfigEditor`、`UrgentNotification`、`UrgentTestDialog`、`NotebookHomeworkDialog`。

  * 基础设施归入 `system/`：`InitServiceChooser`、`RateLimitModal`、`PwaInstallCard`、`OfflineIndicator`、`SwUpdateNotification`、`KvInitialize`、`EventSender` 等。

  * 设置卡片统一收拢到 `settings/cards/`：`AboutCard`、`StudentListCard`、`TeacherListCard`、`HitokotoSettings`、`NotificationSoundSettings` 等。

* 全量将 `src/` 相对导入替换为 `@/` 别名（涉及 `main.js`、`axios.js`、`backgroundSync.js`、`dataProvider.js` 及各组件/页面，消除相对引用）。

* 重写 `404.vue` 页面：移除对 `error/404.vue` 组件的引用，改为内联 Vuetify 布局（提供"返回首页 / 返回上一页"两个入口）。

### 新增

* 新增"交互状态（Interaction States）"语义 token（`src/styles/tokens.scss`）：`--state-hover-opacity`、`--state-active-scale`、`--state-focus-ring`、`--state-press-fill`、`--state-hover-fill` 等，并在 `src/styles/index.scss` 的卡片/按钮 active、hover 反馈中消费。

* 生产环境调试页守卫（`src/router/index.js`）：`/debug`、`/debug-init`、`/debug-socket`、`/socket-debugger` 在生产构建中由路由守卫统一重定向首页，避免线上暴露内部诊断信息。

### 一致性

* 配置默认值收敛到唯一来源 `src/utils/defaults/defaultData.js`（科目、作业模板默认值）；`SubjectManagementCard` 与 `HomeworkTemplateCard` 改为引用；`composables/useConfigDefaults` 专注加载兜底行为。

### 文档

* 同步组件结构：更新 `docs/ARCHITECTURE.md`、`src/components/README.md`、`src/pages/README.md`。

* 对齐三份分析报告（`排版系统分析报告.md`、`离线系统体系文档.md`、`阴影与层级系统分析报告.md`）到重构后的组件路径。

* `VERSIONING.md`：版本号说明同步更新至 `0.11.1-beta`，并统一列表样式。

* `docs/EXPERIENCE_RULES.md`：精简措辞，统一标题（"交互工业级"改为"交互优化"）。

* `docs/microsoft-store-pwa.md`：补充 Microsoft Store 上架流程细则（手动运行 workflow、必填输入 `production_url`、`build:store` 三步说明）。

* 新增本 `CHANGELOG.md`；清理一次性提交元数据目录 `docs/auto_commit_md/`。

***

## \[0.11.0-beta] - 2026-08-29

为正式发布夯实依赖与工程/工作流底座。

### 修复

* 修复 `vite-plugin-pwa` 弃用告警（以 `codeSplitting: false` 替代了 `inlineDynamicImports`）。

### 工作流

* 建立双 lint 工具链：oxlint 主查 + ESLint（`eslint-plugin-oxlint` 去重后仅保留 Vue 模板规则）。

* 音频文件名规范化与 `scripts/generate-sound-list.js` 脚本优化。

### 依赖

* 依赖与配置项整理。

