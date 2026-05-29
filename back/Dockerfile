FROM node:24.15.0-alpine AS prune
WORKDIR /app
COPY package.json package-lock.json turbo.json ./
COPY front/package.json ./front/
COPY back/package.json ./back/
RUN npm ci && npx turbo prune back --docker

FROM node:24.15.0-alpine AS deps
WORKDIR /app
COPY --from=prune /app/package.json ./package.json
COPY --from=prune /app/package-lock.json ./package-lock.json
COPY --from=prune /app/turbo.json ./turbo.json
COPY --from=prune /app/front/package.json ./front/package.json
COPY --from=prune /app/back/package.json ./back/package.json
RUN --mount=type=cache,target=/root/.npm \
    npm ci

FROM node:24.15.0-alpine AS build
WORKDIR /app
COPY --from=deps /app/ ./
COPY --from=prune /app/out/full/ ./
COPY back/tsconfig.json ./back/
COPY back/src ./back/src
COPY tsconfig.json ./
RUN npm run build -- --filter=back

FROM node:24.15.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/back/dist ./back/dist
COPY --from=build /app/back/package.json ./back/package.json
COPY --from=build /app/front/package.json ./front/package.json
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json

RUN --mount=type=cache,target=/root/.npm \
    npm pkg delete scripts.prepare && npm ci --omit=dev

WORKDIR /app/back
ARG BACKEND_PORT=3001
EXPOSE ${BACKEND_PORT}
CMD ["node", "dist/main.js"]
