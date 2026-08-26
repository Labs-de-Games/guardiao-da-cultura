---
name: phaser-4-migration
description: 'Migrate gameplate''s front/ Phaser codebase from Phaser 3.90.0 to Phaser 4.2.1: audit current usage, identify APIs that changed or vanished in Phaser 4, upgrade the dependency, fix imports/API usage, walk every subsystem (Scenes/GameObjects, physics, animations, input/events, Tilemaps/Tiled, plugins), then build and verify. Use when asked to upgrade Phaser, migrate to Phaser 4, or mentions "phaser-4-migration".'
license: MIT
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, WebFetch
---

# Phaser 3.90.0 → 4.2.1 Migration

Target: `front/` (Next.js 15 + Turbopack; Phaser is loaded client-only via `next/dynamic` in `front/src/components/PhaserGame.tsx`, not bundled by a standalone webpack/vite config).

## Source-of-truth ordering

1. **Our actual source code** (`front/src/game/**`) — authority for what the game currently does. Never assume a pattern exists without grepping for it.
2. **Phaser's own live migration checklist** — fetch fresh every run, do not rely on a cached/remembered copy:
   ```bash
   gh api repos/phaserjs/phaser/contents/skills/v3-to-v4-migration/SKILL.md -q '.content' | base64 -d
   ```
   (falls back to `WebFetch` on `https://raw.githubusercontent.com/phaserjs/phaser/master/skills/v3-to-v4-migration/SKILL.md` if `gh` is unavailable)
3. **Phaser 4 API/source** — Phaser ships a full library of per-topic skills at `skills/<topic>/SKILL.md` in the same repo (fetch the same way): `physics-arcade`, `animations`, `scenes`, `sprites-and-images`, `groups-and-containers`, `events-system`, `input-keyboard-mouse-touch`, `tilemaps`, `particles`, `game-setup-and-config`, `filters-and-postfx`, `v4-new-features`. Fetch the ones relevant to what you're touching. If still unclear, read `front/node_modules/phaser/types/phaser.d.ts` or the Phaser source at `github.com/phaserjs/phaser`.
4. **Phaser 3.90 docs** — only as historical reference for what the old API looked like.

## Standing guardrail: never rewrite working code unnecessarily

Only touch code that (a) uses an API the checklist marks removed/renamed/behavior-changed, or (b) fails typecheck/build/runtime after the dependency bump. Do not refactor, rename, or "clean up" adjacent working code while migrating. Fix incrementally — one error at a time, re-verifying after each fix rather than batching unrelated changes.

---

## Phase 0 — Audit current Phaser 3 usage

Baseline inventory (recorded 2026-08-26 — **re-verify with fresh greps before trusting this**, the code may have changed since):

| Area | Files |
|---|---|
| Scenes | `front/src/game/scenes/{Game,UIScene,LevelCinematic,MapIntroScene}.ts` — all `extends Scene`, use `init/preload/create/update`, `scene.start/launch/get/stop` |
| Custom GameObjects | `Player.ts`, `Npc.ts`, `Enemy.ts`, `MovingPlatform.ts` (`extends Phaser.Physics.Arcade.Sprite`); `Portal.ts` (`extends Phaser.GameObjects.Zone`); `InteractiveButton.ts` (`extends Phaser.GameObjects.Container`) |
| Physics | Arcade only, config at `front/src/game/main.ts:18-24` (`{ default: "arcade", arcade: { debug, tileBias } }`); heavy collider/overlap logic at `front/src/game/scenes/Game.ts:1800-1892`. No `physics.add.group()` usage. |
| Animations | Spritesheet + `anims.create`/`generateFrameNumbers` pattern in `Player.ts`/`Npc.ts`/`Enemy.ts`, plus `Game.ts:1278,1290` |
| Input | `front/src/game/systems/InputManager.ts` (keyboard); `setInteractive()` + `pointerdown` in `front/src/game/objects/interactives/` |
| Events | `ProgressionManager.ts`, `QuestManager.ts`, `ScoreManager.ts` extend `Phaser.Events.EventEmitter` directly (not `scene.events`) |
| Tilemaps | `front/src/game/systems/TiledMapLoader.ts`, `ObjectLayerProcessor.ts`, `front/src/game/utils/TiledUtils.ts`; Tiled JSON in `front/public/assets/maps/*/map.json` |
| Particles | `front/src/game/objects/EffectsManager.ts:341` (`add.particles` + `emitter.explode`) |
| Plugins | None registered |

Re-run these greps from `front/src` before starting, to catch anything new since the baseline:

```bash
grep -rn "tintFill\|setTintFill\|BitmapMask\|Geom\.Point\|Math\.PI2\|Math\.TAU\|Struct\.Set\|Struct\.Map\|setPipeline\|WebGLPipeline\|camera\.matrix\|GetCalcMatrix\|add\.shader\|GameObjects\.Shader\|ShaderQuadConfig\|TileSprite\|GameObjects\.Mesh\|GameObjects\.Plane\|GenerateTexture\|TextureManager\.generate\|roundPixels\|setMask\|GeometryMask\|preFX\|postFX\|Light2D\|setLighting" --include="*.ts" .
```

