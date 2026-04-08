# Agent Guide (Phaser + Vite + TypeScript)

This repository is a Phaser 3 game built with Vite and TypeScript.

## Quick Commands

### Install

```bash
npm install
```

### Dev server

```bash
# Default (includes template telemetry via log.js)
npm run dev

# No telemetry
npm run dev-nolog
```

Vite dev server runs on `http://localhost:8080`.

### Production build

```bash
# Default (includes template message/telemetry)
npm run build

# No telemetry
npm run build-nolog
```

### Typecheck

There is no dedicated `typecheck` script; run TypeScript directly:

```bash
npx tsc -p tsconfig.json --noEmit
```

### Lint

No ESLint/Prettier/Biome configuration is present. TypeScript compiler settings act as the primary guardrails:

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`

If adding a linter/formatter, keep configuration minimal and compatible with Vite + Phaser.

### Tests

No test runner is currently configured (no `test` script in `package.json`).

## Running One Test

There are no tests yet. If you add a test runner, standardize on a pattern that supports single-test execution. Examples:

- Vitest: `npm run test -- --run path/to/test.spec.ts`
- Jest: `npm run test -- path/to/test.spec.ts -t "test name"`
- Playwright: `npm run test -- --project=chromium tests/foo.spec.ts`

## Project Layout

- `src/main.ts`: app bootstrap (calls `StartGame`).
- `src/game/main.ts`: Phaser game config (canvas size, scaling, scenes).
- `src/game/scenes/`: Phaser scenes.
  - `Game` is the gameplay scene.
  - `UIScene` is a UI overlay scene (HUD) that should not be affected by camera follow/zoom.
- `src/game/objects/`: game objects and UI systems (player, NPC, dialogue, quiz, quest manager).
- `src/game/Assets/`: game assets loaded via Phaser loader.

## Phaser Architecture Conventions

### Scenes

- Keep gameplay logic in `Game` (world, physics, camera follow/zoom).
- Keep screen-space UI in a separate scene (e.g. `UIScene`) to avoid camera zoom affecting HUD.
- Prefer `scene.launch('UIScene', data)` + `scene.bringToTop('UIScene')` for overlays.

### Screen-space UI

- If UI lives inside the gameplay scene, use `setScrollFactor(0)`.
- Prefer responsive layout using `this.scale.width/height` and `this.scale.on('resize', ...)`.
- Avoid hard-coding `1920/1080` for new UI; use the camera/scale dimensions.

### Events (decoupling)

Use `scene.events.emit(...)` to decouple systems. Existing event patterns include:

- `dialogue-started` / `dialogue-ended` for input gating.
- mission/HUD updates: `mission-accepted`, `mission-progress-changed`, `mission-status-changed`.

When you add new events:

- Name them in kebab-case.
- Document the payload shape at the emission site.

### Cleanup

Phaser event listeners must be removed to avoid leaks:

- If you attach to `scene.events`, unregister on `shutdown`.
- If you attach to `Phaser.Scenes.Events.UPDATE`, unregister on destroy.
- If you add keyboard listeners, unregister when the owning object/system is destroyed.

Prefer patterns already used in the codebase:

- `this.once(Phaser.GameObjects.Events.DESTROY, () => off(...))`
- `this.events.once('shutdown', () => off(...))`

## TypeScript + Code Style

### Formatting

- Indentation: 4 spaces (match existing files).
- Keep lines readable; wrap long object literals and text blocks.
- Prefer LF line endings.

### Imports

- Use ES module imports.
- Prefer named imports where available.
- Keep import order simple:
  1) external modules (`phaser`)
  2) internal modules (`../objects/...`, `./...`)
- Avoid unused imports (TypeScript will error).

### Types

- Avoid `any`. If you must bridge a gap, prefer narrow casting:
  - good: `const game = this.scene.get('Game') as Game`
  - avoid: `as any` unless there is no better option
- Use explicit return types on public APIs when it clarifies intent.
- Model data with interfaces/types (e.g. quest definitions, HUD payloads).

### Naming

- Classes: `PascalCase` (`QuestManager`, `DialogueSystem`).
- Methods/fields: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` only for true constants.
- Event names: kebab-case strings.
- Asset keys: keep stable string keys (e.g. `statue_info`, `painting_info`).

### Error handling and guards

- Prefer early returns for invalid state (`if (!this.questManager) return;`).
- Be explicit about state transitions (quest status changes should be centralized and emit updates).
- Do not mutate mission state as a side-effect of UI dismissal unless explicitly required.

### Mission/Dialogue behavior

- `DialogueSystem.showDialogue(lines, onComplete)`:
  - completion callback should represent “player reached the end”, not “dialog opened”.
  - ESC closes dialogue without invoking `onComplete`.
- If gameplay state must change due to quiz results, apply it at quiz completion time, not inside a dialogue completion callback.

## Asset Loading

- Assets are loaded in scene `preload()` using `this.load.*`.
- `Game.preload()` uses `this.load.setPath('src/game/Assets')`.
- Keep loader keys unique and stable; avoid reusing keys for different assets.

## Adding New Features Safely

- Prefer extending `QuestManager` and emitting events over adding ad-hoc globals.
- For new UI panels, implement them in `UIScene` unless they should zoom with gameplay.
- Keep player input gating consistent using `dialogue-started` / `dialogue-ended`.

## Repository Rules

- No Cursor rules found (`.cursor/rules/` or `.cursorrules` not present).
- No GitHub Copilot instructions found (`.github/copilot-instructions.md` not present).
