# Changelog

本项目遵循 [语义化版本规范 2.0.0](https://semver.org/lang/zh-CN/)（详见 `docs/VERSIONING.md`）。
权威版本号以 `package.json` 的 `version` 字段为准。

> 格式：版本块按时间倒序排列（新在上、旧在下），**两个版本之间以** **`---`** **横线分界**。
> 每个版本内部通过 `###` 小节区分"重构 / 新增 / 修复 / 一致性 / 文档"等类别。

---

## \[0.14.0-dev\] - 2026-10-05

> 本周期的**主线是架构治理**：把长期靠约定维持的工程基线（行尾、生成物边界、验证链路、镜像构建）改成有守护、可复现的状态；同时修掉离线系统一处会让整条容错链路失效的架构缺陷，并同步上游 9 个提交。
> `-dev` 表示这是开发构建节点：架构层面已收敛，但已知仍有若干软件内问题待后续会话处理，**不适合作为正式发布对外**。

### 重构

- **离线系统**：确立三条不变量——传输层有界（交互 ≤12s、心跳 ≤6s、后台 ≤45s）、`serverReachable` 由心跳唯一裁决、持久重试只属于离线队列。新增 `netRetryPolicy.js`（纯函数、可单测）替换原先"无限重试、永不放弃"的 axios 拦截器；后者曾让心跳阈值、离线队列、RMW 降级、退避等**所有上层失败分支沦为死代码**。
- **跨标签锁**：`crossTabLock.js` 改为可中止租约。此前超时回调会替调用方释放锁，且 `acquireLock` 还会 `await` 整个持锁过程——实测导致每次后台同步要等满 30s 才开跑，而且开跑时锁已失效。
- **Service Worker 更新**：改为提示式更新。`install` 不再无条件 `skipWaiting()`，补上一直缺失的 `SKIP_WAITING` handler；刷新前经 `updateGate.js` 询问"是否有未保存内容"，未确认且页面可见时绝不打断。

### 新增

- 作业编辑对话框新增「粘贴」「粘贴并完成」按钮，并可在 设置 → 显示 用 `display.showPasteButtons` 关闭（同步自上游）；实现复用本仓已有的 textarea 判空保护，图标走 `ICON.CONTENT_PASTE`。
- 云端单存储模式（`kv-server` / `classworkscloud`）新增写入内存暂存 `pendingWriteSpool`：可重试失败时暂存于本页并明确报错，网络恢复后用 RMW 自动补写。
- 新增 `apps/server/.env.example` 环境变量模板。

### 修复

- **axios 拦截器无限重试**：延迟虽有上限，但永不放弃，Promise 永不 settle——保存按钮永久转圈、`isOnline()` 失真、挂起请求持续累积。现改为有界重试，并让 429 尊重 `Retry-After`。
- **心跳阈值失效**：心跳与业务请求共用同一实例，超时被当作可重试，失败永不计数，"连续 2 次失败"形同虚设。现心跳禁重试、加在途守卫与去抖探测；业务失败只记证据（`noteRequestFailure`），不再把整个应用一句话切成离线。
- **错误码失真**：`retryOperation` 穷尽后隐式返回 `undefined`，被上层折叠成"数据不存在"，甚至会触发默认配置回退、进而用默认值覆盖云端真实配置。现返回最后一次错误对象、错误码保真，且只对可重试失败重试。
- **RMW fail-open**：云端读失败被当成"云端没有数据"而跳过合并直接覆盖。现 fail-closed——只有读成功或确认 404 才允许写入。
- **本地写失败静默**：`localFailed` 全仓无消费方，本地副本静默过期。现原地重试一次，仍失败则登记并在设置页"同步"卡片可见。
- **退避被重置**：`scheduleImmediate()` 每次归零尝试计数并立刻同步，30s→60s→120s→300s 的阶梯形同不存在。现只在队列清空／网络恢复／手动同步时归零，10s 窗口内吸收重复触发。
- **冲突通知 15s 自动消失**：冲突结果此时已落地（云端已按本地优先合并写入），用户来不及选择就默认接受。现改为常驻直至明确选择。
- **镜像构建失败**：`build` 阶段复用 `--prod` 安装出的 `node_modules` 会触发 `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`；且 `prisma` 属 devDependency，而容器启动要执行 `npx prisma migrate deploy`——原运行时只装生产依赖，等于镜像里没有 prisma CLI。现改为单次全量安装、运行时复用，prisma 必然存在。
- 同步上游带来的修复：预配认证链接不被自动处理（`parsePreconfigData` 提前到 `created()` 并支持路由 query，`DeviceAuthDialog` 增加一次性守卫）；CORS 补齐 `x-app-token` / `x-site-key` / `x-device-uuid` / `x-device-password`（此前跨域预检会被拒）；`DEFAULT_LOCAL_SERVER` 由 3030 修正为 3000；`classworks.js` 改用 `node ./bin/www` 启动（原先调用 `npm install` / `npm run start`）且数据库迁移不再重复执行两次。
- 删除两个无引用死文件：`apps/server/middleware/device.js`、`apps/dashboard/src/components/HelloWorld.vue`。

### 工程与 CI

- 接入 **vitest**（73 例 / 10 个测试文件），守护重试策略、心跳、RMW、暂存、跨标签租约、后台退避、SW 更新时序、未保存门禁与 provider 透传；新增断言均经过"故意破坏 → 确认失败 → 还原"的负向验证。
- 新增 `test` / `test:web` / `test:watch` 脚本；`ci.yml` 新增 `test-web` job（不改动既有 job 名称，避免影响分支保护的必需检查）。
- `docker-publish.yml` 适配 fork：GHCR 命名空间改用 `github.repository_owner`，Docker Hub 登录仅在配置了变量时执行，镜像目标动态拼接。
- 新增 `.gitattributes` 统一行尾为 LF；`.gitignore` / `.prettierignore` 收敛（生成物与机器本地 harness 目录）。
- 停止跟踪 `apps/server/generated/`（Prisma 生成物）与 agent 草稿目录。

### 一致性

- 根 `eslint.config.js` 并入上游的浏览器／Node 全局变量并集，并清理两条因此失效的 `no-undef` 抑制指令；保留本仓更严格的规则级别与 `apps/web/**` 自治理忽略。
- 根 `AGENTS.md` 与 `CLAUDE.md` 同步更新：命令表、CI 表格、`packages/shared` 导出的第 4 个头、env 模板指向。
- `apps/web/docs/OFFLINE_SYSTEM.md` 重写：新增"修复状态／三条不变量"章节，并如实标注刻意保留的本地分歧与已知未接入项。

### 文档

- 根 `AGENTS.md` 新增"执行纪律"章节，复盘本项目已发生的错误（文档描述≠事实、破坏性操作、负向测试、测量的自证等）。
- `apps/web/AGENTS.md` 补充 `test` 命令；`apps/server/README.md` 与 `cli/README.md` 的端口由 3030 修正为 3000。

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
