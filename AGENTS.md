# AGENTS.md

This file provides guidance to AI agents working with code in this repository.

## Project Overview

Classworks is a **pnpm monorepo** containing three apps and a shared package for the Classworks (作业板) classroom homework-board platform. The UI is in Chinese.

| Package                 | Path              | Stack                          | Description                                           |
| ----------------------- | ----------------- | ------------------------------ | ----------------------------------------------------- |
| `@classworks/web`       | `apps/web`        | Vue 3 + Vuetify 4 PWA          | The homework board widget for classroom large screens |
| `@classworks/server`    | `apps/server`     | Express 5 + Prisma + Socket.IO | KV storage backend                                    |
| `@classworks/dashboard` | `apps/dashboard`  | Vue 3 + Tailwind 4             | Admin UI for the KV backend                           |
| `@classworks/shared`    | `packages/shared` | Pure JS (ESM)                  | Shared constants (headers, URLs)                      |

> **各 app 自治理**：目前仅有 `apps/web` 提供了独立的 `apps/web/AGENTS.md`；`apps/server`、`apps/dashboard` 暂无独立 `AGENTS.md`，其细节见各自的 `README.md`。尤其涉及 `apps/web`（命令、lint、数据层、部署约定）时，**以** **`apps/web/AGENTS.md`** **为权威**；本根文档只做笼统说明并透传引用，避免与子文档冲突或重复。

## Monorepo Layout

```
.
├── apps/
│   ├── web/            # 作业板 PWA (Vue + Vuetify)
│   ├── server/         # KV backend (Express + Prisma + Postgres + Socket.IO)
│   └── dashboard/      # Admin dashboard (Vue + Tailwind + reka-ui)
├── packages/
│   └── shared/         # Shared constants (@classworks/shared)
├── scripts/
│   └── check-agent-docs.mjs  # 校验 AGENTS.md 与 CLAUDE.md 正文同步
├── .github/
│   ├── actions/setup-pnpm/   # Reusable CI composite action
│   └── workflows/
├── package.json              # Root workspace scripts + shared dev deps
├── pnpm-workspace.yaml       # 工作区定义 + pnpm 11 项目级配置（nodeLinker 等）
├── pnpm-lock.yaml
├── eslint.config.js          # Shared ESLint flat config
├── .gitattributes            # 统一行尾为 LF
├── .gitignore
├── .prettierignore
├── .prettierrc.json
└── .editorconfig
```

## Commands

All commands run from the **repo root**.

```bash
pnpm install              # Install all workspace dependencies
pnpm run dev              # All apps in parallel (web :3031, server :3000, dashboard :5173)
pnpm run build            # Build all apps（server 的 build 即 prisma generate，需联网下载引擎）
pnpm run lint             # ESLint（自动修复，本地随手用）
pnpm run lint:check       # ESLint 仅检查、不改文件（CI 与验证用这条）
pnpm run format           # Prettier write
pnpm run format:check     # Prettier check
pnpm run check:agent-docs # 校验 AGENTS.md 与 CLAUDE.md 正文同步

pnpm run dev:web          # Single app
pnpm run dev:server
pnpm run dev:dashboard
pnpm run build:web
pnpm run build:server     # prisma generate
pnpm run build:dashboard
```

> 注：`apps/web` 的内部命令与规范以 `apps/web/AGENTS.md` 为准；根层调用单个 web 命令用 `pnpm --filter @classworks/web run <script>`。web 的 lint 是「oxlint + ESLint」双链（见 apps/web/AGENTS.md），与根的 `pnpm run lint`（ESLint）是两套，各自独立、互不覆盖。

### Per-app

- **apps/web**: `prebuild` (sound list), `build:store` (PWA store validation)

- **apps/server**: `start`, `dev` (nodemon), `build` (prisma generate), `get-token`. Requires `.env` with `DATABASE_URL`.

- **apps/dashboard**: `dev` / `build` / `preview`

## Shared Package (packages/shared)

Exports constants used across all three apps:

- `HEADER_APP_TOKEN`, `HEADER_SITE_KEY`, `HEADER_DEVICE_UUID`

- `DEFAULT_KV_SERVER`, `DEFAULT_LOCAL_SERVER`, `CLOUD_SERVERS`

All apps depend via `"@classworks/shared": "workspace:*"`.

## Architecture

- **Data layer** (web): `dataProvider.js` → `kvLocalProvider.js` (IndexedDB) or `kvServerProvider.js` (HTTP). Failover via `serverRotation.js`.

- **Real-time**: Client `utils/socketClient.js` (web) ↔ Server `utils/socket.js` (server) — Socket.IO rooms

- **Settings** (web): `settings.js` — localStorage with typed definitions and migration

## Code Style

- 2-space indent, no TypeScript, ESM throughout。手写源码一律 JS；唯一的 `.ts` 是 `prisma generate` 的产物 `apps/server/generated/`（不入库、已被 `.prettierignore` 排除），`apps/server/utils/prisma.js` 按 Prisma 生成器约定 import 其 `.ts` 入口

- `@/` alias → each app's `src/`

- 根：ESLint 9 flat config + Prettier。`format:check` 全绿；`apps/web/src/utils/soundList.js` 为 prebuild 生成物，已加入 `.prettierignore`

- `apps/web` 使用自己的「oxlint + ESLint」双链（见 `apps/web/AGENTS.md`），根工具不覆盖其规范

