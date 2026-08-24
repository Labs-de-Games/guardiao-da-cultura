import * as Phaser from "phaser";

import type { ConeLightPipeline } from "../pipelines/ConeLightPipeline";

// Fallback color used when a "color" property is missing or unparsable.
// Kept as a literal (matches the historical LightBarSystem default) so this
// helper has no dependency on any one system's own DEFAULT_* config.
const FALLBACK_COLOR = 0xffcc88;

// Accepts a numeric color, or a hex string such as "#ffcc88", "0xffcc88",
// or Tiled's native "#AARRGGBB" color property format.
export function parseColor(raw: unknown): number {
  if (typeof raw === "number") return raw;

  const hex = String(raw).trim().replace(/^#/, "").replace(/^0x/i, "");
  const rgbHex = hex.length === 8 ? hex.slice(2) : hex;
  const parsed = Number.parseInt(rgbHex, 16);

  return Number.isNaN(parsed) ? FALLBACK_COLOR : parsed;
}

// Looks up the shared ConeLightPipeline registered on the scene's WebGL
// renderer. Returns undefined on non-WebGL (Canvas) renderers, or if the
// pipeline hasn't been registered, so callers can degrade gracefully.
export function getConeLightPipeline(
  scene: Phaser.Scene,
): ConeLightPipeline | undefined {
  if (scene.renderer.type !== Phaser.WEBGL) return undefined;

  const renderer = scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
  return renderer.pipelines.get("Conelight") as ConeLightPipeline | undefined;
}
