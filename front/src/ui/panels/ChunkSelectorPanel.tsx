"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Box, Button, Paper, Typography } from "@mui/material";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { LEVEL_ASSETS } from "@/game/data/LevelConfig";
import {
  type ChunkArrowDir,
  type ChunkCursorMode,
  ensureValidGridIndex,
  hasAnyFreeGridSlot,
  initChunkNavState,
  normalizeFilledSlots,
  reduceChunkNavOnArrow,
} from "@/game/objects/ui/chunkSelectorNavigation";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";

type ChunkItem = { id: string; name: string };

type ChunkSelectorMachineState = {
  cursorMode: ChunkCursorMode;
  selectedInventoryIndex: number;
  selectedGridIndex: number;
  pickedItemIndex: number | null;
  availableItems: ChunkItem[];
  slots: (string | null)[];
  usedInventoryIndices: (number | null)[];
  lockedSlots: boolean[];
};

type ChunkSelectorAction =
  | {
      type: "RESET";
      payload: {
        availableItems: ChunkItem[];
        filledSlots: (string | null)[];
      };
    }
  | { type: "MOVE"; payload: ChunkArrowDir }
  | { type: "CONFIRM" }
  | { type: "CANCEL_PICK" }
  | {
      type: "DRAG_DROP";
      payload: { fromInventoryIndex: number; toSlotIndex: number };
    };

const chunkAssetsByKey: Map<string, string> = new Map(
  LEVEL_ASSETS.CHUNKS.map((asset) => [asset.key, `/assets/${asset.path}`]),
);

function buildInitialState(
  availableItems: ChunkItem[],
  filledSlots: (string | null)[],
): ChunkSelectorMachineState {
  const slots = normalizeFilledSlots(filledSlots);
  const lockedSlots = slots.map((slot) => Boolean(slot));

  const nav = initChunkNavState({
    inventoryCount: availableItems.length,
    lockedSlots,
  });

  return {
    cursorMode: nav.cursorMode,
    selectedInventoryIndex: nav.selectedInventoryIndex,
    selectedGridIndex: nav.selectedGridIndex,
    pickedItemIndex: null,
    availableItems,
    slots,
    usedInventoryIndices: [null, null, null, null],
    lockedSlots,
  };
}

function reducer(
  state: ChunkSelectorMachineState,
  action: ChunkSelectorAction,
): ChunkSelectorMachineState {
  if (action.type === "RESET") {
    return buildInitialState(
      action.payload.availableItems,
      action.payload.filledSlots,
    );
  }

  if (action.type === "MOVE") {
    const next = reduceChunkNavOnArrow(
      {
        cursorMode: state.cursorMode,
        selectedInventoryIndex: state.selectedInventoryIndex,
        selectedGridIndex: state.selectedGridIndex,
      },
      {
        inventoryCount: state.availableItems.length,
        lockedSlots: state.lockedSlots,
      },
      action.payload,
    );

    return {
      ...state,
      cursorMode: next.cursorMode,
      selectedInventoryIndex: next.selectedInventoryIndex,
      selectedGridIndex: next.selectedGridIndex,
    };
  }

  if (action.type === "CANCEL_PICK") {
    return {
      ...state,
      pickedItemIndex: null,
      cursorMode: "inventory",
    };
  }

  if (action.type === "CONFIRM") {
    if (state.cursorMode === "inventory") {
      if (state.availableItems.length <= 0) return state;

      if (!hasAnyFreeGridSlot(state.lockedSlots)) {
        return {
          ...state,
          cursorMode: "confirm",
          pickedItemIndex: null,
        };
      }

      const isAlreadyUsed = state.usedInventoryIndices.includes(
        state.selectedInventoryIndex,
      );
      if (isAlreadyUsed) return state;

      return {
        ...state,
        pickedItemIndex: state.selectedInventoryIndex,
        cursorMode: "grid",
        selectedGridIndex: ensureValidGridIndex(
          state.selectedGridIndex,
          state.lockedSlots,
        ),
      };
    }

    if (state.cursorMode === "grid") {
      const gridIndex = ensureValidGridIndex(
        state.selectedGridIndex,
        state.lockedSlots,
      );
      if (state.lockedSlots[gridIndex]) return state;

      const nextSlots = [...state.slots];
      const nextUsed = [...state.usedInventoryIndices];

      if (state.pickedItemIndex !== null) {
        const item = state.availableItems[state.pickedItemIndex];
        if (!item) return state;

        nextSlots[gridIndex] = item.id;
        nextUsed[gridIndex] = state.pickedItemIndex;

        return {
          ...state,
          slots: nextSlots,
          usedInventoryIndices: nextUsed,
          pickedItemIndex: null,
          cursorMode: "inventory",
          selectedGridIndex: gridIndex,
        };
      }

      nextSlots[gridIndex] = null;
      nextUsed[gridIndex] = null;

      return {
        ...state,
        slots: nextSlots,
        usedInventoryIndices: nextUsed,
        selectedGridIndex: gridIndex,
      };
    }

    return state;
  }

  if (action.type === "DRAG_DROP") {
    const { fromInventoryIndex, toSlotIndex } = action.payload;
    if (state.lockedSlots[toSlotIndex]) return state;
    if (state.usedInventoryIndices[toSlotIndex] === fromInventoryIndex)
      return state;

    const item = state.availableItems[fromInventoryIndex];
    if (!item) return state;

    const nextSlots = [...state.slots];
    const nextUsed = [...state.usedInventoryIndices];

    // If this inventory item was already placed in another slot, clear it there first
    const previousSlot = nextUsed.indexOf(fromInventoryIndex);
    if (previousSlot !== -1) {
      nextSlots[previousSlot] = null;
      nextUsed[previousSlot] = null;
    }

    nextSlots[toSlotIndex] = item.id;
    nextUsed[toSlotIndex] = fromInventoryIndex;

    return {
      ...state,
      slots: nextSlots,
      usedInventoryIndices: nextUsed,
      pickedItemIndex: null,
      cursorMode: "inventory",
    };
  }

  return state;
}

