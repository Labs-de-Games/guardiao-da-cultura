"use client";

import { useEffect, useState } from "react";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { EventBus } from "@/shared/events/event-bus";
import type { CanvasViewportData } from "@/shared/events/game-events";

const DEFAULT_VIEWPORT: CanvasViewportData = {
  left: 0,
  top: 0,
  width: LayoutConfig.GAME.WIDTH,
  height: LayoutConfig.GAME.HEIGHT,
  scaleX: 1,
  scaleY: 1,
};

/**
 * Tracks the Phaser canvas's actual displayed CSS rect and its scale
 * relative to the fixed base game resolution. Under Scale.FIT the canvas is
 * letterboxed, so canvas-internal pixel coordinates no longer match DOM
 * pixel coordinates 1:1 — consumers positioning React elements over
 * world/canvas coordinates must go through this conversion.
 */
export function useCanvasViewport(): CanvasViewportData {
  const [viewport, setViewport] =
    useState<CanvasViewportData>(DEFAULT_VIEWPORT);

  useEffect(() => EventBus.on("canvas:viewport-changed", setViewport), []);

  return viewport;
}
