"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EventBus } from "../../shared/events/event-bus";
import { CaptionBox } from "./CaptionBox";
import { ComicSequence } from "./ComicSequence";
import {
  BLOCK_SIZE,
  CAPTION_BG,
  CAPTION_BODY_COLOR,
  CAPTION_BODY_FONT,
  CAPTION_BORDER,
  CAPTION_FADE_MS,
  CAPTION_HEIGHT,
  CAPTION_SHOW_DELAY_FRAC,
  MASK_DURATION_MS,
  MASK_END_SCALE,
  MASK_START_SCALE,
  PANEL_FULL_WIDTH,
  PANEL_GAP,
  PANEL_HEIGHT,
  ROLL_DELAY_MS,
  ROLL_OUT_MS,
  ROLL_STAGGER_MS,
} from "./constants";
import { MaskReveal } from "./MaskReveal";
import type { IntroConfig, PanelConfig } from "./types";

export type IntroSequenceProps = {
  config: IntroConfig;
  levelId: string;
  onComplete: () => void;
};

/**
 * IntroSequence - Main orchestrator for the comic cinematic
 *
 * Plays the full intro sequence:
 * 1. Comic panels with pixel-reveal, shrink-to-slice, and captions
 * 2. Roll-out animation with pixel-dissolve
 * 3. Mask reveal transition
 * 4. Calls onComplete to transition to game
 */
