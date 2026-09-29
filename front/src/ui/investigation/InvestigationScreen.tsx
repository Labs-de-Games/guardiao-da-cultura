"use client";

import { DndContext, type DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { Box, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioManager } from "@/game/audio/AudioManager";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";
import { AccuseConfirm } from "./AccuseConfirm";
import { AccuseFeedback } from "./AccuseFeedback";
import { ClueRail } from "./ClueRail";
import {
  type ClueFlight,
  ClueReturnFlight,
  measureClueReturn,
} from "./ClueReturnFlight";
import { ExitConfirm } from "./ExitConfirm";
import { InvestigationResult } from "./InvestigationResult";
import { InvestigationTutorial } from "./InvestigationTutorial";
import {
  clueImageSrc,
  clueKeyFromDragId,
  DRAG_IMAGE_SIZE,
  dropAtPointer,
  parseSlotDropId,
  snapClueToCursor,
} from "./investigation-dnd";
import { hasSeenInvestigationTutorial } from "./investigation-tutorial-storage";
import { MusicToggle } from "./MusicToggle";
import { StarTracker } from "./StarTracker";
import { SuspectTable } from "./SuspectTable";
import { useInvestigationKeyboard } from "./useInvestigationKeyboard";

const { colors, fonts, radius } = GAME_UI_TOKENS;

/** Long enough to register as a refusal, short enough not to delay the alibi. */
const SHAKE_MS = 420;

const BOTTOM_BUTTON = {
  px: 3,
  py: 1.25,
  cursor: "pointer",
  bgcolor: "transparent",
  color: colors.textSecondary,
  border: `1px solid ${colors.bgTertiary}`,
  borderRadius: `${radius.small}px`,
  fontFamily: fonts.display,
  fontSize: "1.1rem",
  letterSpacing: "0.04em",
  "&:hover": {
    color: colors.textPrimary,
    borderColor: colors.accentGoldMuted,
  },
} as const;

/** The keyboard cursor resting on a footer button. */
const cursorRing = (focused: boolean) =>
  focused
    ? {
        outline: "none",
        color: colors.textPrimary,
        borderColor: colors.accentGold,
        boxShadow: `0 0 0 2px ${colors.accentGoldMuted}`,
      }
    : { outline: "none" };

/**
 * The suspect identification phase.
 *
 * Evidence lives permanently in the left rail; the suspects sit around the
 * table with their own slots underneath. Dropping a clue on a seat spends one
 * of its three hearts and grades it on the spot — quente, morno or frio — and
 * the accusation button under each seat only lights up once that seat is
 * holding evidence.
 */
export function InvestigationScreen() {
  const payload = useGameUIStore((s) => s.investigation.payload);
  const placeClueInSlot = useGameUIStore((s) => s.placeClueInSlot);
  const setHoveredClue = useGameUIStore((s) => s.setHoveredClue);
  const tutorialActive = useGameUIStore((s) => s.investigation.tutorial.active);
  const startTutorial = useGameUIStore((s) => s.startTutorial);
  const lastWrongSuspectId = useGameUIStore(
    (s) => s.investigation.lastWrongSuspectId,
  );
  const dismissWrongAccusation = useGameUIStore(
    (s) => s.dismissWrongAccusation,
  );
  const setExitConfirmOpen = useGameUIStore((s) => s.setExitConfirmOpen);
  const footerCursorIndex = useGameUIStore((s) =>
    s.investigation.cursor?.zone === "footer"
      ? s.investigation.cursor.index
      : null,
  );

  const [draggingClueKey, setDraggingClueKey] = useState<string | null>(null);
  const [flights, setFlights] = useState<ClueFlight[]>([]);
  const [shaking, setShaking] = useState(false);
  const autoTaught = useRef(false);

  // The same refusal the platforming uses for a wrong move, so a wrong name
  // lands the way every other mistake in the game does. The canvas is hidden
  // under this screen, so the shake has to be the DOM's rather than the
  // camera's — but the sound is the game's own.
  useEffect(() => {
    if (!lastWrongSuspectId) return;
    AudioManager.playSfx("sfx.puzzle.failure");
    setShaking(true);
    const timer = window.setTimeout(() => setShaking(false), SHAKE_MS);
    return () => window.clearTimeout(timer);
  }, [lastWrongSuspectId]);

  // Measured first, cleared second: once the board empties there is nothing
  // left on screen to fly home.
  const returnCluesHome = useCallback(() => {
    const { payload, result: resolved } =
      useGameUIStore.getState().investigation;
    const clues = payload?.clues ?? [];
    // A resolved run keeps its board: the result panel is next, not a retry.
    if (resolved) {
      dismissWrongAccusation();
      return;
    }
    setFlights(
      measureClueReturn((key) => {
        const clue = clues.find((c) => c.key === key);
        return clue ? clueImageSrc(clue) : null;
      }),
    );
    dismissWrongAccusation();
  }, [dismissWrongAccusation]);

  // First visit only: the walkthrough runs itself once, and COMO JOGAR is how
  // anyone gets it back afterwards.
  useEffect(() => {
    if (!payload || autoTaught.current) return;
    autoTaught.current = true;
    if (!hasSeenInvestigationTutorial()) startTutorial();
  }, [payload, startTutorial]);

  // Arrows/WASD, ENTER/SPACE and ESC — the whole phase is playable without a
  // mouse, and ESC still backs out one layer at a time.
  useInvestigationKeyboard({ onDismissWrongAccusation: returnCluesHome });

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingClueKey(null);
      setHoveredClue(null);

      const clueKey = clueKeyFromDragId(String(event.active.id));
      const target = event.over ? parseSlotDropId(String(event.over.id)) : null;
      if (!clueKey || !target) return;

      placeClueInSlot(target.suspectId, target.slotIndex, clueKey);
    },
    [placeClueInSlot, setHoveredClue],
  );

  if (!payload) return null;

  const draggingClue = draggingClueKey
    ? payload.clues.find((c) => c.key === draggingClueKey)
    : null;

  return (
    <DndContext
      collisionDetection={dropAtPointer}
      onDragStart={(event) =>
        setDraggingClueKey(clueKeyFromDragId(String(event.active.id)))
      }
      onDragCancel={() => setDraggingClueKey(null)}
      onDragEnd={handleDragEnd}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          bgcolor: colors.bgPrimary,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: shaking
            ? `investigation-shake ${SHAKE_MS}ms ease-in-out`
            : "none",
          "@keyframes investigation-shake": {
            "0%, 100%": { transform: "translateX(0)" },
            "15%": { transform: "translateX(-12px)" },
            "32%": { transform: "translateX(12px)" },
            "50%": { transform: "translateX(-8px)" },
            "68%": { transform: "translateX(8px)" },
            "85%": { transform: "translateX(-4px)" },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
          <ClueRail />
          <SuspectTable />
        </Box>

        <MusicToggle />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            px: { xs: 1.5, md: 3 },
            py: 1.5,
            bgcolor: "rgba(17, 15, 19, 0.93)",
            borderTop: `2px solid ${colors.bgTertiary}`,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{ fontSize: "0.88rem", color: colors.textSecondary }}
            >
              {payload.collectedCount} de {payload.clues.length}{" "}
              {payload.clues.length === 1 ? "pista" : "pistas"} recolhidas em
              campo
              {payload.previousStars > 0 &&
                ` · melhor resultado: ${payload.previousStars} ⭐`}
            </Typography>
            <Typography
              sx={{ fontSize: "0.8rem", color: colors.textSecondary, mt: 0.3 }}
            >
              Setas ou WASD para navegar · ENTER ou ESPAÇO para pegar, soltar e
              remover uma pista
            </Typography>
          </Box>

          <StarTracker />

          <Box sx={{ display: "flex", gap: 1.5, flexShrink: 0 }}>
            <Box
              component="button"
              type="button"
              data-footer-button="tutorial"
              onClick={startTutorial}
              disabled={tutorialActive}
              sx={{
                ...BOTTOM_BUTTON,
                ...cursorRing(footerCursorIndex === 0),
                cursor: tutorialActive ? "default" : "pointer",
                opacity: tutorialActive ? 0.4 : 1,
              }}
            >
              COMO JOGAR
            </Box>

            <Box
              component="button"
              type="button"
              data-footer-button="exit"
              // Never straight out: the board does not survive the trip, so
              // both ways of leaving go through the same gate.
              onClick={() => setExitConfirmOpen(true)}
              sx={{ ...BOTTOM_BUTTON, ...cursorRing(footerCursorIndex === 1) }}
            >
              VOLTAR
            </Box>
          </Box>
        </Box>

        <ExitConfirm />
        <AccuseConfirm />
        <AccuseFeedback onDismiss={returnCluesHome} />
        <InvestigationResult />
        <InvestigationTutorial />
      </Box>

      <ClueReturnFlight flights={flights} onDone={() => setFlights([])} />

      {/* The overlay is sized to the art rather than to the rail row it came
          from, so the modifier has a square to centre on the cursor. */}
      <DragOverlay
        dropAnimation={null}
        modifiers={[snapClueToCursor]}
        style={{ width: DRAG_IMAGE_SIZE, height: DRAG_IMAGE_SIZE }}
      >
        {draggingClue && (
          <Box
            component="img"
            src={clueImageSrc(draggingClue)}
            alt=""
            sx={{
              width: DRAG_IMAGE_SIZE,
              height: DRAG_IMAGE_SIZE,
              objectFit: "contain",
              imageRendering: "pixelated",
              filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.7))",
              pointerEvents: "none",
            }}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
