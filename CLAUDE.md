# CLAUDE.md

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
