FROM oven/bun:1-alpine AS deps
WORKDIR /app

COPY package.json bun.lock* turbo.json ./
COPY front/package.json ./front/
COPY back/package.json ./back/

RUN bun install --frozen-lockfile

FROM oven/bun:1-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/front/node_modules ./front/node_modules
COPY --from=deps /app/back/node_modules ./back/node_modules
COPY . .

RUN bun run build --filter=back

FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/back/node_modules ./back/node_modules

COPY --from=build /app/back/dist ./back/dist
COPY --from=build /app/back/package.json ./back/package.json

WORKDIR /app/back
EXPOSE 3001

CMD ["bun", "dist/main.js"]
