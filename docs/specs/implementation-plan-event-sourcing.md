# Implementation Plan: Event Sourcing, Telemetry & Deterministic Replay

> **Status:** Draft
> **Date:** 2026-08-03
> **Scope:** Frontend (Phaser 3 + Next.js), Backend (NestJS + TypeORM)
> **Architecture Spec:** [event-sourcing-telemetry-replay.md](./event-sourcing-telemetry-replay.md)

---

## Table of Contents

1. [Objective](#1-objective)
2. [Functional Requirements](#2-functional-requirements)
3. [Non-Functional Requirements](#3-non-functional-requirements)
4. [Impacted Components](#4-impacted-components)
5. [Implementation Steps](#5-implementation-steps)
6. [Risks and Edge Cases](#6-risks-and-edge-cases)
7. [Testing Strategy](#7-testing-strategy)
8. [Acceptance Criteria](#8-acceptance-criteria)
9. [Git Branching & PR Strategy](#9-git-branching--pr-strategy)
10. [Key Design Decisions](#10-key-design-decisions)

---

## 1. Objective

Implement a deterministic game recording and replay system with unified telemetry for the Phaser 3 side-scroller. The system enables:

- **Event Sourcing:** Immutable, frame-tagged event log replacing mutable state managers
- **PostHog at Scale:** Single pipeline routing lightweight events to PostHog for mass aggregation across thousands of players
- **Deterministic Replay:** Self-hosted JSON replay with drift detection for precise bug reproduction
- **Cleanup:** Remove 25+ scattered `posthog.capture()` calls and the `AnalyticsSystem` class

---

## 2. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Record input state transitions per frame (INPUT_DOWN/INPUT_UP) | P0 |
| FR-2 | Record domain events from all managers (quest, score, progression, quiz, collectible, badge) | P0 |
| FR-3 | Record state snapshots every 300 frames (5s) for drift detection | P0 |
| FR-4 | Export session as SessionJSON with replay_id | P0 |
| FR-5 | Store/retrieve replay JSON via `/api/v1/replays` | P0 |
| FR-6 | Replay sessions frame-by-frame with deterministic physics | P0 |
| FR-7 | Detect drift between recorded and replayed state | P0 |
| FR-8 | Route events to PostHog (lightweight) and backend (heavy) via TelemetryRouter | P0 |
| FR-9 | Replace all `posthog.capture()` calls with DomainEventEmitter | P1 |
| FR-10 | Provide UI for loading and controlling replays | P1 |
| FR-11 | Support URL-based deep linking to specific replay frames | P2 |
| FR-12 | Support batch event ingestion on backend | P1 |

---

## 3. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Fixed timestep determinism | 16.67ms (60fps) |
| NFR-2 | Ring buffer memory bound | 3600 frames max (1 min) |
| NFR-3 | PostHog event size | ~200 bytes per event |
| NFR-4 | Backend event batch size | 10 events or 10s flush |
| NFR-5 | PostHog batch size | 5 events or 5s flush |
| NFR-6 | Drift threshold | 0.5 pixels |
| NFR-7 | Snapshot interval | 300 frames (5s) |
| NFR-8 | Replay JSON storage | PostgreSQL JSONB |
| NFR-9 | Deterministic PRNG | Seeded mulberry32 or xoshiro128 |
| NFR-10 | Virtual timer precision | Exact frame match (±1 frame) |

---

## 4. Impacted Components

### 4.1 Files to Create (13 new files)

| File | Module | Purpose |
|------|--------|---------|
| `front/src/game/systems/DeterministicClock.ts` | P3 | Fixed timestep accumulator |
| `front/src/game/utils/SeededRandom.ts` | P4 | Deterministic PRNG |
| `front/src/game/systems/EventStore.ts` | P5 | Append-only ring buffer |
| `front/src/game/systems/InputCapture.ts` | P6 | Input transition recorder |
| `front/src/game/systems/DomainEventEmitter.ts` | P7 | Centralized event emitter |
| `front/src/game/systems/TelemetryRouter.ts` | P8 | PostHog + backend dispatcher |
| `front/src/game/replay/ReplayEngine.ts` | P10 | Offline replay driver |
| `front/src/game/replay/StateComparator.ts` | P10 | Drift detection |
| `front/src/game/replay/ReplayReducer.ts` | P10 | State reconstruction |
| `front/src/game/replay/ReplayLoaderUI.ts` | P11 | Replay controls UI |
| `front/src/game/replay/ReplayURLHandler.ts` | P11 | URL parsing |
| `front/src/app/replay/[replayId]/page.tsx` | P11 | Next.js route |
| `back/src/modules/replay/game-replay.entity.ts` | P1 | Replay storage entity |

### 4.2 Files to Modify (20+ files)

| File | Change | Risk |
|------|--------|------|
| `Game.ts` | Instantiate DeterministicClock, EventStore, InputCapture, DomainEventEmitter; update `update()` loop | High |
| `Player.ts` | Use `clock.fixedDt` instead of `dt` param; use `inputCapture.isActionDown()` | High |
| `QuestManager.ts` | Inject DomainEventEmitter, replace `this.emit()` calls | Medium |
| `ScoreManager.ts` | Inject DomainEventEmitter, replace `this.emit()` calls | Medium |
| `ProgressionManager.ts` | Inject DomainEventEmitter, replace `this.emit()` calls | Medium |
| `QuizManager.ts` | Replace 8 `posthog.capture()` calls | Medium |
| `CollectibleSystem.ts` | Replace 2 `posthog.capture()` calls | Low |
| `BadgeSystem.ts` | Replace 2 `posthog.capture()` calls | Low |
| `InteractionComponent.ts` | Replace 2 `posthog.capture()` calls | Low |
| `MapIntroScene.ts` | Replace 5 `posthog.capture()` calls | Low |
| `UIScene.ts` | Replace 2 `posthog.capture()` calls | Low |
| `AudioManager.ts` | Replace `Math.random()` with seeded PRNG | Low |
| `EffectsManager.ts` | Replace `Math.random()` with seeded PRNG | Low |
| 6 mechanic handlers | Replace `time.delayedCall()` with `clock.delay()` | Medium |
| `Enemy.ts` | Replace `time.addEvent()` with `clock.delay()` | Low |
| `Portal.ts` | Replace `time.delayedCall()` with `clock.delay()` | Low |
| `MapIntroScene.ts` | Replace `time.addEvent()` with `clock.delay()` | Low |
| `PhaserGame.tsx` | Conditional ReplayEngine vs normal Game | Medium |
| `Makefile` | Add `replay` target | Low |

### 4.3 Files to Delete (1 file)

| File | Reason |
|------|--------|
| `front/src/game/systems/AnalyticsSystem.ts` | Absorbed into DomainEventEmitter + TelemetryRouter |

### 4.4 Architecture Considerations

| Concern | Approach |
|---------|----------|
| **Separation of Concerns** | EventStore (recording), InputCapture (input), DomainEventEmitter (game events), TelemetryRouter (analytics) are separate modules with single responsibilities |
| **Dependency Injection** | Managers receive DomainEventEmitter via constructor, not global import |
| **Backward Compatibility** | Existing `POST /api/v1/events` single endpoint preserved; batch endpoint added alongside |
| **Graceful Degradation** | If PostHog is unavailable, events are buffered and retried; game continues unaffected |
| **Replay Isolation** | ReplayEngine creates minimal Game instance; no network calls, no PostHog, no backend writes |
| **Security** | Replay JSON contains no secrets; PostHog events carry only `replay_id` metadata, not player PII |

---

## 5. Implementation Steps

### Step 1: EventStore (Standalone, No Dependencies)

**Files:** `EventStore.ts` (create), unit tests

**Actions:**
- Implement ring buffer with `append()`, `getFrame()`, `getFrameRange()`, `exportSession()`
- Implement `StoreEvent` type with `seq`, `frame`, `virtualTime`, `type`, `payload`
- Implement snapshot interval logic (every N frames)
- Write unit tests for buffer overflow, export format, frame queries

**Validation:** Unit tests pass, buffer bounded at maxFrames

---

### Step 2: DeterministicClock (Standalone, No Dependencies)

**Files:** `DeterministicClock.ts` (create), `PlayerConfig.ts` (modify), unit tests

**Actions:**
- Implement fixed timestep accumulator with `advance(realDelta)` returning steps consumed
- Implement `delay(ms, callback)` for virtualized timers
- Implement `advanceReplay()` for replay mode
- Add `FIXED_DT = 1000 / 60` constant to `PlayerConfig.ts`
- Write unit tests for accumulator logic, timer queue, mode switching

**Validation:** Unit tests pass, accumulator clamps correctly

---

### Step 3: SeededRandom (Standalone, No Dependencies)

**Files:** `SeededRandom.ts` (create), unit tests

**Actions:**
- Implement mulberry32 or xoshiro128 PRNG with `seed()` and `next()` methods
- Write unit tests for determinism (same seed -> same sequence)

**Validation:** Unit tests pass, sequence is deterministic

---

### Step 4: Backend Replay Storage (Backend, Standalone)

**Files:** `game-replay.entity.ts`, `replay.module.ts`, `replay.service.ts`, `replay.controller.ts`, migration

**Actions:**
- Create `GameReplay` entity with `id`, `userId`, `levelId`, `sessionData` (JSONB)
- Implement `POST /api/v1/replays` (store) and `GET /api/v1/replays/:id` (retrieve)
- Add rate limiting (10 req/min per user for writes)
- Add TTL index for old replays (90 days)
- Generate migration

**Validation:** Backend tests pass, endpoints respond correctly

---

### Step 5: Backend Batch Events Endpoint (Backend, Standalone)

**Files:** `game.controller.ts` (modify), `game.service.ts` (modify)

**Actions:**
- Add `POST /api/v1/events/batch` accepting `{ events: GameEventPayload[] }`
- Process events in transaction
- Keep existing single-event endpoint unchanged

**Validation:** Backend tests pass, batch endpoint processes array correctly

---

### Step 6: InputCapture (Depends on DeterministicClock, EventStore)

**Files:** `InputCapture.ts` (create), `Game.ts` (modify), `Player.ts` (modify), unit tests

**Actions:**
- Wrap `InputManager.getKeys()` and track previous/current frame state
- Implement `sample()` called each fixed frame, emitting INPUT_DOWN/INPUT_UP to EventStore
- Implement `isActionDown()`, `isActionJustDown()`, `isActionJustUp()` for gameplay
- Implement `feedReplayEvent()` for replay mode
- Update `Game.ts` to call `inputCapture.sample()` each frame
- Update `Player.ts` to use `inputCapture.isActionDown()` instead of direct key queries

**Validation:** Unit tests pass, input transitions recorded correctly

---

### Step 7: DomainEventEmitter (Depends on EventStore)

**Files:** `DomainEventEmitter.ts` (create), 10 manager files (modify), unit tests

**Actions:**
- Implement `emit(domain, action, properties)` appending to EventStore and forwarding to TelemetryRouter
- Implement typed convenience methods: `emitQuestEvent()`, `emitScoreEvent()`, etc.
- Inject into QuestManager, ScoreManager, ProgressionManager via constructor
- Replace `posthog.capture()` calls in QuizManager, CollectibleSystem, BadgeSystem, InteractionComponent, MapIntroScene, UIScene
- Update `Game.ts` to instantiate DomainEventEmitter, remove AnalyticsSystem

**Validation:** Unit tests pass, all domain events captured

---

### Step 8: TelemetryRouter (Depends on DomainEventEmitter)

**Files:** `TelemetryRouter.ts` (create), `lib/analyticsApi.ts` (modify), unit tests

**Actions:**
- Implement batch buffering for PostHog (5 events or 5s) and backend (10 events or 10s)
- Implement `route(event)` extracting lightweight PostHog payload and heavy backend payload
- Implement `flush()` for scene change and session end
- Make `posthog-js` import only in this file for game events
- Update `lib/analyticsApi.ts` to keep only non-game React analytics

**Validation:** Unit tests pass, events dispatched to both destinations

---

### Step 9: Remove Scattered Calls (Depends on Step 7, Step 8)

**Files:** `AnalyticsSystem.ts` (delete), 12+ files (remove posthog imports)

**Actions:**
- Delete `AnalyticsSystem.ts`
- Remove `import posthog from "posthog-js"` from QuizManager, CollectibleSystem, BadgeSystem, InteractionComponent, MapIntroScene, UIScene, Game.ts
- Verify `posthog-js` imported in exactly 1 game file: `TelemetryRouter.ts`

**Validation:** Lint passes, no posthog imports outside TelemetryRouter in game/

---

### Step 10: ReplayEngine (Depends on Steps 1-9)

**Files:** `ReplayEngine.ts`, `StateComparator.ts`, `ReplayReducer.ts` (create), unit tests

**Actions:**
- Implement `loadSession(sessionJSON)` initializing EventStore, DeterministicClock (replay mode), InputCapture (replay mode)
- Implement replay loop: get frame events, feed inputs, step physics, apply domain events, check snapshots
- Implement `seekToFrame()`, `seekToTime()`, speed control
- Implement drift detection comparing recorded vs reconstructed state
- Write unit tests for frame progression, drift detection, seek operations

**Validation:** Unit tests pass, replay produces identical state sequence

---

### Step 11: ReplayLoaderUI & URL Handler (Depends on Step 10)

**Files:** `ReplayLoaderUI.ts`, `ReplayURLHandler.ts`, `page.tsx` (create), `PhaserGame.tsx`, `Makefile` (modify)

**Actions:**
- Implement replay controls: play/pause, speed selector, frame scrubber
- Implement URL parsing: `/replay/:replayId?frame=:frame&speed=:speed`
- Implement export dialog: copy replay_id, download JSON, upload to backend
- Update `PhaserGame.tsx` to conditionally create ReplayEngine vs normal Game
- Add `make replay REPLAY_ID=xxx` target to Makefile

**Validation:** Manual test: load replay via URL, controls work, export works

---

## 6. Risks and Edge Cases

### 6.1 Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Fixed timestep causes visual jitter on slow devices | Medium | Medium | Clamp accumulator to max 3 skipped frames; interpolate positions |
| Physics desync between recording and replay | High | Medium | Use only deterministic operations; seed PRNG; virtualize timers |
| PostHog batch API changes or rate limits | Low | Low | TelemetryRouter handles retry; fallback to individual capture() |
| Replay JSON too large for PostgreSQL | Medium | Low | Compress JSONB; add size limit (5MB); use S3 for large replays |
| Virtual timer callbacks fire at wrong frame | High | Medium | Priority queue sorted by virtualTime; test with all 9 timer sites |
| Domain event injection changes manager behavior | High | Low | Inject via constructor; keep existing event emission as fallback during migration |

### 6.2 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Player dies mid-replay | Replay continues; death event recorded; StateComparator compares health state |
| Network failure during replay export | Buffer events locally; retry on reconnection; do not lose recorded data |
| Session longer than ring buffer (3600 frames) | Export periodically and clear; or increase buffer size in debug mode |
| Multiple rapid state changes in one frame | All events recorded in sequence; frame number shared across events |
| Timer callback fires after scene shutdown | Cancel token issued by `clock.delay()` used to clean up on shutdown |
| PostHog initialization fails | TelemetryRouter buffers events; retry on next flush; game continues unaffected |
| Replay loaded from different level than recorded | ReplayEngine validates `levelId` matches; reject if mismatch |
| Backend replay endpoint unavailable | Frontend queues export locally; retry with exponential backoff |

---

## 7. Testing Strategy

### 7.1 Unit Tests (All new modules)

| Module | Test Cases |
|--------|------------|
| `DeterministicClock` | Accumulator clamps, steps consumed correctly, timer fires at virtual time, replay mode advances one step |
| `EventStore` | Append, getFrame, ring buffer overflow, exportSession format, clear |
| `InputCapture` | Transition detection (down/up), heldActions tracking, replay mode feedReplayEvent |
| `DomainEventEmitter` | Emit appends to EventStore, forwards to TelemetryRouter, typed methods correct |
| `TelemetryRouter` | Batch buffering, flush on threshold, flush on demand, PostHog payload format, backend payload format |
| `SeededRandom` | Same seed -> same sequence, different seeds -> different sequences |
| `ReplayEngine` | Load session, frame progression, drift detection, seekToFrame |
| `StateComparator` | Compare matching states (no drift), compare divergent states (drift detected) |

### 7.2 Integration Tests

| Test | Scope |
|------|-------|
| Full recording pipeline | Play game -> EventStore contains events -> export produces valid SessionJSON |
| Full replay pipeline | Load SessionJSON -> ReplayEngine runs -> zero drift on deterministic sequence |
| Telemetry dispatch | DomainEventEmitter -> TelemetryRouter -> PostHog buffer filled, backend buffer filled |
| Manager injection | QuestManager.collectInfo() -> DomainEventEmitter.emit() -> EventStore.append() |

### 7.3 E2E / Manual Tests

| Test | Steps |
|------|-------|
| Recording test | Play full level -> verify SessionJSON exported -> check event count |
| Replay test | Load replay -> verify visual match -> check drift = 0 |
| PostHog test | Play game -> check PostHog Live Events -> verify `replay_id` present |
| Backend test | Store replay -> retrieve replay -> verify JSON matches |
| Batch test | Send batch of 10 events -> verify all processed |
| Cleanup test | Verify `posthog-js` imported in exactly 1 game file |
| Timer test | Record session with delayed calls -> replay -> verify callbacks fire at correct virtual times |
| PRNG test | Record same sequence twice -> verify identical event sequences |

### 7.4 Lint & Typecheck

```bash
make lint        # Must pass
npm run typecheck # Must pass
make test        # Must pass
```

---

## 8. Acceptance Criteria

### 8.1 Recording

- [ ] `DeterministicClock` uses fixed 16.67ms timestep; no variable `delta` in game logic
- [ ] `SeededRandom` replaces all `Math.random()` calls in game code
- [ ] All `time.delayedCall()` and `time.addEvent()` calls replaced with `clock.delay()`
- [ ] `EventStore` records INPUT_DOWN/INPUT_UP transitions per frame
- [ ] `EventStore` records all domain events from managers
- [ ] `EventStore` records STATE_SNAPSHOT every 300 frames
- [ ] `EventStore.exportSession()` produces valid SessionJSON with `replay_id`

### 8.2 Telemetry

- [ ] `posthog-js` imported in exactly 1 game file: `TelemetryRouter.ts`
- [ ] `AnalyticsSystem.ts` deleted
- [ ] All 25+ `posthog.capture()` calls replaced with `DomainEventEmitter.emit()`
- [ ] `TelemetryRouter` batches PostHog events (5 or 5s) and backend events (10 or 10s)
- [ ] PostHog events include `replay_id` property
- [ ] Backend receives batched events via `POST /api/v1/events/batch`

### 8.3 Replay

- [ ] `POST /api/v1/replays` stores SessionJSON in database
- [ ] `GET /api/v1/replays/:id` retrieves SessionJSON
- [ ] `ReplayEngine` loads SessionJSON and runs frame-by-frame
- [ ] `StateComparator` detects drift > 0.5 pixels
- [ ] Replay produces zero drift on deterministic recording
- [ ] `ReplayLoaderUI` provides play/pause, speed control, frame scrubber
- [ ] URL format `/replay/:replayId?frame=:frame` works

### 8.4 Code Quality

- [ ] All new modules have unit tests
- [ ] `make lint` passes
- [ ] `npm run typecheck` passes
- [ ] `make test` passes
- [ ] No `any` types in new code
- [ ] All public APIs documented with JSDoc

---

## 9. Git Branching & PR Strategy

### 9.1 Branch Hierarchy

```
develop
 └── feat/event-sourcing-replay                 <-- Integration branch (all PRs target this)
      ├── feat/deterministic-clock              <-- PR 1: Determinism foundation
      ├── feat/event-recording-pipeline         <-- PR 2: Recording infrastructure
      ├── refactor/telemetry-unification        <-- PR 3: Cleanup + backend
      └── feat/replay-engine                    <-- PR 4: Replay capability
```

### 9.2 PR Breakdown

#### PR 1: `feat/deterministic-clock` -> `feat/event-sourcing-replay`

**Scope:** Fixed timestep, seeded PRNG, virtual timers (Steps 2-3)

| Action | Details |
|--------|---------|
| Create | `DeterministicClock.ts`, `SeededRandom.ts` |
| Modify | `Game.ts`, `Player.ts`, `PlayerConfig.ts`, `AudioManager.ts`, `EffectsManager.ts` |
| Modify | `Enemy.ts`, `Portal.ts`, `MapIntroScene.ts`, `InteractionComponent.ts` |
| Modify | 6 mechanic handlers (Poster, Painting, Photo, Sculpture, Collectible, Interaction) |
| Tests | Unit tests for DeterministicClock, SeededRandom |

**Commits:**
```
feat(front): add DeterministicClock with fixed timestep accumulator
feat(front): add SeededRandom utility for deterministic PRNG
refactor(front): replace Math.random with seeded PRNG in AudioManager and EffectsManager
refactor(front): replace time.delayedCall and time.addEvent with clock.delay
```

**Acceptance:**
- [ ] Fixed 16.67ms timestep; no variable `delta` in game logic
- [ ] All `Math.random()` in game code replaced with seeded PRNG
- [ ] All 12 `time.delayedCall()`/`time.addEvent()` sites replaced with `clock.delay()`
- [ ] Game plays normally at 60fps (no visual regression)
- [ ] `make lint` passes
- [ ] `npm run typecheck` passes

---

#### PR 2: `feat/event-recording-pipeline` -> `feat/event-sourcing-replay`

**Scope:** EventStore, InputCapture, DomainEventEmitter, TelemetryRouter (Steps 1, 6-8)

| Action | Details |
|--------|---------|
| Create | `EventStore.ts`, `InputCapture.ts`, `DomainEventEmitter.ts`, `TelemetryRouter.ts` |
| Modify | `Game.ts` (instantiate new modules), `Player.ts` (use InputCapture) |
| Tests | Unit tests for all 4 new modules |

**Commits:**
```
feat(front): add EventStore ring buffer for event recording
feat(front): add InputCapture for frame-level input state transitions
feat(front): add DomainEventEmitter centralized event emitter
feat(front): add TelemetryRouter for PostHog and backend API dispatch
```

**Acceptance:**
- [ ] `EventStore` records events and exports valid SessionJSON
- [ ] `InputCapture.sample()` detects key transitions
- [ ] `DomainEventEmitter` appends to EventStore and forwards to TelemetryRouter
- [ ] `TelemetryRouter` batches PostHog (5/5s) and backend (10/10s)
- [ ] Game plays normally (new modules added, old code still runs)
- [ ] `make lint` passes
- [ ] `npm run typecheck` passes

---

#### PR 3: `refactor/telemetry-unification` -> `feat/event-sourcing-replay`

**Scope:** Remove scattered calls, delete AnalyticsSystem, add backend endpoints (Steps 4-5, 9)

| Action | Details |
|--------|---------|
| Delete | `AnalyticsSystem.ts` |
| Modify (FE) | `QuizManager.ts`, `CollectibleSystem.ts`, `BadgeSystem.ts`, `InteractionComponent.ts`, `MapIntroScene.ts`, `UIScene.ts`, `Game.ts` |
| Create (BE) | `game-replay.entity.ts`, `replay.module.ts`, `replay.service.ts`, `replay.controller.ts` |
| Modify (BE) | `game.controller.ts`, `game.service.ts`, `app.module.ts` |
| Migration | `GameReplay` entity with JSONB |

**Commits:**
```
refactor(front): remove AnalyticsSystem, wire managers to DomainEventEmitter
refactor(front): remove posthog-js imports from game files
feat(back): add GameReplay entity and replay storage endpoints
feat(back): add batch events endpoint for telemetry
```

**Acceptance:**
- [ ] `AnalyticsSystem.ts` deleted
- [ ] `posthog-js` imported in exactly 1 game file: `TelemetryRouter.ts`
- [ ] All 25+ `posthog.capture()` calls replaced with `DomainEventEmitter.emit()`
- [ ] `POST /api/v1/replays` stores SessionJSON
- [ ] `GET /api/v1/replays/:id` retrieves SessionJSON
- [ ] `POST /api/v1/events/batch` processes array of events
- [ ] `make lint` passes
- [ ] `npm run typecheck` passes

---

#### PR 4: `feat/replay-engine` -> `feat/event-sourcing-replay`

**Scope:** Offline replay engine, drift detection, UI, URL handler (Steps 10-11)

| Action | Details |
|--------|---------|
| Create | `ReplayEngine.ts`, `StateComparator.ts`, `ReplayReducer.ts`, `ReplayLoaderUI.ts`, `ReplayURLHandler.ts`, `page.tsx` |
| Modify | `PhaserGame.tsx`, `Makefile` |

**Commits:**
```
feat(front): add ReplayEngine for offline deterministic replay
feat(front): add StateComparator for drift detection
feat(front): add ReplayReducer for state reconstruction
feat(front): add ReplayLoaderUI and URL handler
chore: add make replay target to Makefile
```

**Acceptance:**
- [ ] `ReplayEngine` loads SessionJSON and runs frame-by-frame
- [ ] `StateComparator` detects drift > 0.5 pixels
- [ ] Replay produces zero drift on deterministic recording
- [ ] `ReplayLoaderUI` provides play/pause, speed control, frame scrubber
- [ ] URL `/replay/:replayId` loads and plays replay
- [ ] `make replay REPLAY_ID=xxx` launches replay
- [ ] `make lint` passes
- [ ] `npm run typecheck` passes

---

### 9.3 Final Verification (After All 4 PRs Merged)

| # | Verification | Expected |
|---|-------------|----------|
| 1 | Record session -> export valid SessionJSON with `replay_id` | PASS |
| 2 | Replay session -> zero drift on deterministic recording | PASS |
| 3 | PostHog events include `replay_id` property | PASS |
| 4 | `posthog-js` imported in exactly 1 game file | PASS |
| 5 | `POST /api/v1/replays` stores and retrieves replay | PASS |
| 6 | `POST /api/v1/events/batch` processes multiple events | PASS |
| 7 | Virtual timers fire at correct virtual times during replay | PASS |
| 8 | PRNG produces identical sequences given same seed | PASS |
| 9 | Drift detection flags intentional desync | PASS |
| 10 | `make lint`, `npm run typecheck`, `make test` all pass | PASS |

---

## 10. Key Design Decisions

| # | Decision | Rationale | Trade-off |
|---|----------|-----------|-----------|
| 1 | Fixed timestep over variable | Determinism required for replay; fixed step eliminates frame-rate-dependent physics | Slight overhead from accumulator on fast machines |
| 2 | Self-hosted replay over PostHog Recordings | PostHog RR is session replay, not deterministic game replay; we need frame-precise input replay | We maintain our own storage and UI |
| 3 | PostgreSQL JSONB over S3 | Simpler infra; atomic transactions; JSONB indexing for metadata queries | Size limit ~256MB practical; S3 for scale later |
| 4 | Iterate `posthog.capture()` over batch endpoint | PostHog batch API is experimental; individual calls are stable and sufficient at 5 events/5s | Slightly more HTTP overhead |
| 5 | Constructor injection over global import | Testability; replay isolation; explicit dependencies | More constructor params in managers |
| 6 | Ring buffer (3600 frames) over unbounded | Bounded memory; 1 minute is sufficient for level replays | Long sessions require periodic export |
| 7 | 300-frame snapshot interval | 5s granularity balances drift detection precision vs storage cost | Drift may propagate up to 5s before detection |
| 8 | Separate replay path over inline | Replay is opt-in; normal gameplay unaffected by replay infrastructure | Code duplication for physics step (mitigated by shared DeterministicClock) |
