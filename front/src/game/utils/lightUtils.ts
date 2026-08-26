import * as Phaser from "phaser";

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

// Native lighting is WebGL-only (Lighting component + LightsManager are
// no-ops elsewhere), so callers use this to skip creating lights on
// Canvas and degrade gracefully.
export function canUseLighting(scene: Phaser.Scene): boolean {
  return scene.renderer.type === Phaser.WEBGL;
}

// All cone lights in this project historically pointed the same way
// (the old ConeLightPipeline's default directionX=0/directionY=-1,
// rendered as pointing down). Native coneRotation runs the opposite
// sense through the camera-space transform, so +PI/2 — not -PI/2 —
// is what actually points down; verified visually against LightBars.
export const DEFAULT_CONE_ROTATION = Math.PI / 2;
