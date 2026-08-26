---
name: phaser-4-debug
description: 'Diagnose an error or regression in gameplate''s front/ Phaser game code that might stem from the Phaser 3.90.0 to 4.2.1 migration. First classifies whether the Phaser upgrade is actually the cause, then consults Phaser 4''s real API/source before proposing any fix — never patches based on Phaser 3 assumptions or guesswork. Use during or any time after the phaser-4-migration workflow, whenever a bug appears that might be migration-related, or when unsure if an error is caused by the Phaser upgrade.'
license: MIT
allowed-tools: Bash, Read, Edit, Grep, Glob, WebFetch
---

# Phaser 4 Migration Debug

Companion to `phaser-4-migration`. Use it standalone too — a regression can surface weeks after the migration workflow is "done"; this skill lets you check whether it's a leftover migration issue without re-reading the whole migration workflow.

## Step 1 — Classify: is this actually migration-related?

**Signals it likely is:**
- **`Uncaught ReferenceError: Phaser is not defined`** — this is not in Phaser's own official checklist, but was the actual root cause of a real post-migration break: Phaser 3's CJS bundle set `window.Phaser` as an import side effect, Phaser 4's ESM build doesn't, so any bare `Phaser.X` runtime reference (not a type annotation) in a file lacking `import * as Phaser from "phaser"` throws. See `phaser-4-migration` Phase 3 for the sweep command and the already-fixed file list. `tsc`/`next build` never catch this — it's a pure runtime error, one interaction away from a scene that otherwise renders fine.
- The error or stack trace mentions: render nodes / pipelines, Filters / FX / masks, tint / `TintMode`, `Camera#matrix`, `Shader` / GLSL, `DynamicTexture` / `RenderTexture`, `TileSprite`, `Geom.Point`, `Math.TAU` / `Math.PI2`, `Struct.Set` / `Struct.Map`, lighting (`Light2D`, `setLighting`), `roundPixels`, or a removed class (`Mesh`, `Plane`, `Camera3D`, `Layer3D`).
- A visual regression (pixel-snapping, blend modes, masks, tint, lighting) appearing right after the `phaser` dependency bump.
- `git log`/`git blame` on the affected file shows the break was introduced in the same commit/PR as the `phaser` version bump.
- The error reproduces only after `npm install phaser@4.2.1`, not on the commit before it.

**Signals it likely is not:**
- The error is in unrelated code (React/Next.js, MUI, back-end/TypeORM, auth, etc.).
- It reproduces identically on the pre-migration commit.
- It concerns a subsystem the `phaser-4-migration` audit already marked unaffected (Scenes, Arcade Physics signatures, Animations, Input, EventEmitter, Tilemaps) — still re-verify against the live checklist rather than trusting that audit blindly, since it may be stale.

If genuinely ambiguous, treat it as migration-related and run Step 2 anyway — confirming an API is unchanged is cheap; missing a real migration cause is not.

## Step 2 — If migration-related: consult the real Phaser 4 API/source before proposing anything

If it's the `Phaser is not defined` class above, skip straight to the fix: confirm the throwing file has no `import * as Phaser from "phaser"` (or `import Phaser from "phaser"`), and that the bare `Phaser.X` reference is a runtime value expression, not just a type — then add the namespace import. No need to fetch the checklist for this one, it isn't in it.

Otherwise:
1. Fetch the official checklist fresh (same source `phaser-4-migration` uses):
   ```bash
   gh api repos/phaserjs/phaser/contents/skills/v3-to-v4-migration/SKILL.md -q '.content' | base64 -d
   ```
   and find the relevant section.
2. Fetch the relevant per-topic Phaser skill for the current, correct API shape: `gh api repos/phaserjs/phaser/contents/skills/<topic>/SKILL.md -q '.content' | base64 -d` (topics: `physics-arcade`, `animations`, `scenes`, `sprites-and-images`, `groups-and-containers`, `events-system`, `input-keyboard-mouse-touch`, `tilemaps`, `particles`, `game-setup-and-config`, `filters-and-postfx`).
3. If still unclear, read the actual Phaser 4 source: `front/node_modules/phaser/types/phaser.d.ts` for the type signature, or browse `github.com/phaserjs/phaser` (the `src/` tree) for the implementation.

**Never propose a workaround** (try/catch swallow, disabling a feature, reverting to old behavior via a shim) before you've confirmed what the correct Phaser 4 replacement API actually is. A workaround chosen before checking the source is a guess, not a fix.

## Step 3 — Fix and verify

Apply the minimal fix mapping the old API to the documented new one. Re-run `npm run typecheck` / `npm run build` plus the specific runtime scenario that reproduced the bug. If the fix reveals that `phaser-4-migration`'s audit or checklist coverage was incomplete, note it explicitly rather than silently diverging from what that skill documented.

## Step 4 — If not migration-related

Say so explicitly and debug it as an ordinary bug, unrelated to the Phaser upgrade. Don't force a migration narrative onto an unrelated issue just because a migration is in progress.