export function IntroSequence({
  config,
  levelId,
  onComplete,
}: IntroSequenceProps) {
  const [skip, setSkip] = useState(false);
  const [rollOut, setRollOut] = useState(false);
  const [maskReveal, setMaskReveal] = useState(false);
  const [captionPanel, setCaptionPanel] = useState<number>(-1);
  const [captionVisible, setCaptionVisible] = useState(false);
  const fitElRef = useRef<HTMLDivElement | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  // Build panel configs with full asset paths
  const panels: PanelConfig[] = useMemo(() => {
    return config.panels.map((p) => ({
      ...p,
      src: `/assets/data/levels/${levelId}/intro/${p.src}`,
    }));
  }, [config.panels, levelId]);

  // Asset paths
  const maskSrc = `/assets/data/levels/${levelId}/intro/${config.revealIconMask}`;
  const sceneSrc = `/assets/data/levels/${levelId}/intro/${config.loadingImage}`;
  const captionImage = config.captionImage
    ? `/assets/data/levels/${levelId}/intro/${config.captionImage}`
    : undefined;

  // Total stage width calculation
  const stageWidth = useMemo(() => {
    let max = PANEL_FULL_WIDTH;
    let left = 0;
    for (const p of panels) {
      const w = left + PANEL_FULL_WIDTH;
      if (w > max) max = w;
      left += p.sliceWidth + PANEL_GAP;
    }
    return max;
  }, [panels]);

  // Scale state - compute initial value after stageWidth is available
  const [scale, setScale] = useState(1);

  // Update scale when stageWidth changes or on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vw = window.innerWidth - 48;
    const vh = window.innerHeight - 48;
    const newScale = Math.min(
      vw / stageWidth,
      vh / (PANEL_HEIGHT + CAPTION_HEIGHT),
    );
    if (newScale > 0 && Number.isFinite(newScale)) {
      setScale(newScale);
    }
  }, [stageWidth]);

  // Caption panel left position
  const captionPanelLeft = useMemo(() => {
    const i = Math.max(captionPanel, 0);
    if (i === 0) return (stageWidth - PANEL_FULL_WIDTH) / 2;
    let x = 0;
    for (let k = 0; k < i; k++) x += panels[k].sliceWidth + PANEL_GAP;
    return x;
  }, [captionPanel, stageWidth, panels]);

  // Scale computation - use window dimensions directly to avoid circular dependency
  const computeScale = useCallback(() => {
    // Use window dimensions directly, accounting for padding (24px on each side = 48px total)
    const w = window.innerWidth - 48;
    const h = window.innerHeight - 48;
    const s = Math.min(w / stageWidth, h / (PANEL_HEIGHT + CAPTION_HEIGHT));
    if (s > 0 && Number.isFinite(s)) setScale(s);
  }, [stageWidth]);

  const fitRefCallback = useCallback(
    (el: HTMLDivElement | null) => {
      fitElRef.current = el;
      roRef.current?.disconnect();
      roRef.current = null;
      if (!el) return;
      // Compute scale immediately
      computeScale();
      // Also compute after layout settles
      requestAnimationFrame(() => {
        requestAnimationFrame(computeScale);
      });
      // Use ResizeObserver on window resize, not on element resize
      const ro = new ResizeObserver(computeScale);
      ro.observe(document.body);
      roRef.current = ro;
    },
    [computeScale],
  );

  useEffect(() => {
    const onResize = () => {
      computeScale();
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      roRef.current?.disconnect();
      roRef.current = null;
    };
  }, [computeScale]);

  // Preload mask reveal assets
  useEffect(() => {
    [maskSrc, sceneSrc].forEach((src) => {
      const img = new Image();
      img.src = src;
      if (img.decode) img.decode().catch(() => {});
    });
  }, [maskSrc, sceneSrc]);

  // Skip handler
  const handleSkip = useCallback(() => {
    if (!config.skipEnabled) return;
    setSkip(true);
    setRollOut(false);
    setMaskReveal(true);
  }, [config.skipEnabled]);

  // Keyboard and click skip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === " " ||
        e.key === "Escape" ||
        e.key === "Enter" ||
        e.key === "e" ||
        e.key === "E"
      ) {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSkip]);

  // Caption timing
  const captionTimerRef = useRef<number | null>(null);
  const captionSequenceRef = useRef(0);

  const handlePanelStart = useCallback(
    (i: number) => {
      const sequence = captionSequenceRef.current + 1;
      captionSequenceRef.current = sequence;
      setCaptionVisible(false);
      if (captionTimerRef.current !== null) {
        window.clearTimeout(captionTimerRef.current);
      }
      captionTimerRef.current = window.setTimeout(
        () => {
          if (captionSequenceRef.current !== sequence) return;
          setCaptionPanel(i);
          setCaptionVisible(true);
          captionTimerRef.current = null;
        },
        Math.round(panels[i].revealMs * CAPTION_SHOW_DELAY_FRAC),
      );
    },
    [panels],
  );

  const handlePanelShrink = useCallback(() => {
    captionSequenceRef.current += 1;
    if (captionTimerRef.current !== null) {
      window.clearTimeout(captionTimerRef.current);
      captionTimerRef.current = null;
    }
    setCaptionVisible(false);
  }, []);

  const handleComplete = useCallback(() => {
    window.setTimeout(() => setRollOut(true), ROLL_DELAY_MS);
  }, []);

  const handleRolledOut = useCallback(() => {
    setMaskReveal(true);
  }, []);

  // When mask animation starts, emit event to start game loading
  const handleMaskAnimationStart = useCallback(() => {
    EventBus.emit("intro:complete", { levelId });
  }, [levelId]);

  const handleMaskDone = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Current caption content
  const currentPanel = captionPanel >= 0 ? panels[captionPanel] : panels[0];

  return (
    // biome-ignore lint/a11y/useSemanticElements: Full-screen skip overlay needs to be a div for layout
    <div
      className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-black"
      onClick={handleSkip}
      onKeyDown={(e) => {
        if (
          e.key === "Escape" ||
          e.key === " " ||
          e.key === "Enter" ||
          e.key === "e" ||
          e.key === "E"
        ) {
          e.preventDefault();
          handleSkip();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Aperte ESC para pular a introdução"
    >
      {!maskReveal && (
        <div
          ref={fitRefCallback}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            padding: "24px",
            boxSizing: "border-box",
            // Critical: constrain to viewport
            maxWidth: "100vw",
            maxHeight: "100vh",
            overflow: "hidden",
            // Content is behind the click overlay
            position: "relative",
            zIndex: 0,
          }}
        >
          {/* Skip hint box - top left corner */}
          <div
            style={{
              position: "absolute",
              top: "24px",
              left: "24px",
              background: CAPTION_BG,
              border: CAPTION_BORDER,
              borderRadius: "8px",
              padding: "12px 16px",
              fontFamily: CAPTION_BODY_FONT,
              fontSize: "10px",
              color: CAPTION_BODY_COLOR,
              zIndex: 10, // Above all content
              pointerEvents: "none",
            }}
          >
            ⏩︎ Aperte ESC para pular a introdução
          </div>
          {/* SCALED STAGE: The container is sized to fit the viewport,
              and the inner content is scaled via transform. */}
          <div
            style={{
              position: "relative",
              width: stageWidth * scale,
              height: (PANEL_HEIGHT + CAPTION_HEIGHT) * scale,
              flex: "none",
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          >
            {/* Inner stage at design dimensions, scaled down */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: stageWidth,
                height: PANEL_HEIGHT + CAPTION_HEIGHT,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <ComicSequence
                panels={panels}
                fullWidth={PANEL_FULL_WIDTH}
                height={PANEL_HEIGHT}
                blockSize={BLOCK_SIZE}
                gap={PANEL_GAP}
                rollOutMs={ROLL_OUT_MS}
                rollStaggerMs={ROLL_STAGGER_MS}
                skip={skip}
                rollOut={rollOut}
                onComplete={handleComplete}
                onRolledOut={handleRolledOut}
                onPanelStart={handlePanelStart}
                onPanelShrink={handlePanelShrink}
              />
              {/* CAPTION BOX wrapper */}
              <div
                style={{
                  position: "absolute",
                  top: PANEL_HEIGHT,
                  left: captionPanelLeft,
                  width: PANEL_FULL_WIDTH,
                  opacity:
                    captionPanel >= 0 && captionVisible && !rollOut ? 1 : 0,
                  transition: `opacity ${CAPTION_FADE_MS}ms ease-out`,
                }}
              >
                <CaptionBox
                  title={currentPanel?.title}
                  text={currentPanel?.caption ?? ""}
                  image={captionImage}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {maskReveal && (
        <MaskReveal
          sceneSrc={sceneSrc}
          maskSrc={maskSrc}
          startScale={MASK_START_SCALE}
          endScale={MASK_END_SCALE}
          durationMs={MASK_DURATION_MS}
          onAnimationStart={handleMaskAnimationStart}
          onDone={handleMaskDone}
        />
      )}
    </div>
  );
}
