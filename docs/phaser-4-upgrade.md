# Phaser 4 Upgrade: Benefits

Rationale for upgrading `front/` from Phaser 3.90.0 to Phaser 4.2.1. See the `phaser-4-migration` and `phaser-4-debug` agent skills for the migration procedure itself.

## Why upgrade

- **Performance/renderer**: Phaser 4 rewrote the render pipeline (WebGL2-first, better batching). Direct win since the game is a WebGL-rendered pixel-art game.
- **Bundle size**: Phaser 4 is more modular and smaller than Phaser 3 — matters for the Next.js client bundle (`PhaserGame.tsx` loads Phaser client-only via `next/dynamic`).
- **ESM/Turbopack fit**: Phaser 4 ships a proper dual ESM/CJS `exports` map. The project uses Turbopack, and Phaser 3's CJS-era packaging caused friction here. Phaser 4.2.1 specifically fixes an ESM inline-namespace build bug relevant to this pipeline — this is why the migration pins exactly `4.2.1`, not `4.2.0`.
- **TypeScript**: Phaser 4's types are more accurate and complete than Phaser 3's known gaps.
- **Filter/PostFX system**: Phaser 4 unifies the old `postFX` API into a proper Filter system. This unlocks the dead code in `front/src/game/objects/EffectsManager.ts:33-35` — commented-out `addColorMatrix()`/`addVignette()` calls that currently do nothing.
- **Container/Layer fixes**: Phaser 4 fixes blend-mode leakage between Container children and makes `Layer` a true GameObject. Relevant since `InteractiveButton.ts` extends `Phaser.GameObjects.Container`.
- **Longevity**: Phaser 3 is in maintenance-only mode; Phaser 4 gets active feature development and bugfixes going forward.

## Risk to watch

- `roundPixels` default flips from `true` to `false` in Phaser 4. Combined with `pixelArt: true` in `front/src/game/main.ts:17`, this is the one flagged visual-regression risk — needs a manual smoke test after upgrade.
- Everything else (physics, animations, input, tilemaps, plugins) is API-unchanged per the audit in `.agents/skills/phaser-4-migration/SKILL.md`.
