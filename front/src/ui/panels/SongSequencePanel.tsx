"use client";

import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { Box, Button, IconButton, Paper, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { EventBus } from "@/shared/events/event-bus";
import { useNotePlayback } from "@/ui/hooks/useNotePlayback";
import { useSound } from "@/ui/hooks/useSound";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS, UI_LAYERS } from "@/ui/theme/tokens";

export function SongSequencePanel() {
  const songSequenceOpen = useGameUIStore((s) => s.songSequenceOpen);
  const songSequenceData = useGameUIStore((s) => s.songSequenceData);
  const closeSongSequence = useGameUIStore((s) => s.closeSongSequence);

  const { playModalOpen, playModalClose } = useSound();
  const { playNote, playSequence, cancel, isPlaying, playingIndex } =
    useNotePlayback();

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
    EventBus.emit("ui:song-sequence-close", undefined);
    closeSongSequence();
  }, [closeSongSequence]);

  type FocusRow = "play" | "tray" | "confirm";
  const FOCUS_ROWS: FocusRow[] = ["play", "tray", "confirm"];
  const [focusedRow, setFocusedRow] = useState<FocusRow>("play");
  const [trayIndex, setTrayIndex] = useState(0);
  const playButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const trayButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!songSequenceOpen) return;
    setFocusedRow("play");
    setTrayIndex(0);
  }, [songSequenceOpen]);

  // Moves real DOM focus to match the keyboard-nav model, so the browser's
  // own focus-visible ring (MUI Button default) shows — no custom outline.
  useEffect(() => {
    if (!songSequenceOpen) return;
    if (focusedRow === "play") playButtonRef.current?.focus();
    else if (focusedRow === "confirm") confirmButtonRef.current?.focus();
    else trayButtonRefs.current[trayIndex]?.focus();
  }, [songSequenceOpen, focusedRow, trayIndex]);

  useEffect(() => {
    if (!songSequenceOpen || !songSequenceData) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (key === "escape") {
        e.preventDefault();
        handleClose();
        return;
      }

      const rowIndex = FOCUS_ROWS.indexOf(focusedRow);

      if (key === "arrowup" || key === "w") {
        e.preventDefault();
        setFocusedRow(FOCUS_ROWS[Math.max(rowIndex - 1, 0)]);
        return;
      }
      if (key === "arrowdown" || key === "s") {
        e.preventDefault();
        setFocusedRow(
          FOCUS_ROWS[Math.min(rowIndex + 1, FOCUS_ROWS.length - 1)],
        );
        return;
      }
      if (key === "arrowleft" || key === "a") {
        if (focusedRow === "tray") {
          e.preventDefault();
          setTrayIndex((i) => Math.max(i - 1, 0));
        }
        return;
      }
      if (key === "arrowright" || key === "d") {
        if (focusedRow === "tray") {
          e.preventDefault();
          setTrayIndex((i) =>
            Math.min(i + 1, songSequenceData.tray.length - 1),
          );
        }
        return;
      }
      if (key === "enter" || key === " ") {
        e.preventDefault();
        if (focusedRow === "play") {
          if (!isPlaying) playSequence(songSequenceData.slots);
        } else if (focusedRow === "tray") {
          playNote(songSequenceData.tray[trayIndex]);
        } else {
          handleClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    songSequenceOpen,
    songSequenceData,
    handleClose,
    focusedRow,
    trayIndex,
    isPlaying,
    playSequence,
    playNote,
  ]);

  if (!songSequenceOpen || !songSequenceData) return null;

  return (
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
            Ouça a sequência tocando o botão abaixo, ou clique em cada nota para
            escutá-la.
          </Typography>
        </Box>

        <Button
          ref={playButtonRef}
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={() => {
            setFocusedRow("play");
            playSequence(songSequenceData.slots);
          }}
          disabled={isPlaying}
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
          {isPlaying ? "Tocando..." : "Tocar sequência"}
        </Button>

        <Box sx={{ overflowX: "auto" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(12, minmax(28px, 1fr))",
              gap: 0.5,
            }}
          >
            {songSequenceData.slots.map((slot, idx) => (
              <Box
                key={`slot-${idx}`}
                sx={{
                  aspectRatio: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "10px",
                  bgcolor: GAME_UI_TOKENS.colors.bgTertiary,
                  border:
                    idx === playingIndex
                      ? `2px solid ${GAME_UI_TOKENS.colors.accentGold}`
                      : "2px solid transparent",
                  color: GAME_UI_TOKENS.colors.textPrimary,
                  fontFamily: GAME_UI_TOKENS.fonts.body,
                  fontWeight: 700,
                  fontSize: "11px",
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
            ))}
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

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
            gap: 1,
          }}
        >
          {songSequenceData.tray.map((note, idx) => (
            <Button
              key={note}
              ref={(el) => {
                trayButtonRefs.current[idx] = el;
              }}
              variant="outlined"
              onClick={() => {
                setFocusedRow("tray");
                setTrayIndex(idx);
                playNote(note);
              }}
              sx={{
                py: 3,
                position: "relative",
                minWidth: 0,
                color: GAME_UI_TOKENS.colors.textPrimary,
                borderColor: GAME_UI_TOKENS.colors.accentGoldMuted,
                fontFamily: GAME_UI_TOKENS.fonts.body,
                fontWeight: 700,
                fontSize: "13px",
                "&:hover": {
                  borderColor: GAME_UI_TOKENS.colors.accentGold,
                  bgcolor: "rgba(217, 173, 86, 0.1)",
                },
              }}
            >
              {note}
              <Box
                component="img"
                src="/assets/ui/sound_icon.png"
                alt=""
                sx={{
                  position: "absolute",
                  top: 3,
                  right: 3,
                  width: "12px",
                  height: "12px",
                  objectFit: "contain",
                  pointerEvents: "none",
                }}
              />
            </Button>
          ))}
        </Box>

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            ref={confirmButtonRef}
            variant="contained"
            onClick={() => {
              setFocusedRow("confirm");
              handleClose();
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
  );
}
