"use client";

import { DndContext, type DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { Box, Button, Paper, Typography } from "@mui/material";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { LayoutConfig } from "@/game/constants/LayoutConfig";
import type { ChunkArrowDir } from "@/game/objects/ui/chunkSelectorNavigation";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";

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

  useEffect(() => {
    if (!chunkSelectorOpen || !chunkSelectorData) return;

    dispatch({
      type: "RESET",
      payload: {
        availableItems: chunkSelectorData.availableItems,
        filledSlots: chunkSelectorData.filledSlots,
      },
    });
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

  const handleClose = useCallback(() => {
    EventBus.emit("ui:chunk-selector-close", undefined);
    closeChunkSelector();
  }, [closeChunkSelector]);

  const handleSubmit = useCallback(() => {
    if (!chunkSelectorData) return;

    EventBus.emit("ui:chunk-selector-submit", {
      instanceId: chunkSelectorData.instanceId,
      placedItems: state.slots,
    });

    handleClose();
  }, [chunkSelectorData, handleClose, state.slots]);

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

  const allEditableSlotsFilled = useMemo(() => {
    for (let i = 0; i < state.slots.length; i++) {
      if (state.lockedSlots[i]) continue;
      if (!state.slots[i]) return false;
    }
    return true;
  }, [state.lockedSlots, state.slots]);

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

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragImageId(null);
    if (!over) return;

    const activeParsed = parseDragId(String(active.id));
    const overParsed = parseDragId(String(over.id));
    const overId = String(over.id);

    if (activeParsed?.prefix === "inv" && overParsed?.prefix === "slot") {
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
  }, []);

  if (!chunkSelectorOpen || !chunkSelectorData) return null;

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 40,
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
            overflow: "hidden",
            bgcolor: "#1c1d1d",
            borderRadius: "16px",
            border: `2px solid ${LayoutConfig.COLORS.INFO_TITLE}`,
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Box
            sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
          >
            <Box>
              <Typography
                sx={{
                  color: LayoutConfig.COLORS.INFO_TITLE,
                  fontWeight: 700,
                  fontSize: "24px",
                  lineHeight: 1.2,
                }}
              >
                Restauração de Obra
              </Typography>
              <Typography sx={{ color: "#a8a8a8", fontSize: "14px", mt: 0.5 }}>
                Aperte SETAS para navegar • ENTER para selecionar e confirmar
              </Typography>
            </Box>
            <Button
              variant="text"
              onClick={handleClose}
              sx={{ color: "#f4eede", alignSelf: "flex-start" }}
            >
              Aperte ESC para fechar
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
                bgcolor: "#161717",
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

                  return (
                    <DroppableGridSlot
                      key={`grid-${idx}`}
                      idx={idx}
                      slot={slot}
                      isSelected={isSelected}
                      isLocked={isLocked}
                    />
                  );
                })}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography sx={{ color: "#a8a8a8", fontSize: "13px" }}>
                  {allEditableSlotsFilled
                    ? "Todos os espaços editáveis foram preenchidos."
                    : "Preencha os espaços e confirme."}
                </Typography>

                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  sx={{
                    bgcolor:
                      state.cursorMode === "confirm"
                        ? LayoutConfig.COLORS.INFO_TITLE
                        : "#3a3b3b",
                    color:
                      state.cursorMode === "confirm" ? "#1c1d1d" : "#f4eede",
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
