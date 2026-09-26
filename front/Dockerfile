FROM node:24.15.0-alpine AS prune
WORKDIR /app
COPY package.json package-lock.json turbo.json ./
COPY front/package.json ./front/
COPY back/package.json ./back/
RUN npm ci && npx turbo prune front --docker

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
COPY front/tsconfig.json ./front/
COPY front/next.config.ts ./front/
COPY front/src ./front/src
COPY front/public ./front/public
ARG NEXT_PUBLIC_ENV=production
ENV NEXT_PUBLIC_ENV=${NEXT_PUBLIC_ENV}
ARG NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY}
ARG NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST}
ARG NEXT_PUBLIC_MAINTENANCE_MODE=false
ENV NEXT_PUBLIC_MAINTENANCE_MODE=${NEXT_PUBLIC_MAINTENANCE_MODE}
ARG RESPONSIVEVOICE_API_KEY
ENV RESPONSIVEVOICE_API_KEY=${RESPONSIVEVOICE_API_KEY}
RUN npm run build -- --filter=front

FROM node:24.15.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HUSKY=0

COPY --from=build /app/front/.next/standalone ./
COPY --from=build /app/front/.next/static ./front/.next/static
COPY --from=build /app/front/public ./front/public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json

RUN --mount=type=cache,target=/root/.npm \
    npm pkg delete scripts.prepare && npm ci --omit=dev

ARG FRONTEND_PORT=3000
EXPOSE ${FRONTEND_PORT}
CMD ["node", "front/server.js"]
