"use client";

import { Box, Typography } from "@mui/material";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";
import { markInvestigationTutorialSeen } from "./investigation-tutorial-storage";
import {
  INVESTIGATION_TUTORIAL_STEPS,
  type TutorialContext,
} from "./tutorial-steps";

const { colors, fonts, radius } = GAME_UI_TOKENS;

/** Breathing room between a highlighted element and the edge of its hole. */
const HOLE_PAD = 10;
const MARGIN = 16;
const CAPTION_WIDTH = 340;

/**
 * The dim sits *below* the hover popovers on purpose: the first two steps ask
 * the player to read a clue and a dossier, and those must not come out greyed.
 */
const DIM_Z = 1900;
const CAPTION_Z = 2200;

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function toRect(box: DOMRect): Rect {
  return { left: box.left, top: box.top, width: box.width, height: box.height };
}

function union(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.left + r.width));
  const bottom = Math.max(...rects.map((r) => r.top + r.height));
  return { left, top, width: right - left, height: bottom - top };
}

function measure(selector: string): Rect[] {
  const out: Rect[] = [];
  for (const el of Array.from(document.querySelectorAll(selector))) {
    const box = el.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) out.push(toRect(box));
  }
  return out;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Drops the caption into the widest empty band around the highlighted element.
 *
 * Picking by available space rather than by a fixed preference is what keeps it
 * off the thing it is describing — the rail wants a caption to its right, the
 * row of portraits wants one below, and neither has to be special-cased.
 */
function placeCaption(
  target: Rect | null,
  box: { width: number; height: number },
): { left: number; top: number } {
  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;

  if (!target) {
    return {
      left: (viewWidth - box.width) / 2,
      top: (viewHeight - box.height) / 2,
    };
  }

  const gaps = [
    { side: "right", space: viewWidth - (target.left + target.width) },
    { side: "left", space: target.left },
    { side: "bottom", space: viewHeight - (target.top + target.height) },
    { side: "top", space: target.top },
  ];
  const best = gaps.reduce((a, b) => (b.space > a.space ? b : a));

  let left: number;
  let top: number;

  if (best.side === "right" || best.side === "left") {
    left =
      best.side === "right"
        ? target.left + target.width + MARGIN
        : target.left - box.width - MARGIN;
    top = target.top + target.height / 2 - box.height / 2;
  } else {
    left = target.left + target.width / 2 - box.width / 2;
    top =
      best.side === "bottom"
        ? target.top + target.height + MARGIN
        : target.top - box.height - MARGIN;
  }

  return {
    left: clamp(left, MARGIN, viewWidth - box.width - MARGIN),
    top: clamp(top, MARGIN, viewHeight - box.height - MARGIN),
  };
}

/**
 * The coach-mark walkthrough.
 *
 * It runs on the real board rather than a mock one, so the drag the player
 * rehearses is the drag they will be doing for the rest of the phase. The dim
 * never swallows clicks — the holes are cut for legibility, not to trap the
 * player in a script — and `endTutorial` lifts the demonstration drop and
 * refills the hearts afterwards, so nothing was spent on the lesson.
 */