Baseline result (2026-08-26): **clean** except two items worth carrying into Phase 1:

- `front/src/game/main.ts:17` sets `pixelArt: true`. Phaser 4 flips the `roundPixels` default from `true` to `false` — combined with pixel art, this is the one real visual-regression risk in this repo. Plan a dedicated visual smoke test.
- `front/src/game/objects/EffectsManager.ts:33-35` checks `this.camera.postFX` with dead/commented-out `addColorMatrix()`/`addVignette()` calls. `postFX` is being unified into Phaser 4's Filter system — confirm whether `Camera#postFX` still exists; if not, either delete the dead code or port it to the new Filter API if it's about to be used.

## Phase 1 — Identify APIs that changed/vanished in Phaser 4

Fetch the migration checklist (URL above) fresh and cross-reference every item against Phase 0's audit and fresh greps. Phaser 4's breaking changes are concentrated in the renderer/filters/tint/camera-matrix/shader/GLSL/lighting layer — this repo doesn't touch custom pipelines, shaders, FX/masks, camera-matrix internals, `Geom.Point`, `Struct.Set/Map`, or `Mesh`/`Plane`/Spine, so expect most checklist items to be N/A. Don't assume that from this document alone — verify against what the fresh grep actually found.

High-relevance items for this repo specifically:
- `roundPixels` default `true`→`false` (visual risk given `pixelArt: true`)
- `EffectsManager.ts:33` `camera.postFX` reference — check against the Filter system section of the checklist
- Confirm Arcade Physics, Scenes, Animations, Input, EventEmitter, and Tilemaps remain API-compatible — the checklist doesn't call these out explicitly (they're simply absent from it), so cross-check the relevant per-topic skill or source rather than assuming silence means safety.
- **Bare `Phaser.X` runtime references without a namespace import (see Phase 3) — not in the official checklist at all, found only by running the game.** `tsc`/`next build` stay silent about this one; budget for a manual runtime pass, not just a compile pass.

## Phase 2 — Upgrade dependencies

```bash
cd front && npm install phaser@4.2.1
```

Pin the exact version, matching the repo's current convention (`"phaser": "3.90.0"` is pinned exact, not with a caret). Confirm `front/tsconfig.json` needs no changes — Phaser 4's `package.json` has an explicit dual ESM/CJS `exports` map with `types: ./types/phaser.d.ts`, so type resolution should work unchanged with `moduleResolution: Bundler`. Do not touch any other dependency as part of this task.

## Phase 3 — Fix imports/API changes

Named imports (`import { Scene } from "phaser"`) and namespace imports (`import * as Phaser from "phaser"`) both stay valid syntax in Phaser 4 — but **a real runtime break hides here, found in production during the actual 3.90.0→4.2.1 migration, not in the official checklist:**

**Phaser 3's CJS bundle set `window.Phaser` as a side effect of any import from `"phaser"`.** Code could reference the bare `Phaser` identifier (`Phaser.Scenes.Events.SHUTDOWN`, `Phaser.Math.Distance.Between`, `new Phaser.Geom.Line(...)`, etc.) at runtime without importing it locally, riding on that global. **Phaser 4's ESM-first build does not set this global.** Any file with a bare `Phaser.X` *value* reference (not just a type annotation) and no local `import * as Phaser from "phaser"` (or `import Phaser from "phaser"`) throws `Uncaught ReferenceError: Phaser is not defined` at runtime.

This is invisible to `tsc`/`next build`/`next typecheck`: Phaser's `.d.ts` declares an ambient global `Phaser` namespace for **types only**, so `Phaser.Scene` as a type annotation compiles fine with zero import — only a *value* usage (a function call, a property read, `new Phaser.X(...)`) actually executes the missing global at runtime. This makes it a runtime-only bug class — a manual browser pass (Phase 10) is the only way to catch it, not the build.

**Sweep for it** (from `front/src`) before trusting any file:
```bash
for f in $(grep -rl "Phaser\." --include="*.ts" --include="*.tsx" .); do
  grep -qE '^\s*import \* as Phaser from "phaser"|^\s*import Phaser from "phaser"' "$f" || echo "CHECK: $f"
done
```
Then manually check each flagged file: if `Phaser.X` only appears in type positions (annotations, generics, `as` casts), it's safe — leave it. If it appears in a runtime expression (event constants like `Phaser.Scenes.Events.SHUTDOWN`, static helpers like `Phaser.Math.Distance.Between`/`Phaser.Math.Clamp`, or `new Phaser.Geom.X(...)`), add `import * as Phaser from "phaser";` to that file's imports — don't remove the existing named import if one exists, just add the namespace import alongside it.

