"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import { Box, Button, IconButton, Paper, Typography } from "@mui/material";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { EventBus } from "@/shared/events/event-bus";
import { useNotePlayback } from "@/ui/hooks/useNotePlayback";
import { useSound } from "@/ui/hooks/useSound";
import { DraggableNoteItem } from "@/ui/panels/DraggableNoteItem";
import {
  DroppableSequenceSlot,
  SEQUENCE_SLOT_BASE_SX,
} from "@/ui/panels/DroppableSequenceSlot";
import { InventoryDropZone } from "@/ui/panels/InventoryDropZone";
import {
  buildInitialState,
  reducer,
  unlockedBlankIndices,
  visibleTrayOrder,
} from "@/ui/panels/song-sequence-types";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS, UI_LAYERS } from "@/ui/theme/tokens";

const REJECT_DURATION_MS = 400;

type DragPrefix = "tray" | "slot";

function parseDragId(id: string): { prefix: DragPrefix; key: string } | null {
  if (id.startsWith("tray-")) return { prefix: "tray", key: id.slice(5) };
  if (id.startsWith("slot-")) return { prefix: "slot", key: id.slice(5) };
  return null;
}

export function SongSequencePanel() {
  const songSequenceOpen = useGameUIStore((s) => s.songSequenceOpen);
  const songSequenceData = useGameUIStore((s) => s.songSequenceData);
  const closeSongSequence = useGameUIStore((s) => s.closeSongSequence);

  const { playModalOpen, playModalClose } = useSound();
  const { playNote, playSequence, cancel, isPlaying, playingIndex } =
    useNotePlayback();

  const [state, dispatch] = useReducer(reducer, songSequenceData, (data) =>
    data
      ? buildInitialState(data)
      : buildInitialState({
          instanceId: "",
          slots: [],
          tray: [],
          blankIndices: [],
          board: {},
          lockedSlots: [],
        }),
  );

  useEffect(() => {
    if (!songSequenceOpen || !songSequenceData) return;
    dispatch({ type: "RESET", payload: songSequenceData });
  }, [songSequenceOpen, songSequenceData]);

  useEffect(() => {
    if (!songSequenceOpen) return;

    EventBus.emit("game:pause-requested", { reason: "song-sequence" });
    playModalOpen();

    return () => {
      EventBus.emit("game:resume-requested", { reason: "song-sequence" });
      playModalClose();
      cancel();
      const canvas = document.querySelector("canvas");
      canvas?.focus();
    };
  }, [songSequenceOpen, playModalOpen, playModalClose, cancel]);

  const handleClose = useCallback(() => {
    if (songSequenceData) {
      EventBus.emit("ui:song-sequence-close", {
        instanceId: songSequenceData.instanceId,
        board: state.board,
        lockedSlots: state.lockedSlots,
      });
    }
    closeSongSequence();
  }, [songSequenceData, state.board, state.lockedSlots, closeSongSequence]);

  const [rejectingSlots, setRejectingSlots] = useState<number[]>([]);

  const triggerReject = useCallback((indices: number[]) => {
    if (indices.length === 0) return;
    setRejectingSlots(indices);
    setTimeout(() => setRejectingSlots([]), REJECT_DURATION_MS);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!songSequenceData || isPlaying) return;

    const wrongIndices: number[] = [];
    const newlyCorrectIndices: number[] = [];

    for (const slotIndex of state.blankIndices) {
      if (state.lockedSlots.includes(slotIndex)) continue;
      const occupantId = state.board[slotIndex];
      const note = occupantId ? state.trayNoteById[occupantId] : null;
      const expected = songSequenceData.slots[slotIndex]?.note ?? null;
      if (note && note === expected) {
        newlyCorrectIndices.push(slotIndex);
      } else {
        wrongIndices.push(slotIndex);
      }
    }

    if (newlyCorrectIndices.length > 0) {
      dispatch({
        type: "LOCK_SLOTS",
        payload: { indices: newlyCorrectIndices },
      });
    }

    if (wrongIndices.length > 0) {
      triggerReject(wrongIndices);
      return;
    }

    const allLocked =
      state.lockedSlots.length + newlyCorrectIndices.length ===
      state.blankIndices.length;

    if (allLocked) {
      EventBus.emit("ui:song-sequence-submit", {
        instanceId: songSequenceData.instanceId,
      });
      handleClose();
    }
  }, [songSequenceData, state, isPlaying, triggerReject, handleClose]);

  const playButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const trayButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const [slotWidth, setSlotWidth] = useState(48);

  useEffect(() => {
    if (!songSequenceOpen) return;
    const el = gridContainerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      const columns = songSequenceData?.slots.length ?? 12;
      const w = entry.contentRect.width;
      setSlotWidth(Math.max(w / columns - 4, 24));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [songSequenceOpen, songSequenceData]);

  // Moves real DOM focus to match the keyboard-nav model for Play/Confirm/
  // tray buttons, so the browser's own focus-visible ring shows — no custom
  // outline. The "sequence" row has no natively-focusable target (the slots
  // are plain boxes, not buttons), so it's highlighted via `isFocused`
  // instead — see the sequence grid render below.
  useEffect(() => {
    if (!songSequenceOpen) return;
    if (state.focusRow === "play") {
      playButtonRef.current?.focus();
    } else if (state.focusRow === "confirm") {
      confirmButtonRef.current?.focus();
    } else if (state.focusRow === "tray") {
      const visible = visibleTrayOrder(state);
      const id = visible[state.trayFocusIndex];
      if (id !== undefined) {
        trayButtonRefs.current[id]?.focus();
      }
    }
  }, [songSequenceOpen, state]);

  const activateTrayItem = useCallback(
    (id: string) => {
      if (isPlaying) return;
      const note = state.trayNoteById[id];
      if (note) playNote(note);
      dispatch({ type: "GRIP_TRAY", payload: { id } });
    },
    [isPlaying, playNote, state.trayNoteById],
  );

  const activateSequenceSlot = useCallback(
    (slotIndex: number) => {
      if (isPlaying) return;
      if (state.lockedSlots.includes(slotIndex)) return;
      if (state.grippedId !== null) {
        dispatch({ type: "PLACE_ON_SLOT", payload: { slotIndex } });
      } else if (state.board[slotIndex]) {
        dispatch({ type: "PICKUP_FROM_SLOT", payload: { slotIndex } });
      }
    },
    [isPlaying, state.grippedId, state.lockedSlots, state.board],
  );

  // Keyboard handler reads through this ref (kept fresh every render)
  // instead of closing over `state`/callbacks directly, so the window
  // listener is registered once per panel open instead of on every
  // dispatch.
  const latestRef = useRef({
    state,
    isPlaying,
    songSequenceData,
    handleClose,
    handleConfirm,
    playSequence,
    cancel,
    activateSequenceSlot,
    activateTrayItem,
  });
  latestRef.current = {
    state,
    isPlaying,
    songSequenceData,
    handleClose,
    handleConfirm,
    playSequence,
    cancel,
    activateSequenceSlot,
    activateTrayItem,
  };

  useEffect(() => {
    if (!songSequenceOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const {
        state,
        isPlaying,
        songSequenceData,
        handleClose,
        handleConfirm,
        playSequence,
        cancel,
        activateSequenceSlot,
        activateTrayItem,
      } = latestRef.current;
      if (!songSequenceData) return;

      const key = e.key.toLowerCase();

      if (key === "escape") {
        e.preventDefault();
        if (state.grippedId !== null) {
          dispatch({ type: "CANCEL_GRIP" });
        } else {
          handleClose();
        }
        return;
      }

      if (key === "arrowup" || key === "w") {
        e.preventDefault();
        dispatch({ type: "MOVE", payload: "up" });
        return;
      }
      if (key === "arrowdown" || key === "s") {
        e.preventDefault();
        dispatch({ type: "MOVE", payload: "down" });
        return;
      }
      if (key === "arrowleft" || key === "a") {
        e.preventDefault();
        dispatch({ type: "MOVE", payload: "left" });
        return;
      }
      if (key === "arrowright" || key === "d") {
        e.preventDefault();
        dispatch({ type: "MOVE", payload: "right" });
        return;
      }

      if (key === "enter" || key === " ") {
        e.preventDefault();

        if (state.focusRow === "play") {
          if (isPlaying) cancel();
          else playSequence(songSequenceData.slots);
          return;
        }
        if (isPlaying) return;

        if (state.focusRow === "sequence") {
          const unlocked = unlockedBlankIndices(state);
          const slotIndex = unlocked[state.sequenceFocusIndex];
          if (slotIndex !== undefined) activateSequenceSlot(slotIndex);
        } else if (state.focusRow === "tray") {
          const visible = visibleTrayOrder(state);
          const id = visible[state.trayFocusIndex];
          if (id !== undefined) activateTrayItem(id);
        } else {
          handleConfirm();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [songSequenceOpen]);

  // A plain click has zero pointer movement — require a small drag distance
  // before a drag activates, so click handlers (note preview) still fire.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const [activeDragNote, setActiveDragNote] = useState<string | null>(null);

  const handleDragStart = useCallback(
    ({ active }: { active: { id: string | number } }) => {
      const parsed = parseDragId(String(active.id));
      if (!parsed) return;
      if (parsed.prefix === "tray") {
        setActiveDragNote(state.trayNoteById[parsed.key] ?? null);
      } else {
        const occupantId = state.board[Number(parsed.key)];
        setActiveDragNote(occupantId ? state.trayNoteById[occupantId] : null);
      }
    },
    [state.trayNoteById, state.board],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragNote(null);
      if (!over || isPlaying) return;

      const activeParsed = parseDragId(String(active.id));
      const overId = String(over.id);
      const overParsed = parseDragId(overId);
      if (!activeParsed) return;

      if (activeParsed.prefix === "tray" && overParsed?.prefix === "slot") {
        dispatch({
          type: "DRAG_TRAY_TO_SLOT",
          payload: {
            trayId: activeParsed.key,
            slotIndex: Number(overParsed.key),
          },
        });
      } else if (activeParsed.prefix === "slot" && overId === "inventory") {
        dispatch({
          type: "DRAG_SLOT_TO_TRAY",
          payload: { slotIndex: Number(activeParsed.key) },
        });
      } else if (
        activeParsed.prefix === "slot" &&
        overParsed?.prefix === "slot"
      ) {
        dispatch({
          type: "DRAG_SLOT_TO_SLOT",
          payload: {
            fromSlotIndex: Number(activeParsed.key),
            toSlotIndex: Number(overParsed.key),
          },
        });
      }
    },
    [isPlaying],
  );

  if (!songSequenceOpen || !songSequenceData) return null;

  const visibleTray = visibleTrayOrder(state);
  const focusedSequenceSlot =
    state.focusRow === "sequence"
      ? unlockedBlankIndices(state)[state.sequenceFocusIndex]
      : undefined;

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
              Sanfona do Forró
            </Typography>
            <Typography
              sx={{
                color: GAME_UI_TOKENS.colors.textPrimary,
                fontFamily: GAME_UI_TOKENS.fonts.body,
                fontSize: "14px",
                mt: 0.75,
              }}
            >
              Ouça a sequência, complete as notas que faltam e confirme.
            </Typography>
          </Box>

          <Button
            ref={playButtonRef}
            variant="contained"
            startIcon={isPlaying ? <StopIcon /> : <PlayArrowIcon />}
            onClick={() => {
              dispatch({ type: "SET_FOCUS_ROW", payload: "play" });
              if (isPlaying) cancel();
              else playSequence(songSequenceData.slots);
            }}
            sx={{
              alignSelf: "flex-start",
              bgcolor: GAME_UI_TOKENS.colors.accentGold,
              color: LayoutConfig.COLORS.MAP_BG_CSS,
              fontFamily: GAME_UI_TOKENS.fonts.body,
              fontWeight: 700,
              fontSize: "12px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              borderRadius: `${GAME_UI_TOKENS.radius.small}px`,
              "&:hover": { bgcolor: GAME_UI_TOKENS.colors.accentGoldHover },
            }}
          >
            {isPlaying ? "Parar sequência" : "Tocar sequência"}
          </Button>

          <Box sx={{ overflowX: "auto" }}>
            <Box
              ref={gridContainerRef}
              sx={{
                display: "grid",
                gridTemplateColumns: `repeat(${songSequenceData.slots.length}, minmax(28px, 1fr))`,
                gap: 0.5,
              }}
            >
              {songSequenceData.slots.map((slot, idx) => {
                if (state.blankIndices.includes(idx)) {
                  const occupantId = state.board[idx];
                  const note = occupantId
                    ? state.trayNoteById[occupantId]
                    : null;
                  return (
                    <DroppableSequenceSlot
                      key={`slot-${idx}`}
                      slotIndex={idx}
                      note={note}
                      isLocked={state.lockedSlots.includes(idx)}
                      isRejecting={rejectingSlots.includes(idx)}
                      isPlaying={idx === playingIndex}
                      isFocused={idx === focusedSequenceSlot}
                      onActivate={() => {
                        dispatch({
                          type: "FOCUS_SEQUENCE_SLOT",
                          payload: { slotIndex: idx },
                        });
                        activateSequenceSlot(idx);
                      }}
                    />
                  );
                }

                return (
                  <Box
                    key={`slot-${idx}`}
                    sx={{
                      ...SEQUENCE_SLOT_BASE_SX,
                      bgcolor: GAME_UI_TOKENS.colors.bgTertiary,
                      border:
                        idx === playingIndex
                          ? `2px solid ${GAME_UI_TOKENS.colors.accentGold}`
                          : "2px solid transparent",
                    }}
                  >
                    {slot.note ?? (
                      <Box
                        component="img"
                        src="/assets/misc/rest.png"
                        alt="Pausa"
                        sx={{
                          width: "60%",
                          height: "60%",
                          objectFit: "contain",
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>

          <Typography
            sx={{
              color: GAME_UI_TOKENS.colors.textSecondary,
              fontFamily: GAME_UI_TOKENS.fonts.body,
              fontSize: "12px",
              mt: 1,
            }}
          >
            Notas disponíveis
          </Typography>

          <InventoryDropZone minHeight={120} centerContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(6, minmax(0, 70px))",
                gap: 1,
                justifyContent: "center",
              }}
            >
              {visibleTray.map((id) => (
                <DraggableNoteItem
                  key={id}
                  id={id}
                  note={state.trayNoteById[id]}
                  isGripped={state.grippedId === id}
                  onSetRef={(node) => {
                    trayButtonRefs.current[id] = node;
                  }}
                  onActivate={() => {
                    dispatch({ type: "FOCUS_TRAY_ITEM", payload: { id } });
                    activateTrayItem(id);
                  }}
                />
              ))}
            </Box>
          </InventoryDropZone>

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              ref={confirmButtonRef}
              variant="contained"
              onClick={() => {
                dispatch({ type: "SET_FOCUS_ROW", payload: "confirm" });
                handleConfirm();
              }}
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
        {activeDragNote !== null && (
          <Box
            sx={{
              width: slotWidth,
              aspectRatio: "1",
              borderRadius: "10px",
              bgcolor: GAME_UI_TOKENS.colors.bgTertiary,
              border: `2px solid ${GAME_UI_TOKENS.colors.accentGold}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: GAME_UI_TOKENS.colors.textPrimary,
              fontFamily: GAME_UI_TOKENS.fonts.body,
              fontWeight: 700,
              fontSize: "11px",
              opacity: 0.9,
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              pointerEvents: "none",
            }}
          >
            {activeDragNote}
          </Box>
        )}
      </DragOverlay>
    </DndContext>
  );
}