export function InvestigationTutorial() {
  const active = useGameUIStore((s) => s.investigation.tutorial.active);
  const stepIndex = useGameUIStore((s) => s.investigation.tutorial.stepIndex);
  const focusSuspectId = useGameUIStore(
    (s) => s.investigation.tutorial.focusSuspectId,
  );
  const focusClueKey = useGameUIStore(
    (s) => s.investigation.tutorial.focusClueKey,
  );
  const boards = useGameUIStore((s) => s.investigation.boards);
  const result = useGameUIStore((s) => s.investigation.result);
  const advanceTutorial = useGameUIStore((s) => s.advanceTutorial);
  const endTutorial = useGameUIStore((s) => s.endTutorial);

  const captionRef = useRef<HTMLDivElement>(null);
  const [holes, setHoles] = useState<Rect[]>([]);
  const [target, setTarget] = useState<Rect | null>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  // Bumped whenever the page may have moved under the highlight.
  const [tick, setTick] = useState(0);

  const step = active ? INVESTIGATION_TUTORIAL_STEPS[stepIndex] : undefined;

  const finish = useCallback(() => {
    markInvestigationTutorialSeen();
    endTutorial();
  }, [endTutorial]);

  const next = useCallback(() => {
    if (stepIndex >= INVESTIGATION_TUTORIAL_STEPS.length - 1) {
      finish();
      return;
    }
    advanceTutorial();
  }, [stepIndex, advanceTutorial, finish]);

  // A resolved run owns the screen; the walkthrough steps aside for the stars.
  useEffect(() => {
    if (active && result) finish();
  }, [active, result, finish]);

  // A step index past the end can only mean the script ran out.
  useEffect(() => {
    if (active && !step) finish();
  }, [active, step, finish]);

  /**
   * The one hands-on beat. It watches for a *change* to the board rather than
   * for a clue simply being on it: someone replaying the walkthrough mid-run
   * already has clues placed, and would otherwise skip straight past the only
   * step that asks them to do something.
   */
  const boardSignature = Object.entries(boards)
    .map(([suspectId, board]) => `${suspectId}:${board.slots.join(",")}`)
    .sort()
    .join("|");
  const dropBaseline = useRef<string | null>(null);

  useEffect(() => {
    if (!active || step?.advance !== "drop") {
      dropBaseline.current = null;
      return;
    }
    if (dropBaseline.current === null) {
      dropBaseline.current = boardSignature;
      return;
    }
    if (dropBaseline.current !== boardSignature) advanceTutorial();
  }, [active, step, boardSignature, advanceTutorial]);

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish();
        return;
      }
      // ENTER and SPACE walk the script forward — the same two keys that act on
      // the board — but never past the hands-on step, which only a real drop
      // gets through.
      if (
        (event.key === "Enter" || event.key === " ") &&
        step?.advance === "click"
      ) {
        event.preventDefault();
        next();
      }
    };

    const onLayoutChange = () => setTick((t) => t + 1);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [active, step, next, finish]);

  // Re-measure after the board itself changes: a filled slot grows, and the
  // step that explains the verdict points straight at it.
  useLayoutEffect(() => {
    if (!step) return;

    const ctx: TutorialContext = {
      suspectId: focusSuspectId,
      clueKey: focusClueKey,
    };
    const selectors = step.anchors(ctx);
    const all = selectors.flatMap(measure);

    setHoles(all);
    setTarget(union(selectors.length > 0 ? measure(selectors[0]) : []));
  }, [step, focusSuspectId, focusClueKey, boards, tick]);

  useLayoutEffect(() => {
    const box = captionRef.current?.getBoundingClientRect();
    if (!box) return;
    setPosition(placeCaption(target, box));
  }, [target]);

  if (!active || !step) return null;

  const total = INVESTIGATION_TUTORIAL_STEPS.length;
  const isLast = stepIndex === total - 1;

  return createPortal(
    <>
      <Box
        component="svg"
        aria-hidden="true"
        sx={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          // Never swallows a click: the holes are for the eye, and the player
          // keeps full run of the board even mid-step.
          pointerEvents: "none",
          zIndex: DIM_Z,
        }}
      >
        <defs>
          <mask id="investigation-tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {holes.map((hole) => (
              <rect
                key={`${hole.left}-${hole.top}-${hole.width}`}
                x={hole.left - HOLE_PAD}
                y={hole.top - HOLE_PAD}
                width={hole.width + HOLE_PAD * 2}
                height={hole.height + HOLE_PAD * 2}
                rx={radius.small}
                fill="black"
              />
            ))}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(6, 5, 7, 0.78)"
          mask="url(#investigation-tutorial-mask)"
        />
        {holes.map((hole) => (
          <rect
            key={`ring-${hole.left}-${hole.top}-${hole.width}`}
            x={hole.left - HOLE_PAD}
            y={hole.top - HOLE_PAD}
            width={hole.width + HOLE_PAD * 2}
            height={hole.height + HOLE_PAD * 2}
            rx={radius.small}
            fill="none"
            stroke={colors.accentGold}
            strokeWidth={3}
          />
        ))}
      </Box>

      <Box
        ref={captionRef}
        role="dialog"
        aria-label={`Tutorial, passo ${stepIndex + 1} de ${total}`}
        sx={{
          position: "fixed",
          left: position?.left ?? MARGIN,
          top: position?.top ?? MARGIN,
          // Hidden with opacity rather than visibility so it is measurable, and
          // still reachable by a screen reader, on the frame before placement.
          opacity: position ? 1 : 0,
          zIndex: CAPTION_Z,
          width: CAPTION_WIDTH,
          maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
          bgcolor: colors.bgSecondary,
          border: `2px solid ${colors.accentGold}`,
          borderRadius: `${radius.small}px`,
          boxShadow: "0 12px 34px rgba(0, 0, 0, 0.75)",
          p: 1.75,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: "1.05rem",
            lineHeight: 1.5,
            color: colors.textPrimary,
          }}
        >
          {step.text}
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Typography
            sx={{ fontSize: "0.85rem", color: colors.textSecondary }}
            aria-hidden="true"
          >
            {stepIndex + 1}/{total}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {!isLast && (
              <Box
                component="button"
                type="button"
                onClick={finish}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  cursor: "pointer",
                  bgcolor: "transparent",
                  border: "none",
                  color: colors.textSecondary,
                  fontFamily: fonts.display,
                  fontSize: "0.95rem",
                  letterSpacing: "0.04em",
                  "&:hover": { color: colors.textPrimary },
                }}
              >
                PULAR
              </Box>
            )}

            {/* The hands-on step has no way forward but doing it. */}
            {step.advance === "click" && (
              <Box
                component="button"
                type="button"
                onClick={next}
                sx={{
                  px: 2.25,
                  py: 0.75,
                  cursor: "pointer",
                  bgcolor: colors.accentGold,
                  border: "none",
                  borderRadius: `${radius.small}px`,
                  color: colors.bgPrimary,
                  fontFamily: fonts.display,
                  fontSize: "1rem",
                  letterSpacing: "0.05em",
                  "&:hover": { bgcolor: colors.accentGoldHover },
                }}
              >
                {step.cta ?? "PRÓXIMO"}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </>,
    document.body,
  );
}
