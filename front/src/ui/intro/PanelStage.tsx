"use client";

import { useEffect, useRef, useState } from "react";
import { PixelRevealCanvas } from "./PixelRevealCanvas";
import { PixelDissolveCanvas } from "./PixelDissolveCanvas";
import { EASE_SHRINK } from "./constants";

export type PanelStageProps = {
  src: string;
  fullWidth: number;
  height: number;
  sliceWidth: number;
  sliceStart: number; // x px (in source image) where the final slice begins
  revealMs: number;
  holdMs: number;
  shrinkMs: number;
  blockSize: number;
  autoStart?: boolean;
  skipToEnd?: boolean;
  dissolve?: boolean;
  dissolveMs: number;
  onRevealed?: () => void;
  onShrinkStart?: () => void;
  onDone?: () => void;
  onDissolved?: () => void;
};

type Phase = "revealing" | "holding" | "shrinking" | "done";

/**
 * One comic panel: pixel-reveal → hold → shrink to a vertical slice.
 *
 * Layout: an outer container whose width animates from fullWidth → sliceWidth.
 * Inside, the canvas keeps its native fullWidth and is translated left so
 * the visible window ends up framing [sliceStart, sliceStart + sliceWidth].
 *
 * When `skipToEnd` is true the panel jumps straight to the final slice
 * (no transitions, no pixel-reveal animation) and fires the lifecycle
 * callbacks once so the parent sequencer stays consistent.
 */
export function PanelStage({
  src,
  fullWidth,
  height,
  sliceWidth,
  sliceStart,
  revealMs,
  holdMs,
  shrinkMs,
  blockSize,
  autoStart = true,
  skipToEnd = false,
  dissolve = false,
  dissolveMs,
  onRevealed,
  onShrinkStart,
  onDone,
  onDissolved,
}: PanelStageProps) {
  const [phase, setPhase] = useState<Phase>(skipToEnd ? "done" : "revealing");
  const timers = useRef<number[]>([]);
  const firedSkip = useRef(false);

  // clamp sliceStart so the slice stays inside the image
  const clampedStart = Math.max(0, Math.min(sliceStart, fullWidth - sliceWidth));

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, []);

  // Skip handling: jump to done and fire callbacks exactly once.
  useEffect(() => {
    if (!skipToEnd || firedSkip.current) return;
    firedSkip.current = true;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setPhase("done");
    onRevealed?.();
    onShrinkStart?.();
    onDone?.();
  }, [skipToEnd, onRevealed, onShrinkStart, onDone]);

  const handleRevealed = () => {
    if (skipToEnd) return;
    onRevealed?.();
    setPhase("holding");
    const t1 = window.setTimeout(() => {
      setPhase("shrinking");
      onShrinkStart?.();
      const t2 = window.setTimeout(() => {
        setPhase("done");
        onDone?.();
      }, shrinkMs);
      timers.current.push(t2);
    }, holdMs);
    timers.current.push(t1);
  };

  const shrunk = phase === "shrinking" || phase === "done";
  const containerWidth = shrunk ? sliceWidth : fullWidth;
  const translateX = shrunk ? -clampedStart : 0;
  const transition = skipToEnd ? "none" : `width ${shrinkMs}ms ${EASE_SHRINK}`;
  const innerTransition = skipToEnd ? "none" : `transform ${shrinkMs}ms ${EASE_SHRINK}`;

  return (
    <div
      style={{
        width: containerWidth,
        height,
        overflow: "hidden",
        transition,
      }}
    >
      <div
        style={{
          width: fullWidth,
          height,
          transform: `translateX(${translateX}px)`,
          transition: innerTransition,
        }}
      >
        {autoStart && !skipToEnd && !dissolve && (
          <PixelRevealCanvas
            src={src}
            width={fullWidth}
            height={height}
            revealMs={revealMs}
            blockSize={blockSize}
            onDone={handleRevealed}
          />
        )}

        {skipToEnd && !dissolve && (
          <img
            src={src}
            width={fullWidth}
            height={height}
            alt=""
            style={{
              display: "block",
              width: fullWidth,
              height,
              imageRendering: "pixelated",
            }}
          />
        )}
        {dissolve && (
          <PixelDissolveCanvas
            src={src}
            width={fullWidth}
            height={height}
            dissolveMs={dissolveMs}
            blockSize={blockSize}
            onDone={onDissolved}
          />
        )}
      </div>
    </div>
  );
}
