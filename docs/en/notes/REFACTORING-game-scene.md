# Game Scene Refactoring — Modular Architecture

> **Historical snapshot.** Phase 1 split, committed 2026-07-07. The line
> counts below describe that point in time: `front/src/game/scenes/Game.ts` has
> since grown back to about 3113 lines as more levels were added.

> **Branch:** `refactor/game-scene-split`
> **Date:** July 2025
> **Status:** Complete (Phase 1)

## Goal

Break down the monolithic `Game.ts` scene (~1800 lines) into focused, testable modules
to support multi-level architecture and improve maintainability.

## Results

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| `Game.ts` | 1795 lines | 1148 lines | **−36%** |
| Test suites | 18 | 24 | +6 |
| Test cases | 175 | 192 | +17 |
| Typecheck | ✅ | ✅ | — |
| Lint | ✅ | ✅ | — |

---

## Extracted Modules

### 1. `WorkDataHelper` — Pure Utility Functions

**File:** `src/game/utils/WorkDataHelper.ts` (75 lines)
**Tests:** `src/game/utils/WorkDataHelper.test.ts` (198 lines)

Three pure functions extracted from Game.ts for resolving and building work/label data:

| Function | Purpose |
|----------|---------|
| `resolveWorkIdFromPlaceholder(placeholderId, contentData)` | Maps a placeholder ID to its work ID via content data |
| `findWorkDataById(workId, contentData)` | Looks up work data (painting/sculpture metadata) by ID |
| `buildLabelInfo(work, findWork)` | Builds label display payload from work data |

**Why:** These were private methods on Game that mixed data resolution with scene
state. Extracting them makes them independently testable and reusable.

---

### 2. `GameDataAccessor` — Interface for Data Access

**File:** `src/game/types/GameDataAccessor.ts` (12 lines)

```ts
export interface GameDataAccessor {
  getWorks(): WorksJson;
  getMessages(): MessagesJson;
  getCollectibles(): CollectiblesJson;
}
```

Implemented by `Game` scene. Allows managers and handlers to access content data
without importing the full Game scene (breaks circular dependencies).

---

### 3. `PaintingMechanicHandler` — Painting Drop Logic

**File:** `src/game/mechanics/handlers/PaintingMechanicHandler.ts` (110 lines)
**Tests:** `src/game/mechanics/handlers/PaintingMechanicHandler.test.ts` (161 lines)

Handles the drag-and-drop mechanic for paintings:
- Validates drop target (correct floor, correct slot)
- Snaps item to grid
- Records score via `Game.recordFloorError()` / `Game.completeFloor()`
- Emits dialogue on completion
- Checks for floor completion

Implements `BaseMechanicHandler` and registers with `MechanicsManager`.

---

### 4. `SculptureMechanicHandler` — Sculpture Drop Logic

**File:** `src/game/mechanics/handlers/SculptureMechanicHandler.ts` (107 lines)
**Tests:** `src/game/mechanics/handlers/SculptureMechanicHandler.test.ts` (152 lines)

Same pattern as `PaintingMechanicHandler` but for sculptures. Handles:
- Drop validation against sculpture floor
- Score recording
- Floor completion tracking

Both handlers share the same interface (`BaseMechanicHandler`) but use different
floor indices from `Game.scoringFloors`.

---

### 5. `PersistenceBridge` — Score/Progress Save Orchestration

**File:** `src/game/systems/PersistenceBridge.ts` (147 lines)
**Tests:** `src/game/systems/PersistenceBridge.test.ts` (174 lines)

Wraps `GamePersistence` and orchestrates save operations:

| Method | Purpose |
|--------|---------|
| `initializeCollectibles()` | Loads collectibles from API, syncs to `CollectibleSystem` |
| `initializeProgression()` | Loads user progress from API, syncs to `ProgressionManager` |
| `submitScore()` | Saves score + progression + collectibles in parallel |
| `saveProgress()` | Saves progression state |
| `sendQuizOutcome(event)` | Sends quiz result to API |

**Why:** These operations were scattered across `Game.create()` and quiz callbacks,
with duplicated error handling. `PersistenceBridge` centralizes persistence concerns.

---

### 6. `QuizManager` — Quiz Logic Extraction

**File:** `src/game/systems/QuizManager.ts` (471 lines)
**Tests:** `src/game/systems/QuizManager.test.ts` (300 lines)

The largest extraction. Moved all quiz-related state and logic out of Game:

**State managed:**
- `quizMode`: `"none" | "regular" | "intermediate"`
- `isQuizActive`: boolean
- `quizStartedAt`: timestamp
- `quizAttemptsForMission`: counter

**Methods moved:**
- `startQuiz(missionId)` — Full quiz flow: NPC dialog → confirmation → quiz UI → scoring → progression → persistence
- `startIntermediateQuiz(infoKey)` — Info-panel quiz flow with NPC spawn/despawn

