FROM oven/bun:1-alpine AS prune
WORKDIR /app
COPY package.json bun.lock* turbo.json ./
COPY front/package.json ./front/
COPY back/package.json ./back/
RUN bunx turbo prune front --docker

FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY --from=prune /app/package.json ./package.json
COPY --from=prune /app/bun.lock ./bun.lock
COPY --from=prune /app/turbo.json ./turbo.json
COPY --from=prune /app/front/package.json ./front/package.json
COPY --from=prune /app/back/package.json ./back/package.json
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY --from=deps /app/ ./
COPY --from=prune /app/out/full/ ./
COPY front/tsconfig.json ./front/
COPY front/next.config.ts ./front/
COPY front/src ./front/src
COPY front/public ./front/public
RUN bun run build --filter=front

FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/front/.next/standalone ./

EXPOSE 3000
CMD ["bun", "front/server.js"]
