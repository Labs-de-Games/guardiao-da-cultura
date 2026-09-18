"use client";

import { DndContext, type DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { Box, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";
import { AccuseConfirm } from "./AccuseConfirm";
import { ClueRail } from "./ClueRail";
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
import { SuspectTable } from "./SuspectTable";

const { colors, fonts, radius } = GAME_UI_TOKENS;

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
  const result = useGameUIStore((s) => s.investigation.result);
  const pendingAccusationId = useGameUIStore(
    (s) => s.investigation.pendingAccusationId,
  );
  const requestAccusation = useGameUIStore((s) => s.requestAccusation);
  const placeClueInSlot = useGameUIStore((s) => s.placeClueInSlot);
  const setHoveredClue = useGameUIStore((s) => s.setHoveredClue);
  const tutorialActive = useGameUIStore((s) => s.investigation.tutorial.active);
  const startTutorial = useGameUIStore((s) => s.startTutorial);

  const [draggingClueKey, setDraggingClueKey] = useState<string | null>(null);
  const autoTaught = useRef(false);

  // First visit only: the walkthrough runs itself once, and COMO JOGAR is how
  // anyone gets it back afterwards.
  useEffect(() => {
    if (!payload || autoTaught.current) return;
    autoTaught.current = true;
    if (!hasSeenInvestigationTutorial()) startTutorial();
  }, [payload, startTutorial]);

  // ESC backs out one level: a pending accusation first, then the whole phase.
  // Once the run is resolved the result panel owns the exit, so ESC would skip
  // the stars.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // The walkthrough owns ESC while it is up — it backs out of the lesson,
      // not out of the phase.
      if (e.key !== "Escape" || result || tutorialActive) return;
      e.preventDefault();
      if (pendingAccusationId) {
        requestAccusation(null);
        return;
      }
      EventBus.emit("investigation:exit", undefined);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [result, pendingAccusationId, requestAccusation, tutorialActive]);

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
        }}
      >
        <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
          <ClueRail />
          <SuspectTable />
        </Box>

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
          <Typography sx={{ fontSize: "0.88rem", color: colors.textSecondary }}>
            {payload.collectedCount} de {payload.clues.length}{" "}
            {payload.clues.length === 1 ? "pista" : "pistas"} recolhidas em
            campo
            {payload.previousStars > 0 &&
              ` · melhor resultado: ${payload.previousStars} ⭐`}
          </Typography>

          <Box sx={{ display: "flex", gap: 1.5, flexShrink: 0 }}>
            <Box
              component="button"
              type="button"
              onClick={startTutorial}
              disabled={tutorialActive}
              sx={{
                ...BOTTOM_BUTTON,
                cursor: tutorialActive ? "default" : "pointer",
                opacity: tutorialActive ? 0.4 : 1,
              }}
            >
              COMO JOGAR
            </Box>

            <Box
              component="button"
              type="button"
              onClick={() => EventBus.emit("investigation:exit", undefined)}
              sx={BOTTOM_BUTTON}
            >
              VOLTAR
            </Box>
          </Box>
        </Box>

        <AccuseConfirm />
        <InvestigationResult />
        <InvestigationTutorial />
      </Box>

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