**Design:** Uses a `QuizManagerContext` interface to access Game state without importing
Game directly. This keeps QuizManager decoupled from the scene while still accessing
`levelId`, `levelDef`, `registry`, `npcs`, `player`, `events`, and `contentData`.

**Game.ts delegation:**
```ts
public startQuiz(missionId: string) {
  this.quizManager.startQuiz(missionId);
}
public startIntermediateQuiz(infoKey: string) {
  this.quizManager.startIntermediateQuiz(infoKey);
}
```

---

### 7. `GameDataLoader` — Modular Data Merging

**File:** `src/game/systems/GameDataLoader.ts` (98 lines)
**Tests:** `src/game/systems/GameDataLoader.test.ts` (141 lines)

Extracted `processModularData()` — the function that merges JSON data files into
`ContentJson` at runtime:

```ts
processModularData(levelDef, contentData, cacheGet)
```

Loads works, quizzes, intermediate quizzes, NPCs, messages, and collectibles from
the Phaser cache and deep-merges them into the content data structure. Validates
intermediate quiz keys against `MissionKeys`.

---

## Architecture Diagram

```
Game.ts (1148 lines) — Orchestrator
├── Systems
│   ├── QuizManager          — Quiz start/result logic
│   ├── PersistenceBridge    — API save orchestration
│   ├── GameDataLoader       — JSON data merging
│   ├── AnalyticsSystem      — Event tracking
│   ├── BadgeSystem          — Achievement checking
│   ├── CollectibleSystem    — Collectible management
│   ├── HintKeySystem        — Interaction hints
│   ├── LabelSystem          — Work labels
│   └── PlaceholderSystem    — Placeholder management
├── Mechanics
│   ├── MechanicsManager     — Routes interactions to handlers
│   └── Handlers
│       ├── PhotoMechanicHandler   — Photo chunk assembly
│       ├── PaintingMechanicHandler — Painting drop validation
│       └── SculptureMechanicHandler — Sculpture drop validation
├── Managers
│   ├── QuestManager         — Mission/quest state
│   ├── ScoreManager         — Scoring calculations
│   ├── LevelManager         — Level progression
│   └── ProgressionManager   — User progress tracking
├── Objects
│   ├── Player               — Player character
│   ├── Npc                  — NPC behavior
│   ├── Enemy                — Rat enemy
│   ├── DraggableItem        — Draggable objects
│   └── CarryableItem        — Carryable objects
└── Utils
    └── WorkDataHelper       — Work/label data resolution
```

---

## What Remains for Multi-Level Support

The refactoring above focused on **extracting concerns from Game.ts**. The following
items remain to make the architecture fully level-aware:

| Item | Current State | Needed |
|------|--------------|--------|
| `LEVEL_ASSETS` | Legacy flat list, hardcoded to `level_01` | Move into `LevelDefinition` or derive from data files |
| `PHASE_SETTINGS` | Convenience object pointing to `level_01` | Remove or make dynamic |
| `MissionRegistry` | No `levelId` — missions are global | Add `levelId` field or key missions per-level |
| `scoringFloors` in Game.ts | Hardcoded `{ paintings: 0, sculptures: 1, photo: 2 }` | Configurable per-level floor layout |
| `NPC_FLOOR_3_POSITION` | Hardcoded pixel coordinate | Should come from level data or tilemap |
| `MapIntroScene` marker→level mapping | 6 markers defined, only index 0 → `level_01` | Implement marker-to-levelId resolution |
| `UIScene` quiz-close restart | Hardcoded `"level_01"` | Use `registry.get("currentLevelId")` |

---

## File Reference

### New Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/game/utils/WorkDataHelper.ts` | 75 | Pure work data utilities |
| `src/game/types/GameDataAccessor.ts` | 12 | Data access interface |
| `src/game/mechanics/handlers/PaintingMechanicHandler.ts` | 110 | Painting drop logic |
| `src/game/mechanics/handlers/SculptureMechanicHandler.ts` | 107 | Sculpture drop logic |
| `src/game/systems/PersistenceBridge.ts` | 147 | Save orchestration |
| `src/game/systems/QuizManager.ts` | 471 | Quiz logic |
| `src/game/systems/GameDataLoader.ts` | 98 | Data merging |

### New Test Files

| File | Lines |
|------|-------|
| `src/game/utils/WorkDataHelper.test.ts` | 198 |
| `src/game/mechanics/handlers/PaintingMechanicHandler.test.ts` | 161 |
| `src/game/mechanics/handlers/SculptureMechanicHandler.test.ts` | 152 |
| `src/game/systems/PersistenceBridge.test.ts` | 174 |
| `src/game/systems/QuizManager.test.ts` | 300 |
| `src/game/systems/GameDataLoader.test.ts` | 141 |

### Modified Files

| File | Change |
|------|--------|
| `src/game/scenes/Game.ts` | 1795 → 1148 lines. Delegates to extracted modules. Implements `GameDataAccessor`. |
| `src/game/mechanics/MechanicsManager.ts` | Added `getHandler(type)` method for drop routing. |
