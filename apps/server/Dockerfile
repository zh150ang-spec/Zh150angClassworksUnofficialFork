FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
WORKDIR /app

# --- dependency layer (changes only when package files change) ---
# 只装生产依赖，供最终镜像使用。
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile --prod

# --- build layer (prisma generate, etc.) ---
# 直接复用 deps，再补装 devDependencies（prisma CLI 在其中）。
# 这样不必重复一遍 COPY 与一次冷装：第二次 install 是增量补齐，而不是从零再来。
FROM deps AS build

RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/server/ apps/server/

# 用仓库自己的构建脚本（等价于 prisma generate），与其他地方的调用方式一致。
# 生成物 apps/server/generated/ 已不入库，由本步骤产出。
RUN pnpm --filter @classworks/server run build

# --- runtime ---
FROM base

ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/server ./apps/server
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

EXPOSE 3000

WORKDIR /app/apps/server
ENTRYPOINT ["node", "classworks.js"]
CMD []
