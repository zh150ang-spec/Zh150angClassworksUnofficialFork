# Classworks KV Admin

Classworks 的 KV 后端管理面板。

## 技术栈

- Vue 3 + Vue Router + Pinia

- Tailwind CSS 4（`@tailwindcss/vite`）

- reka-ui（原 radix-vue）组件原语

- 表单校验：vee-validate + zod

## 命令

在 `apps/dashboard` 目录内执行，或从仓库根用 `pnpm --filter @classworks/dashboard run <script>`。

```bash
pnpm install   # 安装依赖
pnpm run dev   # 开发服务器
pnpm run build # 生产构建
pnpm run preview # 预览生产构建
```

## 说明

- 管理面板依赖 `apps/server` 提供的 KV / 鉴权接口，部署时需结合 `@classworks/server` 使用。

- 属于 pnpm monorepo 的一部分，共享常量来自 `@classworks/shared`。

<br />
