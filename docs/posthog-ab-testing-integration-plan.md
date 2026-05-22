# A/B Testing Integration Plan for Gameplate

## Current Architecture Context

- **Monorepo**: Turborepo with `front/` (Next.js App Router) and `back/` (NestJS)
- **Game**: Phaser 3 running inside React component, communicates via custom events & registry
- **Auth**: Magic link + JWT (access in-memory, refresh HTTP-only cookie), roles: Player/Educator/Admin
- **Analytics**: `AnalyticsSystem` → `gameEventsApi` → NestJS `AnalyticsModule` → PostgreSQL `GameEvent` table
- **DB**: PostgreSQL + TypeORM, deployed via Docker Compose on Coolify
- **No existing A/B testing or feature flag infrastructure**

---

## Requirements (Confirmed)

- **Scope**: A/B testing for both game mechanics (Phaser) and web UI (Next.js)
- **Analytics**: Full analytics suite desired (session replay, funnels, heatmaps, user paths)
- **Infrastructure**: No strong preference — MongoDB addition is acceptable

---

## Recommendation: PostHog (Self-Hosted)

### Why PostHog

PostHog is the only platform that provides **all** requested capabilities in a single self-hosted tool:

| Capability | PostHog | GrowthBook | Unleash |
|---|---|---|---|
| Feature flags | ✅ | ✅ | ✅ |
| A/B testing with stats | ✅ Bayesian | ✅ Best-in-class | ❌ |
| Session replay | ✅ | ❌ | ❌ |
| Funnels & user paths | ✅ | ❌ | ❌ |
| Heatmaps | ✅ | ❌ | ❌ |
| Surveys | ✅ | ❌ | ❌ |
| Self-hosted | ✅ MIT | ✅ MIT | ✅ Apache |
| Official Phaser demo | ✅ | ❌ | ❌ |
| Already in your roadmap | ✅ | ❌ | ❌ |

Your architecture doc already lists PostHog as "pending evaluation" — this confirms it's the right direction.

### Trade-offs

- **Infrastructure footprint**: Requires ClickHouse + Kafka + Redis + PostgreSQL (4 additional containers)
- **Resource usage**: ~4GB RAM minimum for self-hosted stack
- **Complexity**: More DevOps overhead than GrowthBook or Unleash

### Alternative: GrowthBook (if you want lighter infrastructure)

If PostHog's infrastructure footprint is too heavy, GrowthBook is the best alternative:

- Best-in-class statistical engine (CUPED, sequential testing, multi-armed bandits)
- Only adds MongoDB to your stack
- Pair with a lightweight analytics tool later if needed

---

## Implementation Plan: PostHog

### Phase 1: Infrastructure (1-2 days)

**Add PostHog to Docker Compose stack**

Files to modify:

- `compose.base.yaml` — Add PostHog services
- `compose.development.yaml` — Add dev overrides
- `compose.production.yaml` — Add production config with resource limits

New services needed:

```yaml
# PostHog stack (add to compose.base.yaml)
clickhouse:    # Analytics database
kafka:         # Event streaming
redis:         # Caching
postgres_hog:  # PostHog's own PostgreSQL (or share existing)
web:           # PostHog web app
worker:        # Background job processor
plugin:        # Plugin server
```

PostHog provides an official `docker-compose.yml` that can be referenced and adapted.

**Resource considerations:**

- Minimum 4GB RAM for the full stack
- ClickHouse needs ~2GB for small-scale game analytics
- Can run alongside existing services on Coolify

### Phase 2: Frontend Integration (2 days)

**Install PostHog JS SDK**

File: `front/package.json` — Add `posthog-js`

**Create PostHog provider**

New file: `front/src/lib/analytics/PostHogProvider.tsx`

- Initialize PostHog with project API key and host
- Identify users after auth (pass userId, role from AuthContext)
- Wrap the app in `<PostHogProvider>` at the layout level

File to modify: `front/src/app/layout.tsx` — Wrap children with PostHogProvider

**Feature flags in Next.js**

New file: `front/src/lib/analytics/featureFlags.ts`

- Helper functions: `isFeatureEnabled(key)`, `getFeatureVariant(key)`, `getRemoteConfig(key)`
- Server Component support via `posthog-node`

**Replace/augment existing analytics**

Files to modify:

- `front/src/game/systems/AnalyticsSystem.ts` — Add PostHog event tracking alongside existing `gameEventsApi` calls
- `front/src/lib/analyticsApi.ts` — Keep as fallback, add PostHog as primary analytics destination

### Phase 3: Phaser Game Integration (2 days)

**Load feature flags in game scenes**

File to modify: `front/src/game/scenes/Game.ts`

- In `create()`, read feature flags from PostHog client (already initialized by React shell)
- Apply flags to game mechanics:

```typescript
// Example: testing difficulty levels
const difficultyMultiplier = posthog.getFeatureFlag('game-difficulty-curve') // returns 'easy' | 'medium' | 'hard'
this.physics.gravity.y *= difficultyMap[difficultyMultiplier]

// Example: testing new character ability
const doubleJumpEnabled = posthog.isFeatureEnabled('game-double-jump')
if (doubleJumpEnabled) this.player.enableDoubleJump()

// Example: testing UI layout
const hudLayout = posthog.getFeatureFlag('game-hud-layout')
this.uiScene.setHudLayout(hudLayout)
```

**Track experiment exposures**

File to modify: `front/src/game/systems/AnalyticsSystem.ts`

- When a flag is evaluated, PostHog automatically sends `$feature_flag_called` events
- Ensure exposure events flow through to your existing AnalyticsModule for backend analysis

**Session replay in game context**

- PostHog session replay captures the full DOM including the Phaser canvas
- No additional integration needed — it works automatically

### Phase 4: Backend Integration (1-2 days)

**Create PostHog module in NestJS**

New files:

- `back/src/modules/posthog/posthog.module.ts`
- `back/src/modules/posthog/posthog.service.ts`

```typescript
// PosthogService: server-side flag evaluation
async getFeatureFlags(userId: string): Promise<FeatureFlags>
async isFeatureEnabled(key: string, userId: string): Promise<boolean>
async getFeatureVariant(key: string, userId: string): Promise<string>
```

**Integrate with existing AnalyticsModule**

File to modify: `back/src/modules/analytics/analytics.service.ts`

- Forward game events to PostHog for funnel/retention analysis
- Keep existing PostgreSQL storage as source of truth

**API route for game flags**

New file: `back/src/modules/posthog/posthog.controller.ts`

- `GET /api/v1/feature-flags` — Returns all flags for authenticated user
- Used by Phaser if client-side SDK isn't sufficient (e.g., for server-authoritative game logic)

### Phase 5: Experiments Setup (1 day)

**Create initial experiments in PostHog dashboard**

Suggested first experiments:

1. **Onboarding flow**: Test 3-step vs 5-step tutorial (UI experiment)
2. **Difficulty curve**: Test easy/medium/hard starting difficulty (game mechanic)
3. **HUD layout**: Test compact vs expanded HUD (game UI)

**Define funnels and dashboards**

- Level completion funnel: `game.started` → `level.started` → `level.completed`
- Retention dashboard: DAU/WAU/MAU
- Experiment results dashboard with statistical significance

---

## Implementation Complexity Summary

| Phase | Effort | Risk Level |
|-------|--------|------------|
| Phase 1: Infrastructure | 1-2 days | Medium (DevOps) |
| Phase 2: Frontend Integration | 2 days | Low |
| Phase 3: Phaser Integration | 2 days | Low-Medium |
| Phase 4: Backend Integration | 1-2 days | Low |
| Phase 5: Experiments Setup | 1 day | Low |
| **Total** | **7-9 days** | |

---

## Key Files to Modify/Create

### New Files

- `front/src/lib/analytics/PostHogProvider.tsx`
- `front/src/lib/analytics/featureFlags.ts`
- `back/src/modules/posthog/posthog.module.ts`
- `back/src/modules/posthog/posthog.service.ts`
- `back/src/modules/posthog/posthog.controller.ts`

### Modified Files

- `compose.base.yaml` — Add PostHog services
- `compose.development.yaml` — Dev overrides
- `compose.production.yaml` — Production config
- `front/package.json` — Add `posthog-js`
- `back/package.json` — Add `posthog-node`
- `front/src/app/layout.tsx` — Wrap with PostHogProvider
- `front/src/game/systems/AnalyticsSystem.ts` — Add PostHog tracking
- `front/src/game/scenes/Game.ts` — Read feature flags
- `back/src/modules/analytics/analytics.service.ts` — Forward events to PostHog

---

## Verification Plan

1. `make lint` — All code passes Biome linting
2. `make test` — All existing tests pass
3. `make typecheck` — No TypeScript errors
4. `docker compose up` — All services start (existing + PostHog stack)
5. Manual: Create a feature flag in PostHog UI, verify it's evaluated in Next.js
6. Manual: Create an A/B experiment, verify variant assignment in Phaser
7. Manual: Verify session replay captures game sessions
8. Manual: Verify funnel analytics track level completion flow
9. Check PostHog dashboard shows experiment results with statistical significance

---

## Alternative: GrowthBook (Lighter Infrastructure)

If PostHog's 4-container stack is too heavy, GrowthBook is the fallback:

| Aspect | PostHog | GrowthBook |
|--------|---------|------------|
| Infra added | ClickHouse + Kafka + Redis + PG | MongoDB only |
| RAM needed | ~4GB | ~1GB |
| Analytics | Full suite (replay, funnels, heatmaps) | Experimentation only |
| Stats engine | Bayesian | Bayesian + Frequentist + CUPED |
| Effort | 7-9 days | 3-5 days |

With GrowthBook, you'd need a separate analytics tool for session replay and funnels (e.g., PostHog cloud free tier for analytics only, or Plausible).
