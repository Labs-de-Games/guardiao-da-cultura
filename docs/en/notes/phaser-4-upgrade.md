# Phaser 4 Upgrade: Benefits

> **Historical snapshot.** Written 2026-08-26, before the upgrade landed. The
> migration is done: `front/package.json` pins `phaser` 4.2.1, the custom
> `ConeLightPipeline.ts` has been removed, and cone lights use the native Phaser 4
> `Light` API (see the 1.13.0 entry in [CHANGELOG.md](../../CHANGELOG.md)). Read
> the rest as the rationale at the time, not as pending work.

Rationale for upgrading `front/` from Phaser 3.90.0 to Phaser 4.2.1. See the `phaser-4-migration` and `phaser-4-debug` agent skills for the migration procedure itself.

## Why upgrade

- **Renderer rewrite**: Phaser 4 replaces the v3 pipeline system with a new "render node" architecture. This is real (confirmed via Phaser's own migration guide/source), but **not a guaranteed performance win** for every workload — the per-pixel light-loop cost in the `LightsManager`/`setLighting(true)` shading path (used for cone lights) is algorithmically unchanged between v3 and v4, still `O(activeLights × litPixels)`. Don't cite this upgrade as a fix for light-count-driven lag; it isn't one.
- **ESM/Turbopack fit**: Phaser 4 ships a proper dual ESM/CJS `exports` map. The project uses Turbopack, and Phaser 3's CJS-era packaging caused friction here. Phaser 4.2.1 specifically fixes an ESM inline-namespace build bug relevant to this pipeline — this is why the migration pins exactly `4.2.1`, not `4.2.0`.
- **Native cone lights**: `Light` gained `coneEnabled`/`coneRotation`/`coneInnerAngle`/`coneOuterAngle` in 4.2.0 (confirmed in Phaser's `Light.js` source), so a future light-system pass can drop the project's custom `ConeLightPipeline.ts` GLSL in favor of the built-in fields — a maintenance win, not a performance one (see renderer point above).
- **Container/Layer fixes**: Phaser 4 fixes blend-mode leakage between Container children and makes `Layer` a true GameObject. Relevant since `InteractiveButton.ts` extends `Phaser.GameObjects.Container`.
- **Longevity**: Phaser 3 is in maintenance-only mode; Phaser 4 gets active feature development and bugfixes going forward.

Dropped from the original draft of this doc (unverified against Phaser's actual source/package.json, don't repeat these claims): "more modular and smaller bundle" (Phaser 4 ships as a single `phaser` npm package, same as v3 — no modularization change) and "WebGL2-first, better batching" as a blanket performance claim (only the renderer's internal architecture changed; no confirmed general throughput win).

## What actually broke during the migration (2026-08)

- **`front/src/game/objects/EffectsManager.ts`**: `Phaser.FX` namespace and `Camera#postFX` are gone in v4 (unified into the new Filter system). The code here was already dead (constructor block fully commented out, `colorMatrix`/`vignette` never set) — stripped it rather than wiring it to the new Filter API, since that would be new scope, not a migration fix.
- **`front/src/game/systems/TiledMapLoader.ts`**: `map.createLayer()` now returns `TilemapLayer | TilemapGPULayer` (v4 added an opt-in GPU tilemap layer). Narrowed with a type cast since this project never requests a GPU layer.
- **`Uncaught ReferenceError: Phaser is not defined` — the real one, found only by running the game, not by `tsc`/`next build`.** Phaser 3's CJS bundle set `window.Phaser` as an import side effect; any file could reference the bare `Phaser` identifier at runtime without importing it locally. Phaser 4's ESM build doesn't set that global. `Phaser.Scene` etc. as *type* annotations still compile fine (Phaser's `.d.ts` declares an ambient global namespace for types), but a runtime value expression (`Phaser.Scenes.Events.SHUTDOWN`, `Phaser.Math.Distance.Between`, `new Phaser.Geom.Line(...)`) throws. Fixed in `LevelCinematic.ts`, `MapIntroScene.ts`, `Game.ts`, `UIScene.ts`, `AudioManager.ts` by adding `import * as Phaser from "phaser"`. Full sweep command and detail in `.agents/skills/phaser-4-migration/SKILL.md` Phase 3 and `.agents/skills/phaser-4-debug/SKILL.md` Step 1 — this class of bug isn't in Phaser's own official migration checklist at all.

## Risk to watch

- `roundPixels` default flips from `true` to `false` in Phaser 4. Combined with `pixelArt: true` in `front/src/game/main.ts:17`, this is a flagged visual-regression risk — needs a manual smoke test.
- Physics, animations, input, and tilemap *loading* are API-unchanged per Phaser's checklist and this repo's audit in `.agents/skills/phaser-4-migration/SKILL.md` — but that checklist is not exhaustive (see the `Phaser is not defined` bug above, which it doesn't mention). Treat "not in the checklist" as "not yet found broken," not as a guarantee.
