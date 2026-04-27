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
RUN bun run build --filter=front

FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/front/.next/standalone ./
COPY --from=build /app/front/public ./front/public
COPY --from=build /app/front/.next/static ./front/.next/static
EXPOSE 3000
CMD ["bun", "front/server.js"]
