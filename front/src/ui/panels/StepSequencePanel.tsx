"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Button, IconButton, Paper, Typography } from "@mui/material";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useReducer, useState } from "react";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { EventBus } from "@/shared/events/event-bus";
import { useSound } from "@/ui/hooks/useSound";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS, UI_LAYERS } from "@/ui/theme/tokens";

import { DraggableStepCard } from "./DraggableStepCard";
import { StepSequenceSlot } from "./StepSequenceSlot";
import { StepVideo } from "./StepVideo";
import {
  buildInitialState,
  evaluateSequence,
  getStepImageSrc,
  parseDragId,
  reducer,
  resolveDragEnd,
  type StepCard,
} from "./step-sequence-types";

const REJECT_DURATION_MS = 400;
const WRONG_ORDER_MESSAGE =
  "Alguns passos estão fora de ordem. Observe o vídeo novamente e ajuste a sequência.";

function CarouselDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "carousel" });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        minWidth: 0,
        borderRadius: "12px",
        outline: isOver
          ? `2px dashed ${GAME_UI_TOKENS.colors.accentGold}`
          : "2px dashed transparent",
      }}
    >
      {children}
    </Box>
  );
}

export function StepSequencePanel() {
  const stepSequenceOpen = useGameUIStore((s) => s.stepSequenceOpen);
  const stepSequenceData = useGameUIStore((s) => s.stepSequenceData);
  const closeStepSequence = useGameUIStore((s) => s.closeStepSequence);

  const { playModalOpen, playModalClose, playClick } = useSound();

  const [state, dispatch] = useReducer(reducer, buildInitialState([], [], 0));
  const [rejectedSlotIndices, setRejectedSlotIndices] = useState<number[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [activeDragCard, setActiveDragCard] = useState<StepCard | null>(null);

  // Embla's own pointer-drag is disabled: it competes with @dnd-kit for the
  // same gestures on the same nodes. Navigation is arrows-only.
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
    watchDrag: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    if (!stepSequenceOpen || !stepSequenceData) return;

    dispatch({
      type: "RESET",
      payload: {
        availableSteps: stepSequenceData.availableSteps,
        filledSlots: stepSequenceData.filledSlots ?? [],
        slotCount: stepSequenceData.expectedSequence.length,
      },
    });
    setFeedbackMessage(null);
    setRejectedSlotIndices([]);
  }, [stepSequenceOpen, stepSequenceData]);

  useEffect(() => {
    if (!stepSequenceOpen) return;

    EventBus.emit("game:pause-requested", { reason: "step-sequence" });
    playModalOpen();

    return () => {
      EventBus.emit("game:resume-requested", { reason: "step-sequence" });
      playModalClose();
    };
  }, [stepSequenceOpen, playModalOpen, playModalClose]);

  const handleClose = useCallback(() => {
    EventBus.emit("ui:step-sequence-close", undefined);
    closeStepSequence();
  }, [closeStepSequence]);

  const triggerReject = useCallback((indices: number[]) => {
    if (indices.length === 0) return;
    setRejectedSlotIndices(indices);
    setTimeout(() => setRejectedSlotIndices([]), REJECT_DURATION_MS);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!stepSequenceData) return;

    const { expectedSequence, instanceId } = stepSequenceData;
    const { correctIndices, wrongIndices } = evaluateSequence(
      state.slots,
      state.lockedSlots,
      expectedSequence,
    );

    dispatch({ type: "SUBMIT_ATTEMPT" });
    // The reducer value is still the pre-dispatch one inside this callback.
    const attemptNumber = state.attemptCount + 1;

    if (correctIndices.length > 0) {
      dispatch({ type: "LOCK_SLOTS", payload: { indices: correctIndices } });
      for (const idx of correctIndices) {
        const stepId = state.slots[idx];
        if (!stepId) continue;
        EventBus.emit("ui:step-placed", { instanceId, slotIndex: idx, stepId });
      }
    }

    if (wrongIndices.length > 0) {
      for (const idx of wrongIndices) {
        EventBus.emit("ui:step-rejected", {
          instanceId,
          slotIndex: idx,
          stepId: state.slots[idx] ?? "",
        });
      }
      EventBus.emit("ui:step-sequence-rejected", {
        instanceId,
        attemptNumber,
        wrongCount: wrongIndices.length,
        correctCount: correctIndices.length,
        totalSlots: expectedSequence.length,
      });
      triggerReject(wrongIndices);
      // Only sound the reject path: a successful submit closes the panel, and
      // the unmount cleanup already plays the modal-close sfx.
      playClick();
      setFeedbackMessage(WRONG_ORDER_MESSAGE);
      return;
    }

    setFeedbackMessage(null);
    EventBus.emit("ui:step-sequence-submit", {
      instanceId,
      placedSteps: state.slots,
    });
    handleClose();
  }, [
    stepSequenceData,
    state.slots,
    state.lockedSlots,
    state.attemptCount,
    triggerReject,
    handleClose,
    playClick,
  ]);

  useEffect(() => {
    if (!stepSequenceOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      handleClose();
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, [stepSequenceOpen, handleClose]);

  const handleDragStart = useCallback(
    ({ active }: { active: { id: string | number } }) => {
      const parsed = parseDragId(String(active.id));
      if (!parsed) return;

      if (parsed.prefix === "step") {
        setActiveDragCard(state.availableSteps[parsed.index] ?? null);
      } else if (parsed.prefix === "seq") {
        const stepId = state.slots[parsed.index];
        setActiveDragCard(
          state.availableSteps.find((c) => c.id === stepId) ?? null,
        );
      }
    },
    [state.availableSteps, state.slots],
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragCard(null);
    if (!over) return;

    const action = resolveDragEnd(String(active.id), String(over.id));
    if (action) dispatch(action);
  }, []);

  if (!stepSequenceOpen || !stepSequenceData) return null;

  const cardById = new Map(
    stepSequenceData.availableSteps.map((c) => [c.id, c]),
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: UI_LAYERS.FULLSCREEN,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0, 0, 0, 0.62)",
          pointerEvents: "auto",
        }}
      >
        <Paper
          square
          sx={{
            position: "relative",
            width: "min(760px, 94vw)",
            maxHeight: "92vh",
            overflow: "auto",
            bgcolor: GAME_UI_TOKENS.colors.bgSecondary,
            borderRadius: `${GAME_UI_TOKENS.radius.panel}px`,
            border: `2px solid ${GAME_UI_TOKENS.colors.accentGold}`,
            p: 3,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <IconButton
            aria-label="Fechar"
            onClick={handleClose}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: GAME_UI_TOKENS.colors.textSecondary,
              "&:hover": { color: GAME_UI_TOKENS.colors.white },
            }}
          >
            <CloseIcon />
          </IconButton>

          <Box sx={{ pr: 5 }}>
            <Typography
              sx={{
                color: GAME_UI_TOKENS.colors.accentGold,
                fontFamily: GAME_UI_TOKENS.fonts.display,
                fontWeight: 700,
                fontSize: "24px",
                lineHeight: 1.2,
              }}
            >
              Passos de quadrilha
            </Typography>
            <Typography
              sx={{
                color: GAME_UI_TOKENS.colors.textPrimary,
                fontFamily: GAME_UI_TOKENS.fonts.body,
                fontSize: "14px",
                mt: 0.75,
              }}
            >
              Observe os movimentos no vídeo e repita a sequência.
            </Typography>
            {feedbackMessage && (
              <Typography
                role="alert"
                sx={{
                  color: LayoutConfig.COLORS.UNAVAILABLE_RED,
                  fontSize: "13px",
                  mt: 1,
                }}
              >
                {feedbackMessage}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)",
              gap: 2,
              alignItems: "center",
            }}
          >
            <StepVideo videoPath={stepSequenceData.videoPath} />

            <CarouselDropZone>
              <IconButton
                onClick={() => emblaApi?.scrollPrev()}
                aria-label="Passo anterior"
                sx={{ color: GAME_UI_TOKENS.colors.textPrimary, p: 0.5 }}
              >
                <ChevronLeftIcon />
              </IconButton>

              <Box
                ref={emblaRef}
                sx={{ overflow: "hidden", flex: 1, minWidth: 0 }}
              >
                <Box sx={{ display: "flex", gap: 1 }}>
                  {state.availableSteps.map((card, index) => (
                    <Box
                      key={card.id}
                      sx={{ flex: "0 0 100%", minWidth: 0, p: 0.5 }}
                    >
                      <DraggableStepCard
                        index={index}
                        card={card}
                        isUsed={state.usedStepIndices.includes(index)}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>

              <IconButton
                onClick={() => emblaApi?.scrollNext()}
                aria-label="Próximo passo"
                sx={{ color: GAME_UI_TOKENS.colors.textPrimary, p: 0.5 }}
              >
                <ChevronRightIcon />
              </IconButton>
            </CarouselDropZone>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: `repeat(${state.slots.length}, minmax(0, 1fr))`,
              gap: 1.5,
            }}
          >
            {state.slots.map((stepId, idx) => (
              <StepSequenceSlot
                key={`seq-${idx}`}
                idx={idx}
                card={stepId ? (cardById.get(stepId) ?? null) : null}
                isLocked={state.lockedSlots[idx]}
                isJustPlaced={state.justPlacedSlots.includes(idx)}
                isRejecting={rejectedSlotIndices.includes(idx)}
              />
            ))}
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              sx={{
                bgcolor: GAME_UI_TOKENS.colors.accentGold,
                color: LayoutConfig.COLORS.MAP_BG_CSS,
                fontFamily: GAME_UI_TOKENS.fonts.body,
                fontWeight: 700,
                fontSize: "12px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                borderRadius: `${GAME_UI_TOKENS.radius.small}px`,
                px: 2,
                py: 0.75,
                "&:hover": { bgcolor: GAME_UI_TOKENS.colors.accentGoldHover },
              }}
            >
              Confirmar
            </Button>
          </Box>
        </Paper>
      </Box>

      <DragOverlay dropAnimation={null}>
        {activeDragCard && (
          <Box
            component="img"
            src={getStepImageSrc(activeDragCard)}
            alt=""
            sx={{
              width: 96,
              aspectRatio: "16 / 9",
              borderRadius: "10px",
              objectFit: "cover",
              opacity: 0.9,
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              pointerEvents: "none",
            }}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
