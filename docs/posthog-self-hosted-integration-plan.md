# PostHog Self-Hosted Integration Plan

## Overview

Integrate self-hosted PostHog into Gameplate for analytics, session replay, feature flags, and A/B testing — in both frontend (Next.js + Phaser) and backend (NestJS).

---

## Phase 1: Infrastructure — Docker Compose

### Create `compose.posthog.yaml`

Add a dedicated compose file for the PostHog stack. This keeps the PostHog services separate from the core app services and makes it easy to enable/disable.

**Services needed** (based on PostHog's official hobby deployment):

| Service | Image | Purpose |
|---------|-------|---------|
| `posthog-web` | `posthog/posthog:latest` | Web app + API |
| `posthog-worker` | `posthog/posthog:latest` | Background job processor |
| `posthog-migrate` | `posthog/posthog:latest` | Runs DB migrations on startup |
| `posthog-db` | `postgres:15-alpine` | PostHog's own PostgreSQL |
| `posthog-redis` | `redis:7-alpine` | Caching + queue |
| `posthog-clickhouse` | `clickhouse/clickhouse-server:23.11` | Analytics storage |
| `posthog-kafka` | `confluentinc/cp-kafka:7.5.0` | Event streaming |
| `posthog-zookeeper` | `confluentinc/cp-zookeeper:7.5.0` | Kafka dependency |

**Key decisions:**
- PostHog gets its own PostgreSQL — do NOT share with the app database
- All PostHog services on a `posthog` Docker network
- `posthog-web` exposes port `8000` internally
- New volumes: `posthog_postgres_data`, `posthog_redis_data`, `posthog_clickhouse_data`

### Modify `compose.development.yaml`

Add the PostHog services by extending `compose.posthog.yaml` (or inlining them). Add environment variables for the frontend and backend to reach PostHog:

```yaml
front:
  environment:
    - NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY}
    - NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST:-http://localhost:8000}
back:
  environment:
    - POSTHOG_API_KEY=${POSTHOG_API_KEY}
    - POSTHOG_HOST=${POSTHOG_HOST:-http://posthog-web:8000}
    - POSTHOG_ENABLED=${POSTHOG_ENABLED:-true}
```

### Modify `compose.production.yaml`

Same env vars, plus configure nginx to proxy `/ingest/` to `posthog-web:8000` so the browser doesn't need to talk to port 8000 directly.

### Modify `.env.example`

Add:

```bash
# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=http://localhost:8000
POSTHOG_API_KEY=phx_xxxxxxxxxxxx
POSTHOG_HOST=http://posthog-web:8000
POSTHOG_ENABLED=true
POSTHOG_SECRET_KEY=change-me-in-production
POSTHOG_SITE_URL=http://localhost:8000
```

### Verification

```bash
docker compose -f compose.development.yaml up -d
curl http://localhost:8000/health  # Should return 200
# Open http://localhost:8000 in browser, create project, copy API keys
```

---

## Phase 2: Frontend SDK Integration

### 2.1 Add `posthog-js` dependency

```bash
cd front && npm install posthog-js
```

### 2.2 Modify `front/src/lib/env.ts`

Add PostHog env vars to the Zod schema:

```typescript
NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1),
NEXT_PUBLIC_POSTHOG_HOST: z.string().url().default("http://localhost:8000"),
NEXT_PUBLIC_POSTHOG_UI_ENABLED: z.coerce.boolean().default(true),
```

### 2.3 Create `front/src/lib/posthog.ts`

PostHog JS SDK singleton with:
- `initPostHog(key, host)` — initializes PostHog with session replay config
- `getPostHog()` — returns the initialized instance (or null)
- Session replay config: mask password inputs, capture pageviews

### 2.4 Create `front/src/components/PostHogProvider.tsx`

Client component that:
1. Initializes PostHog on mount (if `POSTHOG_UI_ENABLED` is true)
2. Identifies users after auth using `useAuth()` — calls `posthog.identify(user.id, { role: user.role })`
3. Resets identity on logout

### 2.5 Modify `front/src/app/layout.tsx`

Wrap children with `PostHogProvider` inside `AuthProvider`:

```tsx
<ThemeRegistry>
  <AuthProvider>
    <PostHogProvider>
      <ToastProvider>{children}</ToastProvider>
    </PostHogProvider>
  </AuthProvider>
</ThemeRegistry>
```

### 2.6 Create `front/src/lib/featureFlags.ts`

Helper functions:
- `isFeatureEnabled(flagKey, defaultValue?)` — checks `posthog.isFeatureEnabled()`
- `getFeatureFlagPayload(flagKey)` — returns flag payload for multivariate flags
- `getFeatureFlag(flagKey)` — returns the variant name for A/B tests

### Verification

1. Load the app in browser
2. Check PostHog "Live Events" — pageview events should appear
3. Login — check PostHog "Persons" tab for identified user with `role` property

---

## Phase 3: Backend SDK Integration

### 3.1 Add `posthog-node` dependency

```bash
cd back && npm install posthog-node
```

### 3.2 Modify `back/src/core/config/config.service.ts`

Add to Zod schema:

```typescript
POSTHOG_API_KEY: z.string().min(1),
POSTHOG_HOST: z.string().url().default("http://posthog-web:8000"),
POSTHOG_ENABLED: z.coerce.boolean().default(true),
```

Add corresponding getters: `posthogApiKey`, `posthogHost`, `posthogEnabled`.

### 3.3 Create `back/src/core/posthog/posthog.module.ts`

Global module that provides `PosthogService`.

### 3.4 Create `back/src/core/posthog/posthog.service.ts`

Wrapper around `posthog-node` with:
- `capture(distinctId, event, properties?)` — send custom events
- `identify(distinctId, properties?)` — set user properties
- `getFeatureFlag(flagKey, distinctId, options?)` — server-side flag evaluation
- `shutdown()` — graceful shutdown (call in `onModuleDestroy`)
- Conditional initialization: only creates PostHog client if `POSTHOG_ENABLED=true`

### 3.5 Modify `back/src/app.module.ts`

Import `PosthogModule` (it's global, so available everywhere).

### 3.6 Modify `back/src/modules/auth/auth.service.ts`

After successful registration and login confirmation, call:

```typescript
await this.posthog.identify(user.id, { email: user.email, role: user.role });
```

### Verification

1. Register a new user
2. Check PostHog "Persons" — user should appear with `email` and `role` properties
3. Call `POST /api/v1/events` — verify backend can capture events to PostHog

---

## Phase 4: Game Event Forwarding

### 4.1 Modify `back/src/modules/analytics/analytics.service.ts`

Inject `PosthogService` and forward game events to PostHog alongside existing PostgreSQL persistence:

```typescript
@OnEvent("game.event")
async handleGameEvent(payload: GameEventPayload) {
  // Existing: persist to PostgreSQL
  const event = this.eventRepository.create({ ... });
  await this.eventRepository.save(event);

  // New: forward to PostHog
  if (payload.userId) {
    await this.posthog.capture(payload.userId, `game_${payload.type}`, {
      ...payload.metadata,
      timestamp: payload.timestamp,
    });
  }
}
```

### 4.2 Modify `front/src/game/systems/AnalyticsSystem.ts`

Augment the `track()` method to also capture events via PostHog:

```typescript
import { getPostHog } from "../../lib/posthog";

public track(type: GameEventType, metadata?: Record<string, unknown>) {
  // Existing: send to backend API
  const payload = { ... };
  sendGameEvent(payload).catch(...);

  // New: also capture via PostHog
  const ph = getPostHog();
  if (ph) {
    ph.capture(`game_${type}`, { ...metadata, scene: this.scene.scene.key });
  }
}
```

### Verification

1. Start a game level
2. Check PostHog "Events" — should see `game_level_started`, `game_game_started` events
3. Check PostgreSQL — `game_events` table should still have rows (existing pipeline intact)

---

## Phase 5: Feature Flags in Phaser

### 5.1 Modify `front/src/components/PhaserGame.tsx`

After PostHog initializes and feature flags load, set them in the Phaser game registry:

```typescript
const ph = getPostHog();
if (ph) {
  ph.onFeatureFlags(() => {
    const flags = ph.featureFlags.getFlags();
    gameRef.current?.registry.set("featureFlags", flags);
  });
}
```

### 5.2 Create `front/src/game/systems/FeatureFlagSystem.ts`

A lightweight system that Phaser scenes can use to read feature flags from the registry:

```typescript
export class FeatureFlagSystem {
  private flags: Record<string, boolean | string> = {};

  constructor(scene: Scene) {
    this.flags = scene.registry.get("featureFlags") || {};
  }

  isEnabled(key: string, defaultValue = false): boolean {
    return this.flags[key] === true || this.flags[key] === defaultValue;
  }

  getVariant(key: string): string | null {
    const value = this.flags[key];
    return typeof value === "string" ? value : null;
  }

  refresh(scene: Scene): void {
    this.flags = scene.registry.get("featureFlags") || {};
  }
}
```

### 5.3 Modify `front/src/game/scenes/Game.ts`

Use feature flags in game logic:

```typescript
create() {
  // ... existing code ...
  this.featureFlags = new FeatureFlagSystem(this);

  if (this.featureFlags.isEnabled("game-double-jump")) {
    this.player.enableDoubleJump();
  }

  const difficulty = this.featureFlags.getVariant("game-difficulty-curve");
  if (difficulty) {
    this.applyDifficultyMultiplier(difficulty);
  }
}
```

### Verification

1. Create a feature flag `test-flag` in PostHog UI (100% rollout)
2. Load the game — check browser console for `featureFlags` in registry
3. Toggle the flag off — verify game behavior changes

---

## Phase 6: Production Configuration

### 6.1 Modify `compose.production.yaml`

- Add PostHog services with resource limits
- Configure nginx to proxy `/ingest/` to `posthog-web:8000`
- Add `POSTHOG_SITE_URL` pointing to the public domain

### 6.2 Modify `nginx/nginx.production.conf`

Add location block:

```nginx
location /ingest/ {
    proxy_pass http://posthog-web:8000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 6.3 Update Coolify environment variables

Set all `POSTHOG_*` env vars in the Coolify dashboard.

### Verification

1. Deploy to production
2. Verify session replay captures game sessions
3. Verify feature flags evaluate correctly
4. Verify funnel analytics track level completion flow

---

## Files to Create/Modify Summary

### New Files

| File | Description |
|------|-------------|
| `compose.posthog.yaml` | PostHog Docker Compose stack |
| `front/src/lib/posthog.ts` | PostHog JS SDK singleton |
| `front/src/lib/featureFlags.ts` | Feature flag helper functions |
| `front/src/components/PostHogProvider.tsx` | React provider for PostHog |
| `front/src/game/systems/FeatureFlagSystem.ts` | Phaser feature flag system |
| `back/src/core/posthog/posthog.module.ts` | NestJS PostHog module |
| `back/src/core/posthog/posthog.service.ts` | NestJS PostHog service |

### Modified Files

| File | Change |
|------|--------|
| `compose.development.yaml` | Add PostHog env vars to front/back services |
| `compose.production.yaml` | Add PostHog env vars + resource limits |
| `.env.example` | Add all PostHog env vars |
| `front/src/lib/env.ts` | Add PostHog env vars to Zod schema |
| `front/src/app/layout.tsx` | Wrap with PostHogProvider |
| `front/src/game/systems/AnalyticsSystem.ts` | Add PostHog capture alongside existing sendGameEvent |
| `front/src/components/PhaserGame.tsx` | Load feature flags into game registry |
| `front/src/game/scenes/Game.ts` | Use FeatureFlagSystem for game mechanics |
| `front/package.json` | Add `posthog-js` dependency |
| `back/src/core/config/config.service.ts` | Add PostHog env vars to Zod schema |
| `back/src/app.module.ts` | Import PosthogModule |
| `back/src/modules/analytics/analytics.service.ts` | Inject PosthogService, forward events |
| `back/src/modules/auth/auth.service.ts` | Identify users on registration/login |
| `back/package.json` | Add `posthog-node` dependency |

---

## Key Design Decisions

1. **Dual analytics pipeline**: PostHog augments the existing `AnalyticsSystem → gameEventsApi → NestJS → PostgreSQL` pipeline. Both run in parallel. PostHog is for product analytics (funnels, retention, session replay); PostgreSQL is the source of truth for game data.

2. **Frontend captures directly**: The `AnalyticsSystem.track()` method sends events to both the backend API AND PostHog JS SDK. This gives PostHog richer client-side context (page URL, session replay correlation).

3. **Backend forwards too**: The `AnalyticsService` also forwards events to PostHog via `posthog-node`. This ensures server-side events (e.g., quiz outcomes submitted via `sendQuizOutcomeEvent`) are captured even if the client disconnects.

4. **Feature flags via registry**: PostHog feature flags are loaded into the Phaser game registry, making them accessible to any scene without direct PostHog imports in game code.

5. **Self-hosted isolation**: PostHog services run on a separate `posthog` Docker network. The app services connect to PostHog via the internal network. In production, nginx proxies `/ingest/` to avoid exposing port 8000.

6. **Graceful degradation**: Both `getPostHog()` (frontend) and `PosthogService` (backend) return null/no-op when PostHog is disabled. The game works perfectly without PostHog — it's purely additive.
