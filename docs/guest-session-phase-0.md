# Guest Session Stabilization — Phase 0

This document records the **Phase 0 hotfix** for issue `#424` under epic `#423`.

## Context

After reducing onboarding friction by allowing guest gameplay, parts of the frontend still depended on backend flows that assume a persistent authenticated `userId`.

That mismatch caused server errors during guest sessions (for example score/collectible paths tied to user identity), even though gameplay itself should remain available.

## What Phase 0 changes

### 1) Keep gameplay start resilient for guests

- `PhaserGame` now guarantees a fallback guest session identifier when auth and PostHog distinct ID are unavailable.
- This prevents bootstrap failure due to missing player identifier.

### 2) Stop user-bound persistence calls in guest mode

- In `Game` scene:
  - collectible restore from `/scores/:userId/...` is skipped for guest mode;
  - score submit to backend is skipped for guest mode.

### 3) Keep badge system guest-first and robust

- Guest flow loads badge catalog from local source by design (no `/badges` request in guest mode).
- Authenticated flow keeps backend badge catalog request (`/badges`).
- Guest badge unlock behavior remains local (no server unlock call).
- Server-side badge earned event emission is restricted to authenticated mode.

## Non-goals in Phase 0

- No persistence architecture refactor yet.
- No guest-to-auth migration yet.
- No A/B rollout enablement changes (remains behind feature flag).

## Validation focus

- Guest can start and play without fatal errors.
- No repeated user-bound backend calls in guest mode.
- Authenticated flow remains intact.
