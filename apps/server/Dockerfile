FROM node:22-alpine AS base

# 与仓库其它地方保持一致（pnpm 11.24.0），不要退回上游的 9.15.0
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
WORKDIR /app

# --- build：全量安装（含 devDependencies：prisma CLI）+ 生成 Prisma 客户端 ---
FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/server/ apps/server/

# 用仓库自己的构建脚本（等价于 prisma generate），与其他地方的调用方式一致。
# 生成物 apps/server/generated/ 已不入库，由本步骤产出。
RUN pnpm --filter @classworks/server run build

# --- runtime ---
FROM base

ENV NODE_ENV=production
# classworks.js 的启动流程为「prisma migrate deploy → (跳过 generate) → 启动」，
# 其中 migrate 需要 prisma CLI（devDependency）。因此运行时必须带上完整依赖，
# 不能只装生产依赖，否则容器启动时会去联网临时下载 prisma。
#
# ⚠️ 不要为了缩小镜像改回「先 --prod 装一次、再在同一目录 install 一次」的两阶段复用：
# pnpm 向已存在的 modules 目录做二次安装时会要求清空该目录，在无 TTY 的构建环境里
# 直接失败：ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY（本仓库已踩过）。
ENV SKIP_PRISMA_GENERATE=1
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/server ./apps/server
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

EXPOSE 3000

WORKDIR /app/apps/server
ENTRYPOINT ["node", "classworks.js"]
CMD []
