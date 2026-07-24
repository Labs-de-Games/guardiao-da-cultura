"use client";

import { DndContext, type DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { Box, Button, Paper, Typography } from "@mui/material";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { LayoutConfig } from "@/game/constants/LayoutConfig";
import type { ChunkArrowDir } from "@/game/objects/ui/chunkSelectorNavigation";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { UI_LAYERS } from "@/ui/theme/tokens";

import {
  buildInitialState,
  getChunkImageSrc,
  reducer,
} from "./chunk-selector-types";
import { DraggableInventoryItem } from "./DraggableInventoryItem";
import { DroppableGridSlot } from "./DroppableGridSlot";
import { InventoryDropZone } from "./InventoryDropZone";

const directionByKey: Record<string, ChunkArrowDir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

type DragIdPrefix = "inv" | "slot" | "grid";

function parseDragId(
  id: string,
): { prefix: DragIdPrefix; index: number } | null {
  if (id.startsWith("inv-"))
    return { prefix: "inv", index: Number(id.slice(4)) };
  if (id.startsWith("slot-"))
    return { prefix: "slot", index: Number(id.slice(5)) };
  if (id.startsWith("grid-"))
    return { prefix: "grid", index: Number(id.slice(5)) };
  return null;
}

const REJECT_DURATION_MS = 400;

export function ChunkSelectorPanel() {
  const chunkSelectorData = useGameUIStore((s) => s.chunkSelectorData);
  const chunkSelectorOpen = useGameUIStore((s) => s.chunkSelectorOpen);
  const closeChunkSelector = useGameUIStore((s) => s.closeChunkSelector);

  const [state, dispatch] = useReducer(
    reducer,
    buildInitialState([], [null, null, null, null]),
  );
  const inventoryItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const [activeDragImageId, setActiveDragImageId] = useState<string | null>(
    null,
  );
  const [slotWidth, setSlotWidth] = useState(170);
  const [rejectedSlotIndices, setRejectedSlotIndices] = useState<number[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!chunkSelectorOpen || !chunkSelectorData) return;

    dispatch({
      type: "RESET",
      payload: {
        availableItems: chunkSelectorData.availableItems,
        filledSlots: chunkSelectorData.filledSlots,
      },
    });
    setFeedbackMessage(null);
    setRejectedSlotIndices([]);
  }, [chunkSelectorData, chunkSelectorOpen]);

  useEffect(() => {
    if (!chunkSelectorOpen) return;
    const el = gridContainerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setSlotWidth(Math.max((w - 2) / 2, 100));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [chunkSelectorOpen]);

  const triggerReject = useCallback((indices: number[]) => {
    if (indices.length === 0) return;
    setRejectedSlotIndices(indices);
    setTimeout(() => setRejectedSlotIndices([]), REJECT_DURATION_MS);
  }, []);

  const handleClose = useCallback(() => {
    EventBus.emit("ui:chunk-selector-close", undefined);
    closeChunkSelector();
  }, [closeChunkSelector]);

  const handleSubmit = useCallback(() => {
    if (!chunkSelectorData) return;

    const { expectedSlots, instanceId } = chunkSelectorData;
    const wrongIndices: number[] = [];
    const newlyCorrectIndices: number[] = [];

    for (let i = 0; i < state.slots.length; i++) {
      if (state.lockedSlots[i]) continue;
      const placed = state.slots[i];
      if (placed && placed === expectedSlots[i]) {
        newlyCorrectIndices.push(i);
      } else {
        wrongIndices.push(i);
      }
    }

    if (newlyCorrectIndices.length > 0) {
      dispatch({
        type: "LOCK_SLOTS",
        payload: { indices: newlyCorrectIndices },
      });
      for (const idx of newlyCorrectIndices) {
        const itemId = state.slots[idx];
        if (!itemId) continue;
        EventBus.emit("ui:chunk-slot-placed", {
          instanceId,
          slotIndex: idx,
          itemId,
        });
      }
    }

    if (wrongIndices.length > 0) {
      for (const idx of wrongIndices) {
        EventBus.emit("ui:chunk-slot-rejected", {
          instanceId,
          slotIndex: idx,
          itemId: state.slots[idx] ?? "",
        });
      }
      triggerReject(wrongIndices);
      setFeedbackMessage(
        "Algumas partes ainda estão fora do lugar. Revise a posição dos fragmentos antes de confirmar.",
      );
      return;
    }

    setFeedbackMessage(null);
    EventBus.emit("ui:chunk-selector-submit", {
      instanceId,
      placedItems: state.slots,
    });
    handleClose();
  }, [
    chunkSelectorData,
    handleClose,
    state.slots,
    state.lockedSlots,
    triggerReject,
  ]);

  useEffect(() => {
    if (!chunkSelectorOpen) return;

    EventBus.emit("game:pause-requested", { reason: "chunk-selector" });

    return () => {
      EventBus.emit("game:resume-requested", { reason: "chunk-selector" });
    };
  }, [chunkSelectorOpen]);

  useEffect(() => {
    if (!chunkSelectorOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const normalizedKey =
        event.key.length === 1 ? event.key.toLowerCase() : event.key;

      const isDirectionalInput = Boolean(directionByKey[normalizedKey]);
      const isConfirmInput = normalizedKey === "Enter" || normalizedKey === " ";
      const isCloseInput = normalizedKey === "Escape";

      if (!isDirectionalInput && !isConfirmInput && !isCloseInput) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (isCloseInput) {
        if (state.pickedItemIndex !== null) {
          dispatch({ type: "CANCEL_PICK" });
          return;
        }
        handleClose();
        return;
      }

      if (isConfirmInput) {
        if (state.cursorMode === "confirm") {
          handleSubmit();
          return;
        }

        dispatch({ type: "CONFIRM" });
        return;
      }

      const direction = directionByKey[normalizedKey];
      if (direction) {
        dispatch({ type: "MOVE", payload: direction });
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, [
    chunkSelectorOpen,
    handleClose,
    handleSubmit,
    state.cursorMode,
    state.pickedItemIndex,
  ]);

  useEffect(() => {
    if (!chunkSelectorOpen) return;
    if (state.cursorMode !== "inventory") return;

    const target = inventoryItemRefs.current[state.selectedInventoryIndex];
    if (!target) return;

    target.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }, [chunkSelectorOpen, state.cursorMode, state.selectedInventoryIndex]);

  const handleDragStart = useCallback(
    ({ active }: { active: { id: string | number } }) => {
      const id = String(active.id);
      const parsed = parseDragId(id);
      if (!parsed) return;

      if (parsed.prefix === "inv") {
        setActiveDragImageId(state.availableItems[parsed.index]?.id ?? null);
      } else if (parsed.prefix === "grid") {
        setActiveDragImageId(state.slots[parsed.index]);
      }
    },
    [state.availableItems, state.slots],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragImageId(null);
      if (!over) return;

      const activeParsed = parseDragId(String(active.id));
      const overParsed = parseDragId(String(over.id));
      const overId = String(over.id);

      if (activeParsed?.prefix === "inv" && overParsed?.prefix === "slot") {
        const item = state.availableItems[activeParsed.index];
        if (!item) return;
        dispatch({
          type: "DRAG_DROP",
          payload: {
            fromInventoryIndex: activeParsed.index,
            toSlotIndex: overParsed.index,
          },
        });
      } else if (activeParsed?.prefix === "grid" && overId === "inventory") {
        dispatch({
          type: "GRID_TO_INVENTORY",
          payload: { slotIndex: activeParsed.index },
        });
      } else if (
        activeParsed?.prefix === "grid" &&
        overParsed?.prefix === "slot"
      ) {
        dispatch({
          type: "GRID_TO_GRID",
          payload: {
            fromSlotIndex: activeParsed.index,
            toSlotIndex: overParsed.index,
          },
        });
      }
    },
    [state.availableItems],
  );

  if (!chunkSelectorOpen || !chunkSelectorData) return null;

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      autoScroll={{ threshold: { x: 0, y: 0.5 }, acceleration: 20 }}
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
            width: "min(1000px, 96vw)",
            maxHeight: "92vh",
            overflow: "auto",
            bgcolor: LayoutConfig.COLORS.PANEL_BG_CSS,
            borderRadius: "16px",
            border: `2px solid ${LayoutConfig.COLORS.INFO_TITLE}`,
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <Box>
              <Typography
                sx={{
                  color: LayoutConfig.COLORS.INFO_TITLE,
                  fontWeight: 700,
                  fontSize: "24px",
                  lineHeight: 1.2,
                  fontFamily: LayoutConfig.FONTS.TITLE,
                }}
              >
                Restauração de Obra
              </Typography>
              {feedbackMessage && (
                <Typography
                  sx={{
                    color: LayoutConfig.COLORS.UNAVAILABLE_RED,
                    fontSize: "14px",
                    mt: 0.5,
                  }}
                >
                  {feedbackMessage}
                </Typography>
              )}
            </Box>
            <Button
              variant="text"
              onClick={handleClose}
              sx={{
                color: "#f4eede",
                alignSelf: "flex-start",
                minWidth: 0,
                px: 1,
                fontSize: "20px",
                lineHeight: 1,
              }}
              aria-label="Fechar"
            >
              ×
            </Button>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "220px minmax(0, 1fr)",
                md: "240px minmax(0, 1fr)",
              },
              gap: 2,
              alignItems: "stretch",
            }}
          >
            <InventoryDropZone>
              <Typography
                sx={{
                  color: LayoutConfig.COLORS.INFO_TITLE,
                  fontWeight: 700,
                  fontSize: "16px",
                  mb: 0.5,
                  fontFamily: LayoutConfig.FONTS.TITLE,
                }}
              >
                Inventário
              </Typography>

              {state.availableItems.length === 0 ? (
                <Typography
                  sx={{
                    color: LayoutConfig.COLORS.HINT_GREY,
                    fontSize: "14px",
                  }}
                >
                  Nenhum pedaço disponível.
                </Typography>
              ) : (
                state.availableItems.map((item, index) => {
                  const isUsed = state.usedInventoryIndices.includes(index);
                  if (isUsed) return null;

                  const isSelected =
                    state.cursorMode === "inventory" &&
                    state.selectedInventoryIndex === index;
                  const isPicked = state.pickedItemIndex === index;

                  return (
                    <DraggableInventoryItem
                      key={item.id}
                      index={index}
                      item={item}
                      isSelected={isSelected}
                      isPicked={isPicked}
                      onSetRef={(node) => {
                        inventoryItemRefs.current[index] = node;
                      }}
                    />
                  );
                })
              )}
            </InventoryDropZone>

            <Paper
              square
              sx={{
                bgcolor: LayoutConfig.COLORS.PANEL_INNER_BG_CSS,
                borderRadius: "16px",
                p: 1.5,
                width: "100%",
              }}
            >
              <Typography
                sx={{
                  color: LayoutConfig.COLORS.INFO_TITLE,
                  fontWeight: 700,
                  fontSize: "16px",
                  mb: 1.25,
                  fontFamily: LayoutConfig.FONTS.TITLE,
                }}
              >
                Moldura
              </Typography>

              <Box
                ref={gridContainerRef}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "2px",
                  width: "100%",
                  maxWidth: 920,
                  mb: 1.5,
                }}
              >
                {state.slots.map((slot, idx) => {
                  const isSelected =
                    state.cursorMode === "grid" &&
                    state.selectedGridIndex === idx;
                  const isLocked = state.lockedSlots[idx];
                  const isJustPlaced = state.justPlacedSlots.includes(idx);
                  const isRejecting = rejectedSlotIndices.includes(idx);

                  return (
                    <DroppableGridSlot
                      key={`grid-${idx}`}
                      idx={idx}
                      slot={slot}
                      isSelected={isSelected}
                      isLocked={isLocked}
                      isJustPlaced={isJustPlaced}
                      isRejecting={isRejecting}
                    />
                  );
                })}
              </Box>

              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  sx={{
                    bgcolor:
                      state.cursorMode === "confirm"
                        ? LayoutConfig.COLORS.INFO_TITLE
                        : "#3a3b3b",
                    color:
                      state.cursorMode === "confirm"
                        ? LayoutConfig.COLORS.PANEL_BG_CSS
                        : "#f4eede",
                    fontWeight: 700,
                    borderRadius: "12px",
                    px: 2,
                    py: 1,
                    "&:hover": {
                      bgcolor:
                        state.cursorMode === "confirm" ? "#e6c577" : "#4a4b4b",
                    },
                  }}
                >
                  Confirmar
                </Button>
              </Box>
            </Paper>
          </Box>

          <Typography sx={{ color: "#a8a8a8", fontSize: "13px" }}>
            Aperte WASD ou setas para navegar | ENTER para selecionar e
            confirmar
          </Typography>
        </Paper>
      </Box>
      <DragOverlay dropAnimation={null}>
        {activeDragImageId !== null && (
          <Box
            component="img"
            src={getChunkImageSrc(activeDragImageId)}
            sx={{
              width: slotWidth,
              aspectRatio: "122 / 80",
              borderRadius: "8px",
              objectFit: "cover",
              imageRendering: "pixelated",
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
