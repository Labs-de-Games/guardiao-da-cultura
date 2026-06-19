# Guest Session Stabilization — Phase 1 (Persistence Abstraction)

This document records **Phase 1** for issue `#425` (epic `#423`).

## Goal

Decouple game systems from direct backend/user-identity assumptions by introducing a unified persistence contract with mode-specific implementations:

- `guest local`
- `auth server`

## Persistence Contract

`front/src/lib/persistence/gamePersistence.ts` defines `GamePersistence` with operations for:

- badge catalog load
- unlocked badge load
- badge unlock persistence
- collectible load
- score save
- quiz outcome event persistence
- badge earned event persistence

A factory (`createGamePersistence`) selects implementation by mode (`guest`/`auth`) and actor id.

## Mode Behavior

### Guest Local

- Uses local badge catalog source.
- Reads/writes unlocked badges via guest local badge storage.
- Persists scores, collectibles and lightweight event snapshots in localStorage (`gameplate:guest:persistence:v1`).
- Avoids direct backend dependencies for these operations.

### Auth Server

- Uses backend badge catalog source.
- Reads unlocked badges from server (`/badges/me`).
- Persists unlocks, collectibles and score using existing API clients.
- Sends quiz and badge events through existing event APIs.

## Integrated Call Sites

- `Game` scene now uses the persistence abstraction for collectibles restore, score save, and quiz outcome event handling.
- `BadgeSystem` now uses the persistence abstraction for catalog sync, unlocked badge sync, unlock persistence, and badge-earned event emission.

## Validation

- Service boundary tests added for guest vs auth behavior in `gamePersistence.test.ts`.
- Existing focused tests for badge API + Phaser bootstrap remain green.

## Non-goals

- No guest-to-auth migration flow in this phase.
- No auth flow rewrite.
- No onboarding/A-B rollout changes.
