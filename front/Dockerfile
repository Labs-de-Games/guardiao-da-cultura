FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN bun install --production

FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY package.json ./
RUN bun install
COPY . .
RUN bun run build

FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy standalone output
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000

CMD ["bun", "server.js"]
