# zh150ang-spec 的 Classworks 非官方 Fork

> 本仓库是 [Classworks](https://github.com/Moonrend/Classworks) 的一个**非官方 Fork**（作者自用 + 校内分发）。

[![AGPL-3.0](https://img.shields.io/github/license/Moonrend/Classworks?style=flat-square)](LICENSE)

![Classworks](./apps/web/images/banner.png)

Classworks 是一个适用于班级大屏的作业板小工具。本 Fork 以自用为主，目前保留了原项目除噪音监测以外的所有常用官方功能，并使用较新的依赖栈做了一些面向自用的微更新。

## 关于本 Fork

本项目**为自用使用**（因需在校内分发，故开源）。现阶段的主要工作是：让项目内容更安全稳定、成为一个规范的 GitHub Fork，并适配我修改自用代码的流程。

> 如果你需要的是官方稳定版本，请使用上游 [Classworks](https://github.com/Moonrend/Classworks)；本 Fork 不代表官方行为，也不对上游负责。

## 项目结构

本仓库是 **pnpm monorepo**，包含以下应用和共享包：

| 包名                    | 路径              | 说明                                      |
| ----------------------- | ----------------- | ----------------------------------------- |
| `@classworks/web`       | `apps/web`        | 作业板 PWA（Vue 3 + Vuetify 4）           |
| `@classworks/server`    | `apps/server`     | KV 后端（Express 5 + Prisma + Socket.IO） |
| `@classworks/dashboard` | `apps/dashboard`  | 管理面板（Vue 3 + Tailwind 4）            |
| `@classworks/shared`    | `packages/shared` | 共享常量（请求头、服务器地址）            |

## 主要改动

> 以下内容记录的是合并上游仓库 monorepo 统一之前的代码情况；之后该表述很有可能作更改，不代表今后情况（除非该提示被删除）。

相对于原项目，该分支存在以下问题尚需优化：

1. **相当新的依赖**。例如 Vite 8 + 简单适配的 Vuetify 4 + oxlint（用于 script）+ eslint（用于 Vue 模板），这些在 Web 开发中属于极其激进的工具链，可能会带来相当大的问题。在我的测试下，目前项目组件可正常使用。
2. **较差的代码质量**。修改和微更新过程中大量采用了 Vibe Coding；主要借用 LLM 为 DS v4 预览版双模型 和 DS v4 Flash 0731，主要 Harness 工具为 Trae IDE、Zcode。Fork 中大部分更改为我提出需求、LLM 进行协助；少部分为直接修改；没有其余情况。全部更改由我检查并验收。LLM 全程不进行自主维护、自主工作。
3. **很差的维护质量**。项目维护水平差，此情况为 LLM 开发通病。
4. **外置了一个设计系统**，不合普遍开发规范，将尽快修改。

另有针对自用体验提升的修改：

1. 不合规范地优化了大量文案细节；
2. 构建一个很不稳定的双数据库实现；
3. 为软件适配简单的动画；
4. 优化工作流速度，加快效率；
5. 使软件的几个小细节更适合公有化使用；
6. **提供一个经过重新设计的设置界面，质量较高**；
7. 对主界面进行一些细节调整，包括一些负优化；
8. 磨合用户体验，推出作业本功能；
9. 优化各功能实现细节；基本统一通知渠道；以及构建经过简单统一的其他架构设计；
10. 其他各类个人向优化。

## 快速开始

### 环境准备

- Node.js 20+

- pnpm 11+

### 安装步骤

```bash
# 克隆本仓库（如需官方版本，克隆上游 Moonrend/Classworks！）
git clone https://github.com/zh150ang-spec/Zh150angClassworksUnofficialFork.git
cd Classworks

# 安装依赖
pnpm install

# 启动所有开发服务器
pnpm run dev

# 或启动单个应用
pnpm run dev:web          # 作业板 PWA (localhost:3031)
pnpm run dev:server       # KV 后端 (localhost:3000)
pnpm run dev:dashboard    # 管理面板

# 构建生产版本
pnpm run build

# 代码检查
pnpm run lint
pnpm run format:check
```

### 后端配置

`apps/server` 需要 PostgreSQL 数据库。仓库提供的模板为 `apps/server/.env.oauth.example`（只含 OAuth 变量），复制后需自行补齐数据库配置：

```bash
cp apps/server/.env.oauth.example apps/server/.env
# 编辑 .env，补充 DATABASE_URL 等（OAuth 变量见该模板注释）
```

### Docker 部署

```bash
docker build -f apps/server/Dockerfile -t classworks .
docker run -p 3000:3000 -e DATABASE_URL=your_db_url classworks
```

## 致谢

感谢原仓库开源、原项目主要开发者 [Sunwuyan](https://github.com/Sunwuyuan)，以及所有参与 Classworks 项目的贡献者。没有他们保持项目开源和完成主要功能实现，该 Fork 不会存在。

## 开源协议

本 Fork 遵循上游 [AGPL-3.0 许可证](LICENSE)。

Copyright (C) 2020-2026 Sunwuyuan and contributors.
