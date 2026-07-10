1. Strengths & Weaknesses

**Strengths:**
- Clean separation of concerns — persistence, quiz, data loading, mechanics are each in their own module
- `QuizManagerContext` interface is a good decoupling pattern, avoids circular imports
- `GameDataAccessor` interface is well-scoped and minimal
- `WorkDataHelper` is pure, testable, no side effects
- `PersistenceBridge` centralizes scattered save logic well
- Test coverage is thorough (192 tests, good edge cases)
- Documentation in `REFACTORING-game-scene.md` is excellent

**Weaknesses:**
- `PaintingMechanicHandler` and `SculptureMechanicHandler` are ~90% identical (DRY violation)
- Handlers import `Game` directly despite `GameDataAccessor` existing — the interface isn't used where it matters most
- Unsafe `scene as Game` cast without validation
- `QuizManager.startQuiz` is a 230-line deeply-nested callback chain — still a "mini god method"
- Multiple duplicated patterns (event emission, `emitMissionProgress` in both handlers, `createMockGame` in both test files)
- Hardcoded magic numbers scattered across new code

---

### 2. Issues by Severity

#### CRITICAL

**C1. Unsafe `scene as Game` cast in both handlers**
- `PaintingMechanicHandler.ts:40` and `SculptureMechanicHandler.ts:35` — `const g = scene as Game`
- If any future code path passes a different scene (e.g., during scene transitions), this silently corrupts state or crashes
- **Fix:** Accept a typed interface instead, or guard the cast:
  ```ts
  if (!(scene instanceof Game)) {
    console.error('[PaintingHandler] Expected Game scene');
    return;
  }
  ```

**C2. `analyticsSystem` used before first assignment in Game.ts**
- `QuizManager` is created at line 347 and receives `this.analyticsSystem` — but `this.analyticsSystem` is assigned at line 371, after `QuizManager` construction
- At construction time, `analyticsSystem` is `undefined` inside the QuizManager
- However, it's only *used* inside callbacks that fire later (after `create()` completes), so it works at runtime by accident — the reference is read lazily from the QuizManager's stored reference
- **Fix:** Move `this.analyticsSystem = new AnalyticsSystem(this)` above QuizManager construction, or pass it via the context getter pattern

**C3. Handlers depend on `Game` directly, defeating `GameDataAccessor`**
- Both handlers `import type { Game } from "../../scenes/Game"` and use `g.registry`, `g.contentData`, `g.placeholderSystem`, `g.questManager`, `g.events`, etc.
- The `GameDataAccessor` interface was created to break this coupling but isn't used here
- **Fix:** Either expand `GameDataAccessor` to cover what handlers need, or accept that handlers need scene-level access and use a narrower `DropHandlerContext` interface

---

#### HIGH

**H1. Painting and Sculpture handlers are ~90% identical**
- Same structure: `handleDropResult` → `handleSnapped` → increment counter → emit dialogue → check completion → `handleMismatch` → resolve work → show feedback → `emitMissionProgress`
- Differences: floor index, dialogue key (`PAINTING` vs `SCULPTURE`), infoKey (`PAINTINGS_DONE` vs `SCULPTURES_DONE`)
- **Fix:** Extract a shared `DragDropHandlerBase` class parameterized by `{ floorIndex, dialogueCategory, completionInfoKey }`

**H2. `emitMissionProgress` duplicated in both handlers**
- Lines `PaintingMechanicHandler.ts:99-109` and `SculptureMechanicHandler.ts:96-106` are identical
- **Fix:** Extract to shared base class or utility function

**H3. `DropResult` type exported from `PaintingMechanicHandler.ts`**
- `SculptureMechanicHandler.ts:14` imports `DropResult` from the painting handler
- Cross-dependency between sibling handlers; should live in a shared types file
- **Fix:** Move `DropResult` to `mechanics/handlers/types.ts` or into `BaseMechanicHandler.ts`

**H4. `QuizManager.startQuiz` is still a 230-line callback pyramid**
- Lines 69–298 — deeply nested callbacks (confirmation → quiz → result → scoring → persistence → analytics → quest update)
- Hard to reason about, test individual branches, or modify without risk
- **Fix:** Extract the quiz result callback into a named method `handleQuizResult(score, questions, missionId)`, and extract the analytics/persistence side-effects into a `QuizResultHandler` or at minimum private methods

**H5. Hardcoded passing threshold**
- `QuizManager.ts:111`: `const required = Math.ceil(questions.length * 0.7);`
- Magic number `0.7` (70%) — should be a named constant from config
- **Fix:** Add `QUIZ_PASS_THRESHOLD = 0.7` to constants or `LevelDefinition`

---

#### MEDIUM

**M1. All persistence errors silently swallowed**
- `PersistenceBridge.ts` — every method catches, logs `console.warn/error`, and returns `void`
- Callers (especially `submitScore` in quiz flow) have no way to know the save failed
- Could lead to data loss where user thinks score was saved but it wasn't
- **Fix:** At minimum, add a return value or observable state; for critical saves (score submission), consider retry logic or user notification

