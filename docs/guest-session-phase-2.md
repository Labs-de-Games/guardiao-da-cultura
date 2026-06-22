# Guest Session Stabilization — Phase 2 (Identity & Continuity Hardening)

This document records **Phase 2** for issue `#426` (related to epic `#423` and task `#396`).

## Goal

Ensure guest and authenticated flows are both functional and deterministic by:

- centralizing guest session identity lifecycle;
- fixing auth finalization order to avoid `401` during post-login profile load;
- documenting event types and per-flow behavior.

## Main changes

### 1) Centralized guest session ID lifecycle

- Added `front/src/lib/guestSession.ts` with a single source of truth for guest session identity:
  - `getGuestSessionId()`
  - `setGuestSessionId()`
  - `getOrCreateGuestSessionId()`
  - `clearGuestSessionId()`
- Keeps compatibility with existing storage key: `gp_fallback_guest_id`.

### 2) Phaser bootstrap now uses centralized guest identity

- `front/src/components/PhaserGame.tsx` now resolves guest identity via `getOrCreateGuestSessionId(posthogDistinctId)`.
- Guest requests use the same deterministic id via `setGuestId(guestSessionId)`.

### 3) Persistence abstraction fallback now uses centralized guest identity

- `front/src/lib/persistence/gamePersistence.ts`
  - when `mode=guest` and `actorId` is unavailable, fallback id comes from `getOrCreateGuestSessionId()`.

### 4) Auth finalization order fixed (`401` hardening)

- `front/src/lib/auth/AuthContext.tsx`
  - `finalizeAuth` now executes in this order:
    1. `apiRefreshToken()` (obtain Bearer token)
    2. `apiMe()` (load profile with valid token)
    3. apply auth state + role-based redirect
- `confirmLogin` and `confirmVerifyEmail` now both call the same `finalizeAuth()`.

This avoids calling `/auth/me` before a valid Bearer token exists.

## Flow map (guest vs auth)

### Guest flow

1. `PlayerGuard` allows guest when enabled by flag/fallback timeout.
2. `PhaserGame` resolves deterministic guest id (`guestSessionId`).
3. `createGamePersistence({ mode: "guest" })` routes persistence to local mode.
4. Local persistence stores:
   - badges (`gameplate:badges:v1`)
   - gameplay snapshot (`gameplate:guest:persistence:v1`) with scores, collectibles and events.
5. Reload/reopen preserves guest continuity.

### Auth flow

1. Login or verify-email confirmation endpoint is consumed.
2. `finalizeAuth()` refreshes token first.
3. `/auth/me` is fetched with valid Bearer token.
4. Auth state is hydrated and redirect is role-based:
   - `institution` / `admin` -> `/institution`
   - `player` -> `/`
5. Guest badge merge hook remains active as best-effort (`mergeGuestBadges`).

## Event map (types + dispatch path)

### A) Domain analytics events (`GameEventType`)

Defined in `front/src/game/types/AnalyticsTypes.ts`:

- `game.started`
- `game.paused`
- `game.resumed`
- `session.end`
- `level.started`
- `level.completed`
- `level.failed`
- `level.restarted`
- `star.collected`
- `clue.used`
- `clue.unlocked`
- `progression.updated`
- `badge.earned`
- `badge.viewed`
- `event.logged`

Primary dispatch path: `AnalyticsSystem` / `sendGameEvent` -> `POST /api/v1/events`.

### B) Quiz outcome events (retry + bounded queue)

Defined in `front/src/lib/gameEventsApi.ts`:

- `quiz.completed`
- `quiz.failed`

Dispatch behavior:

- try `POST /api/v1/events`
- on failure enqueue at `gameplate:eventQueue:v1`
- bounded by:
  - max queue size: `200`
  - max attempts per event: `25`
  - max event age: `7 days`
- best-effort flush on interval/online.

### C) Product analytics events (PostHog)

Examples currently emitted by UI/game:

- `landing_view`
- `landing_continue`
- `game_started`
- `level_completed`
- `level_failed`
- `quiz_completed`
- `badge_earned`
- `clue_used`
- `settings_opened`
- `button_clicked`
- `$pageview`

## Notes

- Guest-to-auth full data migration remains phased; badge merge hook is already defined and kept.
- Landing page + map pin click rollout for `#396` remains a separate implementation stream.
