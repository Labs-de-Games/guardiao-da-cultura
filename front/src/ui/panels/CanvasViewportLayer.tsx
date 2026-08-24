"use client";

import { Box } from "@mui/material";
import type { ReactNode } from "react";

import type { CanvasViewportData } from "@/shared/events/game-events";

export interface CanvasViewportLayerProps {
  viewport: CanvasViewportData;
  children: ReactNode;
}

/**
 * Absolutely-positioned wrapper that pins its children to the Phaser
 * canvas's current on-screen rect (see useCanvasViewport). Shared by
 * DialoguePanel and MapPinTooltip so both overlays letterbox identically.
 */
export function CanvasViewportLayer({
  viewport,
  children,
}: CanvasViewportLayerProps) {
  return (
    <Box
      sx={{
        position: "absolute",
        left: viewport.left,
        top: viewport.top,
        width: viewport.width,
        height: viewport.height,
        pointerEvents: "none",
      }}
    >
      {children}
    </Box>
  );
}