function getChunkImageSrc(id: string): string {
  return chunkAssetsByKey.get(id) ?? `/assets/artworks/photos/${id}.png`;
}

function DraggableInventoryItem({
  index,
  item,
  isSelected,
  isPicked,
  isUsed,
  onSetRef,
}: {
  index: number;
  item: ChunkItem;
  isSelected: boolean;
  isPicked: boolean;
  isUsed: boolean;
  onSetRef: (node: HTMLDivElement | null) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(index),
    disabled: isUsed,
  });

  return (
    <Box
      ref={(node: HTMLDivElement | null) => {
        setNodeRef(node);
        onSetRef(node);
      }}
      {...listeners}
      {...attributes}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: isUsed ? "default" : "grab",
        userSelect: "none",
        bgcolor: isSelected
          ? "rgba(217, 173, 86, 0.24)"
          : isPicked
            ? "rgba(255,255,255,0.08)"
            : "#1c1d1d",
        borderRadius: "12px",
        border: isSelected
          ? "2px solid #d9ad56"
          : isUsed
            ? "1px solid #2f2f2f"
            : "1px solid #3f4040",
        p: 0.75,
        opacity: isDragging ? 0.3 : isUsed && !isSelected ? 0.5 : 1,
      }}
    >
      <Box
        component="img"
        src={getChunkImageSrc(item.id)}
        draggable={false}
        sx={{
          width: "100%",
          maxWidth: 170,
          aspectRatio: "122 / 80",
          borderRadius: "8px",
          objectFit: "cover",
          bgcolor: "#111",
        }}
      />
    </Box>
  );
}

function DroppableGridSlot({
  idx,
  slot,
  isSelected,
  isLocked,
}: {
  idx: number;
  slot: string | null;
  isSelected: boolean;
  isLocked: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: String(idx),
    disabled: isLocked,
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        width: "100%",
        aspectRatio: "122 / 80",
        bgcolor: "#111",
        border: isLocked
          ? "2px solid #4b8b5f"
          : isOver || isSelected
            ? "3px solid #d9ad56"
            : "2px solid #454646",
        borderRadius: "10px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {slot ? (
        <Box
          component="img"
          src={getChunkImageSrc(slot)}
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <Typography sx={{ color: "#5f6060", fontWeight: 700 }}>?</Typography>
      )}
      {isLocked && (
        <Box
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: "#8dd39d",
          }}
        />
      )}
    </Box>
  );
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
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);

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

  if (!chunkSelectorOpen || !chunkSelectorData) return null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragIndex(null);
    if (!over) return;
    dispatch({
      type: "DRAG_DROP",
      payload: {
        fromInventoryIndex: Number(active.id),
        toSlotIndex: Number(over.id),
      },
    });
  }

  return (
    <DndContext
      onDragStart={({ active }) => setActiveDragIndex(Number(active.id))}
      onDragEnd={handleDragEnd}
    >
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
            border: "2px solid #d9ad56",
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
                  color: "#d9ad56",
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
            <Paper
              square
              sx={{
                bgcolor: "#161717",
                borderRadius: "16px",
                p: 1.5,
                display: "flex",
                flexDirection: "column",
                gap: 1,
                height: "100%",
                minHeight: 0,
                overflowY: "auto",
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": {
                  display: "none",
                },
              }}
            >
              <Typography
                sx={{
                  color: "#d9ad56",
                  fontWeight: 700,
                  fontSize: "16px",
                  mb: 0.5,
                }}
              >
                Inventário
              </Typography>

              {state.availableItems.length === 0 ? (
                <Typography sx={{ color: "#888", fontSize: "14px" }}>
                  Nenhum pedaço disponível.
                </Typography>
              ) : (
                state.availableItems.map((item, index) => {
                  const isSelected =
                    state.cursorMode === "inventory" &&
                    state.selectedInventoryIndex === index;
                  const isPicked = state.pickedItemIndex === index;
                  const isUsed = state.usedInventoryIndices.includes(index);

                  return (
                    <DraggableInventoryItem
                      key={item.id}
                      index={index}
                      item={item}
                      isSelected={isSelected}
                      isPicked={isPicked}
                      isUsed={isUsed}
                      onSetRef={(node) => {
                        inventoryItemRefs.current[index] = node;
                      }}
                    />
                  );
                })
              )}
            </Paper>

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
                  color: "#d9ad56",
                  fontWeight: 700,
                  fontSize: "16px",
                  mb: 1.25,
                }}
              >
                Moldura
              </Typography>

              <Box
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
                      state.cursorMode === "confirm" ? "#d9ad56" : "#3a3b3b",
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
        {activeDragIndex !== null &&
          state.availableItems[activeDragIndex] != null && (
            <Box
              component="img"
              src={getChunkImageSrc(state.availableItems[activeDragIndex].id)}
              sx={{
                width: 170,
                aspectRatio: "122 / 80",
                borderRadius: "8px",
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
