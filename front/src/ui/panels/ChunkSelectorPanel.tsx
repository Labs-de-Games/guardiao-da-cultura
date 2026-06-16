"use client";

import { Box, Button, Paper, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useReducer } from "react";

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
  | { type: "CANCEL_PICK" };

const SLOT_WIDTH = 200;
const SLOT_HEIGHT = 130;

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

  return state;
}

function getChunkImageSrc(id: string): string {
  return chunkAssetsByKey.get(id) ?? `/assets/artworks/photos/${id}.png`;
}

export function ChunkSelectorPanel() {
  const chunkSelectorData = useGameUIStore((s) => s.chunkSelectorData);
  const chunkSelectorOpen = useGameUIStore((s) => s.chunkSelectorOpen);
  const closeChunkSelector = useGameUIStore((s) => s.closeChunkSelector);

  const [state, dispatch] = useReducer(
    reducer,
    buildInitialState([], [null, null, null, null]),
  );

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
      const key = event.key;
      if (
        key !== "ArrowUp" &&
        key !== "ArrowDown" &&
        key !== "ArrowLeft" &&
        key !== "ArrowRight" &&
        key !== "Enter" &&
        key !== "Escape"
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (key === "Escape") {
        if (state.pickedItemIndex !== null) {
          dispatch({ type: "CANCEL_PICK" });
          return;
        }
        handleClose();
        return;
      }

      if (key === "Enter") {
        if (state.cursorMode === "confirm") {
          handleSubmit();
          return;
        }

        dispatch({ type: "CONFIRM" });
        return;
      }

      const directionByKey: Record<string, ChunkArrowDir> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };

      const direction = directionByKey[key];
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

  const allEditableSlotsFilled = useMemo(() => {
    for (let i = 0; i < state.slots.length; i++) {
      if (state.lockedSlots[i]) continue;
      if (!state.slots[i]) return false;
    }
    return true;
  }, [state.lockedSlots, state.slots]);

  if (!chunkSelectorOpen || !chunkSelectorData) return null;

  return (
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
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
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
              Setas para navegar • Enter para selecionar/confirmar • Esc para
              sair
            </Typography>
          </Box>
          <Button
            variant="text"
            onClick={handleClose}
            sx={{ color: "#f4eede", alignSelf: "flex-start" }}
          >
            Fechar (Esc)
          </Button>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(260px, 320px) 1fr",
            gap: 2,
            alignItems: "start",
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
              maxHeight: "55vh",
              overflowY: "auto",
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
                Sem pedaços disponíveis.
              </Typography>
            ) : (
              state.availableItems.map((item, index) => {
                const isSelected =
                  state.cursorMode === "inventory" &&
                  state.selectedInventoryIndex === index;
                const isPicked = state.pickedItemIndex === index;
                const isUsed = state.usedInventoryIndices.includes(index);

                return (
                  <Box
                    key={item.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
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
                      p: 1,
                      opacity: isUsed && !isSelected ? 0.5 : 1,
                    }}
                  >
                    <Box
                      component="img"
                      src={getChunkImageSrc(item.id)}
                      alt={item.name}
                      sx={{
                        width: 88,
                        height: 58,
                        borderRadius: "8px",
                        objectFit: "cover",
                        bgcolor: "#111",
                      }}
                    />
                    <Typography
                      sx={{
                        color: "#f4eede",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      {item.name}
                    </Typography>
                  </Box>
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
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "2px",
                width: "fit-content",
                mb: 1.5,
              }}
            >
              {state.slots.map((slot, idx) => {
                const isSelected =
                  state.cursorMode === "grid" &&
                  state.selectedGridIndex === idx;
                const isLocked = state.lockedSlots[idx];

                return (
                  <Box
                    key={`grid-${idx}`}
                    sx={{
                      width: SLOT_WIDTH,
                      height: SLOT_HEIGHT,
                      bgcolor: "#111",
                      border: isLocked
                        ? "2px solid #4b8b5f"
                        : isSelected
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
                        alt={`Pedaço ${idx + 1}`}
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <Typography sx={{ color: "#5f6060", fontWeight: 700 }}>
                        Vazio
                      </Typography>
                    )}

                    {isLocked && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          px: 0.75,
                          py: 0.2,
                          bgcolor: "rgba(75,139,95,0.2)",
                          borderRadius: "8px",
                        }}
                      >
                        <Typography
                          sx={{
                            color: "#8dd39d",
                            fontSize: "10px",
                            fontWeight: 700,
                          }}
                        >
                          FIXO
                        </Typography>
                      </Box>
                    )}
                  </Box>
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
                  color: state.cursorMode === "confirm" ? "#1c1d1d" : "#f4eede",
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
                Confirmar (Enter)
              </Button>
            </Box>
          </Paper>
        </Box>
      </Paper>
    </Box>
  );
}