Known-fixed instances from the 2026-08 migration (already patched, listed so a re-audit doesn't re-flag them as new): `front/src/game/scenes/{LevelCinematic,MapIntroScene,Game,UIScene}.ts`, `front/src/game/audio/AudioManager.ts`.

Separately: pin exactly `4.2.1`, not `4.2.0` — the 4.2.1 changelog fixed an ESM-consumption bug ("inline namespace references... from three modules to prevent ESM build failures") that's directly relevant given this app's Turbopack/ESM pipeline.

## Phase 4 — Update Scenes/GameObjects

Reference (fetch fresh): `skills/scenes/SKILL.md`, `skills/sprites-and-images/SKILL.md`, `skills/groups-and-containers/SKILL.md`.

No breaking changes are documented for Scene lifecycle methods or the `Sprite`/`Zone`/`Container` base classes. Expect `front/src/game/scenes/*.ts` and `front/src/game/objects/{Player,Npc,Enemy,MovingPlatform,Portal,InteractiveButton}.ts` to need zero changes. The only Container-related v4 changes found are internal bugfixes (blend-mode leakage between children, `Layer` now a true GameObject) — no action needed unless behavior looks different after the Phase 10 runtime check.

## Phase 5 — Check physics

Reference (fetch fresh): `skills/physics-arcade/SKILL.md`.

Config shape `{ default: "arcade", arcade: {...} }` and the `physics.add.sprite/collider/overlap`, `Body`, `setVelocity/setGravity/setBounce` API are unchanged per the checklist (physics isn't in the breaking-changes list) — confirm against the topic skill rather than assuming. Since this repo has no `physics.add.group()` usage, the v4.0.0 group-collision bugfixes are moot. Manually regression-test the collider-heavy logic at `Game.ts:1800-1892` during Phase 10.

## Phase 6 — Check animations

Reference (fetch fresh): `skills/animations/SKILL.md`.

`load.spritesheet`, `anims.create`, `anims.generateFrameNumbers`, `anims.play` are unchanged. No code changes expected in `Player.ts`/`Npc.ts`/`Enemy.ts` or `Game.ts:1278,1290`.

## Phase 7 — Check input/events

Reference (fetch fresh): `skills/input-keyboard-mouse-touch/SKILL.md`, `skills/events-system/SKILL.md`.

Keyboard (`input.keyboard.on`, `addKeys`, `addCapture`) and pointer (`setInteractive()` + `pointerdown`) APIs are unchanged. Custom `Phaser.Events.EventEmitter` subclassing (`ProgressionManager.ts`, `QuestManager.ts`, `ScoreManager.ts`) is unchanged. No gamepad usage in this repo, so the v4 Gamepad `Button.isPressed` fix is not applicable.

## Phase 8 — Check Tilemaps/Tiled integration

Reference (fetch fresh): `skills/tilemaps/SKILL.md`.

`load.tilemapTiledJSON`, `map.createLayer`, `setCollisionByExclusion`, `map.objects`, and custom Tiled tile properties are unchanged — `TiledMapLoader.ts`, `ObjectLayerProcessor.ts`, `TiledUtils.ts` should need no changes. Confirm no `TileSprite` texture-cropping usage was added since the baseline (that path did change in v4 — cropping was removed).

## Phase 9 — Check plugins

No third-party or custom Phaser plugins are registered in this repo (`scene.plugins`/`game.plugins`). This phase is a no-op — just confirm nothing new was added since Phase 0.

## Phase 10 — Run the game/build

```bash
npm run typecheck   # or: cd front && npm run typecheck
npm run build        # or: cd front && npm run build
make lint             # Biome
```

**A manual runtime check is required, not optional** — Phaser init errors are caught in `front/src/components/PhaserGame.tsx` and only surfaced via PostHog (`game_load_failed`) and `console.error("[PhaserGame] ...")`, never by `next build`/`tsc --noEmit`. Use the `run` skill or `claude-in-chrome` to load the game route, then read console output filtered for `[PhaserGame]`. Explicitly verify:
- Sprites/animations render and play correctly
- Physics collisions behave as before (`Game.ts:1800-1892` scenarios)
- Tilemap layers render and collide correctly
- Pixel-art scaling looks correct (the `roundPixels` default change is the one flagged visual-regression risk)
- Click through every scene transition (map intro → level cinematic → game), not just the first scene that loads — the bare-`Phaser.X` global-removal bug (Phase 3) only throws when a specific code path executes (e.g. a scene's `SHUTDOWN` handler, a specific menu action), so a screen that merely *renders* can still hide a runtime `ReferenceError` one interaction away.

## Phase 11 — Fix errors incrementally

Fix one error at a time. After each fix, re-run typecheck/build before moving to the next — don't batch unrelated fixes into one edit. For every error encountered, invoke the **`phaser-4-debug`** skill first to root-cause it (classify whether it's migration-caused, then find the correct Phaser 4 API) before writing a fix. Never rewrite working code unnecessarily — the guardrail above applies throughout this phase most of all.