**M2. Duplicate `this.setupCameras()` call**
- `Game.ts:530` (inside `if (mapData)`) and `Game.ts:961` (at end of `create()`)
- Second call is harmless but wasteful; if `mapData` is null, only the second runs (which would crash on `this.player`)
- **Fix:** Remove the duplicate at line 530

**M3. Magic numbers in new code**
- `SculptureMechanicHandler` / `PaintingMechanicHandler`: `0.7` threshold, `500` ms delay, `150` px NPC offset
- `QuizManager.ts:325`: `const npcX = playerX + 150;`
- **Fix:** Extract to named constants

**M4. `GameDataLoader` validates quiz keys after merging**
- Lines 49–56 run validation *after* the data has already been merged
- Unknown keys are in `contentData` before the warning fires
- Not a bug, but the validation should arguably happen before merge, or the warning should be clearer
- **Fix:** Move validation to after the loop, but ensure it's clearly a dev-time check only

**M5. `QuizManagerContext.getEvents()` return type is too weak**
- Returns `{ emit: (event: string, ...args: unknown[]) => void }` — loses all type safety
- Game events are typed via `GameEventMap`, but this context uses untyped strings
- **Fix:** Type it as `Phaser.Events.EventEmitter` or create a narrow `EventEmitter` interface matching the events QuizManager actually emits

**M6. `void` fire-and-forget pattern without error observation**
- `QuizManager.ts:160,170,184,231,396,421` — `void this.persistenceBridge.submitScore()` etc.
- Intentional fire-and-forget, but if persistence fails repeatedly, there's no retry or user feedback
- **Fix:** Acceptable for non-critical saves, but `submitScore` in the quiz flow should at least log a user-visible warning on failure

---

#### LOW

**L1. Portuguese/English mix in JSDoc and comments**
- `BaseMechanicHandler.ts` comments are in Portuguese (`"Contrato base para todos os handlers..."`)
- New module docs are in English
- **Fix:** Standardize on English for code comments

**L2. `NpcLike` interface duplicates Npc API**
- `QuizManager.ts:32-42` defines `NpcLike` with 10 methods matching `Npc`
- If `Npc` changes its API, `NpcLike` silently diverges
- **Fix:** Have `Npc` implement a `QuizableNpc` interface that `NpcLike` references

**L3. `createMockGame` duplicated in handler test files**
- `PaintingMechanicHandler.test.ts:7-43` and `SculptureMechanicHandler.test.ts:7-43` are nearly identical
- **Fix:** Extract to a shared `__test-utils__/mockGame.ts`

**L4. `buildLabelInfo` recursive parent traversal has no depth limit**
- `WorkDataHelper.ts:54` — `return buildLabelInfo(parentWork, findWorkFn)` with no cycle detection
- If data has a circular `parent_id` reference, this stack-overflows
- **Fix:** Add a `maxDepth` parameter or a `visited` Set

**L5. `resolveWorkIdFromPlaceholder` fallback returns first ID even if invalid**
- `WorkDataHelper.ts:38` — `return ids[0] || null` when no ID matches
- Returns an ID that doesn't exist in `contentData`, which could cause downstream null dereference
- **Fix:** Return `null` when no valid match is found, not the first raw ID

---

### 3. Concrete Recommendations

**Quick wins (< 1 hour):**
1. Move `DropResult` to shared types file
2. Extract `emitMissionProgress` to shared utility
3. Move `analyticsSystem` initialization above `quizManager` in `Game.create()`
4. Remove duplicate `this.setupCameras()` call
5. Add `QUIZ_PASS_THRESHOLD` constant
6. Fix `resolveWorkIdFromPlaceholder` fallback to return `null` when no match

**Medium effort (1-3 hours):**
7. Create `DragDropHandlerBase` class and refactor both handlers to extend it
8. Extract `QuizManager.startQuiz` result callback into `handleQuizResult()` method
9. Add guard to `scene as Game` cast in handlers
10. Create `DropHandlerContext` interface to reduce handler dependency on full `Game` class

**Larger refactors (if pursuing multi-level):**
11. Move `scoringFloors` into `LevelDefinition`
12. Make `NPC_FLOOR_3_POSITION` level-configurable
13. Add `levelId` to `MissionRegistry` entries

---

### 4. Architectural Concerns

**Handler coupling to Game scene is the biggest structural issue.** The refactoring created `GameDataAccessor` to decouple data access, but the handlers bypass it entirely and import `Game` directly. For multi-level support, this means every handler will need to know about level-specific Game state (floor indices, NPC positions, etc.) rather than receiving it as configuration. The `DragDropHandlerBase` refactor should accept a `DropHandlerContext` with the specific data handlers need, not the entire scene.

**`QuizManager.startQuiz` callback pyramid is fragile.** The quiz result callback at line 109–282 touches scoring, analytics (PostHog + AnalyticsSystem), persistence (3 calls), quest state, progression, badge checking, and UI events — all in one nested closure. If any of these steps needs to change (e.g., adding retry logic, adding a new tracking event, or reordering), the entire callback must be carefully edited. This is the kind of code that accumulates bugs during feature development.

**Silent error swallowing in PersistenceBridge can mask data loss.** Score submissions that silently fail mean users lose progress without knowing. For a game, this is particularly damaging to trust. At minimum, a failed score submission should trigger a visible retry or user notification.
