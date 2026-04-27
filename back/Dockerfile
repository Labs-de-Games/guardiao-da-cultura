FROM oven/bun:1-alpine AS prune
WORKDIR /app
COPY . .
RUN bunx turbo prune back --docker

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
RUN bun run build --filter=back

FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/back/dist ./back/dist
COPY --from=build /app/back/package.json ./back/package.json
COPY --from=build /app/front/package.json ./front/package.json
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/bun.lock ./bun.lock

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production --ignore-scripts

WORKDIR /app/back
EXPOSE 3001
CMD ["bun", "dist/main.js"]
