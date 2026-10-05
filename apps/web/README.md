<br />

# Classworks 作业板

适用于班级大屏的作业板 PWA（`@classworks/web`）。基于 Vue 3 + Vuetify 4，支持本地记录、查看与多端同步。

> AI Agent 在本包内工作时的规范以 [AGENTS.md](./AGENTS.md) 为权威，本文件面向人类读者。

## 技术栈

- Vue 3 + Vuetify 4 + Vue Router + Pinia

- Vite 8；PWA（`vite-plugin-pwa` + Workbox，Service Worker 在 `src/sw.js`）

- Sass（`sass-embedded`）

- 代码检查：oxlint（主，JS 与 `<script>`）+ ESLint（补，Vue 模板规则）

## 命令

在 `apps/web` 目录内执行，或从仓库根用 `pnpm --filter @classworks/web run <script>`。

```bash
pnpm install           # 安装依赖
pnpm run dev           # 开发服务器，localhost:3031（局域网可访问）
pnpm run build         # 生产构建（自动执行 prebuild 重新生成声音列表）
pnpm run preview       # 预览生产构建
pnpm run lint          # oxlint + ESLint 双链检查
pnpm run build:store   # 构建并校验 PWA（Microsoft Store / PWABuilder 上架用）
```

## 说明

- 纯前端应用：数据层为 IndexedDB 本地存储 + 远程 KV 服务；本包内不修改 `apps/server` 后端代码。

- 属于 pnpm monorepo 的一部分，共享常量来自 `@classworks/shared`。

- 部署为静态站点（GitHub Pages / Vercel）；路径别名 `@/` 映射到 `src/`。

<br />
