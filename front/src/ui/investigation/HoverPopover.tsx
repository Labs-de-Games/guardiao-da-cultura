"use client";

import { Box } from "@mui/material";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

const { colors, radius } = GAME_UI_TOKENS;

const MARGIN = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * A hover panel that escapes its container.
 *
 * Rendered into `document.body`, so neither the clue rail's scroll overflow nor
 * the table's stacking context can clip it. It measures itself once, flips to
 * the other side of the anchor when it would run off-screen, and stays
 * click-through — the player is usually on their way to dragging something.
 */
export function HoverPopover({
  anchor,
  placement,
  width,
  children,
}: {
  anchor: DOMRect;
  placement: "right" | "above";
  width: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  useLayoutEffect(() => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;

    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    let left: number;
    let top: number;

    if (placement === "right") {
      left = anchor.right + MARGIN;
      if (left + box.width > viewWidth - MARGIN) {
        left = anchor.left - box.width - MARGIN;
      }
      top = anchor.top + anchor.height / 2 - box.height / 2;
    } else {
      left = anchor.left + anchor.width / 2 - box.width / 2;
      top = anchor.top - box.height - MARGIN;
      if (top < MARGIN) top = anchor.bottom + MARGIN;
    }

    setPosition({
      left: clamp(left, MARGIN, viewWidth - box.width - MARGIN),
      top: clamp(top, MARGIN, viewHeight - box.height - MARGIN),
    });
  }, [anchor, placement]);

  return createPortal(
    <Box
      ref={ref}
      role="tooltip"
      sx={{
        position: "fixed",
        left: position?.left ?? anchor.right + MARGIN,
        top: position?.top ?? anchor.top,
        // Hidden with opacity rather than visibility so it stays in the
        // accessibility tree during the one frame before it is measured.
        opacity: position ? 1 : 0,
        zIndex: 2000,
        width,
        maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
        pointerEvents: "none",
        bgcolor: colors.bgSecondary,
        border: `2px solid ${colors.accentGold}`,
        borderRadius: `${radius.small}px`,
        boxShadow: "0 10px 28px rgba(0,0,0,0.7)",
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      {children}
    </Box>,
    document.body,
  );
}