- Mixed Composition API / Options API in Vue apps

## CI/CD

All workflows use `.github/actions/setup-pnpm` composite action.

| Workflow               | Trigger                           | Action                                                                                              |
| ---------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------- |
| `ci.yml`               | push/PR to main                   | Lint（根 + web 双链，检查态）、format check、AGENTS/CLAUDE 同步校验、build web + dashboard + server |
| `deploy.yml`           | push to main (web/packages)       | Web → GitHub Pages                                                                                  |
| `deploy-dashboard.yml` | push to main (dashboard/packages) | Dashboard build artifact                                                                            |
| `docker-publish.yml`   | push/tags (server/packages)       | Docker → GHCR + Docker Hub                                                                          |
| `store-pwa.yml`        | PR to main (web)                  | PWA store validation                                                                                |

## Notes

- Hoisted deps（`nodeLinker: hoisted`）与 `autoInstallPeers: true` 都写在 `pnpm-workspace.yaml`。pnpm 11 不读取 `.npmrc` 里的同名项，放那里等于未生效

- Server native modules (`bcrypt`, `@prisma/client`): run `pnpm rebuild` if needed

- Docker builds use repo root as context (Dockerfile references `packages/shared`)

- Env files gitignored；模板文件为 `apps/web/.env.example`、`apps/dashboard/.env.example`、`apps/server/.env.oauth.example`（`apps/server` 暂无 `.env.example`）

## 执行纪律（本项目已发生的错误复盘）

以下错误在本仓库的真实工作中发生过，代价从「浪费数小时」到「险些丢失 426 个文件」。
它们有一个共同病因：**先形成根因假设、直接写进汇报，事后才验证**。请对照执行。

### 1. 文档里的描述不是事实

`AGENTS.md` 自己曾写着「Hoisted deps (`node-linker=hoisted` in `.npmrc`)」，而 pnpm 11 根本不读
`.npmrc` 的这些项（`pnpm config get node-linker` 返回 `undefined`），hoisted 从未生效，
导致后续排查在完全错误的因果链上耗费很久。

**规则**：根因进入汇报前必须有可复现证据。文档中的配置、路径、命令一律先当作待验证假设，
尤其留意「意图」与「实际」分叉之处——写了却没生效的东西不会产生任何报错。

### 2. 破坏性操作先问「这步失败了会怎样」

曾用「删除全部已跟踪文件 → `git checkout -- .` 恢复」来刷新工作区：删除成功、恢复失败，
426 个文件（含 `AGENTS.md`、`CLAUDE.md`）瞬间从磁盘消失。当时的依据只是「工作区现在是干净的」，
没有考虑恢复步骤自身会失败。

**规则**：批量删除、`git reset --hard`、`git clean` 之前先确认恢复手段可用；
优先选择**不删除任何文件**的做法（例如原地做字节级归一化行尾，而不是删掉再恢复）。

### 3. 新增守护必须做负向测试

**规则**：新增校验脚本、CI 步骤或断言后，必须故意制造一次违规、确认它真的失败，再恢复。
只跑一遍「通过」不算验证。`pnpm run check:agent-docs` 是正面示例，它经过双向验证。

### 4. 测量方法本身要先自证

已发生的测量错误：

- 用 `Select-Object -First N` 截断输出，掩盖了命令退出码，把「检测成功」误读为「未检出」；
- 用 `require.resolve(name, { paths: [junction 路径] })` 探测模块解析——该 API 不对起始路径做
  realpath，据此得到的结论是错的；
- 探针文件内容太弱，无法区分正反两种结果，却据此下了结论；
- `git ls-files -c core.quotepath=false` 参数位置写错（`-c` 必须在子命令之前），返回空结果。

**规则**：测退出码不要经过 `Select-Object -First`；探针必须先跑一次「必然失败」的对照，
确认它真的能失败，再相信它的「通过」。

### 5. 报告「仓库有 bug」之前，先排除是输出转义

`git ls-files` 会对非 ASCII 路径做 C 风格转义，文件名会显示成 `...mp3"` 这样，
看起来像文件名里多了引号。这曾被当作仓库缺陷准备上报，实为输出转义造成的错觉。

**规则**：要拿真实路径用 `git -c core.quotepath=false ls-files`（或 `-z`）。

### 6. 验证不得改变被验证的对象

根 `lint` 带 `--fix`，用 `pnpm run lint` 做「发布前验证」会把文件改脏。
已新增 `lint:check`（根与 web），**验证与 CI 一律用 `lint:check`**。

### 7. 既有规则即使动机正当也要先问

`apps/web/AGENTS.md` 的危险操作清单要求 `git checkout` / `git reset` / `git clean` 先获用户同意。
曾为回滚自己造成的生成物脏改动直接执行 `git checkout -- <paths>`，只有事后报告——这不合规。

例外仅限：回滚 **agent 自身在本轮造成的、未提交的意外改动**，且必须限定在受影响路径上
（见 `apps/web/AGENTS.md` 的例外条款）。

### 8. 提交信息一律用 `-F` 传文件

本仓库文档与提交信息都是中文。PowerShell 会把 `“ ”` 当作字符串定界符，
`git commit -m "…“…”…"` 会直接报 `pathspec … did not match any file(s) known to git`。
把信息写进临时文件再用 `-F` 传入。
