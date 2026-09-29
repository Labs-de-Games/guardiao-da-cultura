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
  PANEL_FULL_WIDTH,
  PANEL_GAP,
  PANEL_HEIGHT,
  ROLL_DELAY_MS,
  ROLL_OUT_MS,
  ROLL_STAGGER_MS,
} from "./constants";
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
  const [finished, setFinished] = useState(false);
  const [captionPanel, setCaptionPanel] = useState<number>(-1);
  const [captionVisible, setCaptionVisible] = useState(false);
  // Panel navigation state
  const [navigatingPanel, setNavigatingPanel] = useState<number>(-1); // -1 = not navigating, 0+ = current panel index
  const [manuallyAdvanced, setManuallyAdvanced] = useState(false); // true if user manually advanced
  const lastViewedPanelRef = useRef<number>(-1); // Track last panel user has seen
  const isNavigatingRef = useRef(false); // Debounce flag to prevent rapid key presses
  const fitElRef = useRef<HTMLDivElement | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const assetDir = config.assetDir ?? "intro";

  // Build panel configs with full asset paths
  const panels: PanelConfig[] = useMemo(() => {
    return config.panels.map((p: PanelConfig) => ({
      ...p,
      src: `/assets/data/levels/${levelId}/${assetDir}/${p.src}`,
    }));
  }, [config.panels, levelId, assetDir]);

  // Asset paths
  const captionImage = config.captionImage
    ? `/assets/data/levels/${levelId}/${assetDir}/${config.captionImage}`
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

  // Emits the game-loading trigger and hands off to LoadingGameScreen
  const handleFinish = useCallback(() => {
    setFinished(true);
    EventBus.emit("intro:complete", { levelId });
    onComplete();
  }, [levelId, onComplete]);

  // Skip handler - skips entire animation
  const handleSkip = useCallback(() => {
    if (!config.skipEnabled) return;
    setSkip(true);
    setRollOut(false);
    handleFinish();
  }, [config.skipEnabled, handleFinish]);

  // Navigate to next panel
  const handleNextPanel = useCallback(() => {
    if (skip || rollOut || finished) return;

    // Debounce: prevent rapid key presses
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    // Determine current panel: use the max of navigatingPanel, captionPanel, or lastViewedPanel
    const currentPanel = Math.max(
      navigatingPanel,
      captionPanel,
      lastViewedPanelRef.current,
    );

    const next = currentPanel + 1;

    if (next >= panels.length) {
      // If on last panel, skip to end
      handleSkip();
      isNavigatingRef.current = false;
      return;
    }

    // Update the ref to track what we've seen
    lastViewedPanelRef.current = next;
    setNavigatingPanel(next);
    setManuallyAdvanced(true);

    // Reset debounce after a short delay
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 300);
  }, [
    skip,
    rollOut,
    finished,
    navigatingPanel,
    captionPanel,
    panels.length,
    handleSkip,
  ]);

  // Keyboard and click skip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Skip entire animation
      if (
        e.key === "Escape" ||
        e.key === "Enter" ||
        e.key === "e" ||
        e.key === "E"
      ) {
        e.preventDefault();
        handleSkip();
        return;
      }
      // Advance to next panel
      if (e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        handleNextPanel();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSkip, handleNextPanel]);

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

  // Track last viewed panel when caption changes
  useEffect(() => {
    if (captionPanel >= 0) {
      lastViewedPanelRef.current = Math.max(
        lastViewedPanelRef.current,
        captionPanel,
      );
    }
  }, [captionPanel]);

  const handlePanelShrink = useCallback(() => {
    captionSequenceRef.current += 1;
    if (captionTimerRef.current !== null) {
      window.clearTimeout(captionTimerRef.current);
      captionTimerRef.current = null;
    }
    setCaptionVisible(false);
  }, []);

  // Hide caption when navigating - let the normal animation flow show it
  useEffect(() => {
    if (navigatingPanel >= 0 && manuallyAdvanced) {
      // Cancel any pending caption timer
      if (captionTimerRef.current !== null) {
        window.clearTimeout(captionTimerRef.current);
        captionTimerRef.current = null;
      }
      // Hide caption - it will reappear when the panel's animation triggers handlePanelStart
      setCaptionVisible(false);
      setManuallyAdvanced(false);
    }
  }, [navigatingPanel, manuallyAdvanced]);

  const handleComplete = useCallback(() => {
    window.setTimeout(() => {
      EventBus.emit("intro:music-start", { levelId });
      EventBus.emit("intro:rollout-start", { levelId });
      setRollOut(true);
    }, ROLL_DELAY_MS);
  }, [levelId]);

  const handleRolledOut = useCallback(() => {
    EventBus.emit("intro:complete", { levelId });
    onComplete();
  }, [levelId, onComplete]);

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
      {!finished && (
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
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div>⏭ Aperte ESPAÇO para avançar quadrinhos</div>
            <div>⏩︎ Aperte ESC para pular a introdução</div>
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
                navigateToPanel={navigatingPanel}
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
    </div>
  );
}
