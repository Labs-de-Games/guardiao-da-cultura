"use client";

import { useEffect, useMemo, useState } from "react";
import { PanelStage } from "./PanelStage";
import { EASE_SHRINK, EASE_ROLL } from "./constants";
import type { PanelConfig } from "./types";

export type ComicSequenceProps = {
  panels: PanelConfig[];
  fullWidth: number;
  height: number;
  blockSize: number;
  gap: number;
  rollOutMs: number;
  rollStaggerMs: number;
  skip?: boolean;
  rollOut?: boolean;
  onComplete?: () => void;
  onRolledOut?: () => void;
  /** Fired when each panel begins its pixel-reveal (index 0..n-1). */
  onPanelStart?: (index: number) => void;
  /** Fired when each panel begins its shrink phase (index 0..n-1). */
  onPanelShrink?: (index: number) => void;
};

/**
 * Plays a series of comic panels left-to-right.
 *
 * Each panel pixel-reveals, holds, then shrinks to its sliceWidth.
 * The next panel mounts (to the right of the previous, with `gap` between)
 * the moment the previous panel begins shrinking — so the reveal of the
 * new panel and the shrink of the old one overlap.
 *
 * When `skip` flips to true, every panel mounts immediately in its final
 * "done" state and the row centers on the final strip without transitions.
 *
 * When `rollOut` flips to true (after the final strip is centered), each
 * panel rolls upward like movie credits while pixel-dissolving away.
 * Panels stagger: the next one begins partway through the previous one's
 * roll, instead of waiting for it to finish.
 */
export function ComicSequence({
  panels,
  fullWidth,
  height,
  blockSize,
  gap,
  rollOutMs,
  rollStaggerMs,
  skip = false,
  rollOut = false,
  onComplete,
  onRolledOut,
  onPanelStart,
  onPanelShrink,
}: ComicSequenceProps) {
  const [mountedThrough, setMountedThrough] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const [preloaded, setPreloaded] = useState(false);
  const [rolling, setRolling] = useState<boolean[]>(() => panels.map(() => false));
  const [dissolvedCount, setDissolvedCount] = useState(0);

  // Fire onPanelStart whenever a new panel becomes visible (mounts).
  useEffect(() => {
    if (!preloaded || skip) return;
    onPanelStart?.(mountedThrough);
  }, [preloaded, mountedThrough, skip, onPanelStart]);

  // Preload + decode every panel image up-front
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      panels.map(
        (p) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = p.src;
            const done = () => resolve();
            if (img.decode) {
              img.decode().then(done).catch(done);
            } else {
              img.onload = done;
              img.onerror = done;
            }
          }),
      ),
    ).then(() => {
      if (!cancelled) setPreloaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [panels]);

  // When a skip is requested, mount every panel and mark the run complete.
  useEffect(() => {
    if (!skip) return;
    setMountedThrough(panels.length - 1);
    if (!allDone) {
      setAllDone(true);
      onComplete?.();
    }
  }, [skip, panels.length, allDone, onComplete]);

  // Stagger the credits-style roll-up + dissolve for each panel.
  useEffect(() => {
    if (!rollOut) return;
    const timers: number[] = [];
    panels.forEach((_, i) => {
      const t = window.setTimeout(() => {
        setRolling((prev) => {
          if (prev[i]) return prev;
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, i * rollStaggerMs);
      timers.push(t);
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [rollOut, panels, rollStaggerMs]);

  // Fire onRolledOut once every panel has finished dissolving.
  useEffect(() => {
    if (rollOut && dissolvedCount >= panels.length) {
      onRolledOut?.();
    }
  }, [rollOut, dissolvedCount, panels.length, onRolledOut]);

  const handleShrinkStart = (i: number) => {
    onPanelShrink?.(i);
    if (i + 1 < panels.length) {
      setMountedThrough((m) => Math.max(m, i + 1));
    }
  };

  const handleDone = (i: number) => {
    if (i === panels.length - 1) {
      setAllDone(true);
      onComplete?.();
    }
  };

  const handleDissolved = () => {
    setDissolvedCount((c) => c + 1);
  };

  // stageWidth: total horizontal real estate the panel row needs at its widest
  const stageWidth = useMemo(() => {
    let max = fullWidth;
    let left = 0;
    for (let i = 0; i < panels.length; i++) {
      const w = left + fullWidth;
      if (w > max) max = w;
      left += panels[i].sliceWidth + gap;
    }
    return max;
  }, [panels, fullWidth, gap]);

  // finalStripWidth: width of the row once every panel has shrunk
  const finalStripWidth = useMemo(() => {
    let w = 0;
    panels.forEach((p, i) => {
      w += p.sliceWidth;
      if (i < panels.length - 1) w += gap;
    });
    return w;
  }, [panels, gap]);

  // offsetX: how far to translate the panel row for centering
  let offsetX: number;
  if (allDone) {
    offsetX = (stageWidth - finalStripWidth) / 2;
  } else if (mountedThrough === 0) {
    offsetX = (stageWidth - fullWidth) / 2;
  } else {
    offsetX = 0;
  }

  const offsetMs = skip
    ? 0
    : allDone
      ? panels[panels.length - 1].shrinkMs
      : panels[0].shrinkMs;

  return (
    <div
      style={{
        position: "relative",
        width: stageWidth,
        height,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height,
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          transform: `translateX(${offsetX}px)`,
          transition: skip ? "none" : `transform ${offsetMs}ms ${EASE_SHRINK}`,
          willChange: "transform",
        }}
      >
        {preloaded && panels.slice(0, mountedThrough + 1).map((p, i) => (
          <div
            key={i}
            style={{
              marginRight: i < panels.length - 1 ? gap : 0,
              flex: "none",
              transform: rolling[i] ? `translateY(-${height + 80}px)` : "translateY(0)",
              transition: rolling[i]
                ? `transform ${rollOutMs}ms ${EASE_ROLL}`
                : "none",
              willChange: "transform",
            }}
          >
            <PanelStage
              src={p.src}
              fullWidth={fullWidth}
              height={height}
              sliceWidth={p.sliceWidth}
              sliceStart={p.sliceStart}
              revealMs={p.revealMs}
              holdMs={p.holdMs}
              shrinkMs={p.shrinkMs}
              blockSize={blockSize}
              skipToEnd={skip}
              dissolve={rolling[i]}
              dissolveMs={rollOutMs}
              onShrinkStart={() => handleShrinkStart(i)}
              onDone={() => handleDone(i)}
              onDissolved={handleDissolved}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
