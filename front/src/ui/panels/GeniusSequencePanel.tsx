"use client";

import { keyframes } from "@emotion/react";
import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton, Paper, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { EventBus } from "@/shared/events/event-bus";
import type { GeniusColor } from "@/shared/events/game-events";
import { useSound } from "@/ui/hooks/useSound";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS, UI_LAYERS } from "@/ui/theme/tokens";

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
`;

const TOTAL_ROUNDS = 6;
const INITIAL_DELAY_MS = 1500;
const PLAYBACK_GAP_MS = 350;
const PLAYBACK_FLASH_MS = 450;
const ROUND_ADVANCE_DELAY_MS = INITIAL_DELAY_MS;
const SUCCESS_LABEL_DURATION_MS = 1000;
const RETRY_DELAY_MS = 1500;
const COMPLETE_CLOSE_DELAY_MS = 1300;

const COLORS: GeniusColor[] = ["green", "red", "yellow", "blue"];

const COLOR_STYLES: Record<GeniusColor, { dim: string; lit: string }> = {
  green: { dim: "#1f4d29", lit: "#3ddc55" },
  red: { dim: "#5c1f1f", lit: "#e8453f" },
  yellow: { dim: "#5c4e14", lit: "#ffe14d" },
  blue: { dim: "#1c3556", lit: "#3d8bff" },
};

// 2x2 grid adjacency for WASD/arrow navigation.
const NEIGHBORS: Record<
  GeniusColor,
  {
    up?: GeniusColor;
    down?: GeniusColor;
    left?: GeniusColor;
    right?: GeniusColor;
  }
> = {
  green: { right: "red", down: "yellow" },
  red: { left: "green", down: "blue" },
  yellow: { up: "green", right: "blue" },
  blue: { up: "red", left: "yellow" },
};

type Phase = "intro" | "playback" | "input" | "success" | "fail" | "complete";

function randomColor(): GeniusColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function buildSequence(length: number): GeniusColor[] {
  return Array.from({ length }, () => randomColor());
}

const STATUS_LABEL: Record<Phase, string> = {
  intro: "Prepare-se...",
  playback: "Observe...",
  input: "Sua vez!",
  success: "Certo!",
  fail: "Tente novamente",
  complete: "Muito bem!",
};

export function GeniusSequencePanel() {
  const { geniusSequenceOpen, geniusSequenceData, closeGeniusSequence } =
    useGameUIStore();
  const { playGeniusNote } = useSound();

  const instanceId = geniusSequenceData?.instanceId ?? "";

  const [sequence, setSequence] = useState<GeniusColor[]>([]);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("intro");
  const [activeColor, setActiveColor] = useState<GeniusColor | null>(null);
  const [wrongColor, setWrongColor] = useState<GeniusColor | null>(null);
  const [focusedColor, setFocusedColor] = useState<GeniusColor>("green");
  const inputIndexRef = useRef(0);
  const attemptCountRef = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  // Reset the whole game whenever a fresh open payload arrives.
  useEffect(() => {
    if (!geniusSequenceOpen) return;
    clearTimeouts();
    setSequence(buildSequence(TOTAL_ROUNDS));
    setRound(1);
    setPhase("intro");
    setActiveColor(null);
    setWrongColor(null);
    setFocusedColor("green");
    inputIndexRef.current = 0;
    attemptCountRef.current = 0;
    schedule(() => setPhase("playback"), INITIAL_DELAY_MS);
    return () => {
      clearTimeouts();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geniusSequenceData, geniusSequenceOpen]);

  // Pause game while the panel is open.
  useEffect(() => {
    if (!geniusSequenceOpen) return;
    EventBus.emit("game:pause-requested", { reason: "genius-sequence" });
    return () => {
      EventBus.emit("game:resume-requested", { reason: "genius-sequence" });
    };
  }, [geniusSequenceOpen]);

  const playColor = useCallback(
    (color: GeniusColor) => {
      setActiveColor(color);
      playGeniusNote(color);
      schedule(() => setActiveColor(null), PLAYBACK_FLASH_MS);
    },
    [playGeniusNote, schedule],
  );

  // Auto-plays the current round's prefix whenever we enter "playback".
  useEffect(() => {
    if (!geniusSequenceOpen || phase !== "playback" || sequence.length === 0)
      return;

    inputIndexRef.current = 0;
    const prefix = sequence.slice(0, round);

    prefix.forEach((color, i) => {
      schedule(
        () => playColor(color),
        i * (PLAYBACK_FLASH_MS + PLAYBACK_GAP_MS),
      );
    });

    schedule(
      () => setPhase("input"),
      prefix.length * (PLAYBACK_FLASH_MS + PLAYBACK_GAP_MS),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round, sequence, geniusSequenceOpen]);

  const handleClose = useCallback(() => {
    clearTimeouts();
    EventBus.emit("ui:genius-sequence-close", undefined);
    closeGeniusSequence();
  }, [clearTimeouts, closeGeniusSequence]);

  const handlePress = useCallback(
    (color: GeniusColor) => {
      setFocusedColor(color);
      if (phase !== "input") return;

      playColor(color);
      const expected = sequence[inputIndexRef.current];

      if (color !== expected) {
        setWrongColor(color);
        attemptCountRef.current += 1;
        EventBus.emit("ui:genius-sequence-rejected", {
          instanceId,
          attemptNumber: attemptCountRef.current,
          wrongCount: 1,
          correctCount: inputIndexRef.current,
          totalRounds: TOTAL_ROUNDS,
        });
        // Wait for the wrong note's sound/flash to finish before showing
        // the message, same as the success path.
        schedule(() => {
          setPhase("fail");
          schedule(() => {
            setWrongColor(null);
            setPhase("playback");
          }, RETRY_DELAY_MS);
        }, PLAYBACK_FLASH_MS);
        return;
      }

      inputIndexRef.current += 1;

      if (inputIndexRef.current === round) {
        if (round === TOTAL_ROUNDS) {
          setPhase("complete");
          // Fire immediately: closing the panel during the celebration
          // delay must not be able to cancel a completion already earned.
          EventBus.emit("ui:genius-sequence-complete", { instanceId });
          schedule(() => {
            EventBus.emit("ui:genius-sequence-close", undefined);
            closeGeniusSequence();
          }, COMPLETE_CLOSE_DELAY_MS);
        } else {
          // Wait for the last note's sound/flash to finish before
          // celebrating, then "Prepare-se..." before the next round plays.
          schedule(() => {
            setPhase("success");
            schedule(() => {
              setPhase("intro");
              schedule(() => {
                setRound((r) => r + 1);
                setPhase("playback");
              }, ROUND_ADVANCE_DELAY_MS);
            }, SUCCESS_LABEL_DURATION_MS);
          }, PLAYBACK_FLASH_MS);
        }
      }
    },
    [phase, sequence, round, schedule, instanceId, closeGeniusSequence],
  );

  // Keyboard navigation: WASD/arrows move focus, Enter/Space presses, Esc closes.
  useEffect(() => {
    if (!geniusSequenceOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (key === "escape") {
        handleClose();
        return;
      }

      if (key === "enter" || key === " ") {
        e.preventDefault();
        handlePress(focusedColor);
        return;
      }

      const dir =
        key === "arrowup" || key === "w"
          ? "up"
          : key === "arrowdown" || key === "s"
            ? "down"
            : key === "arrowleft" || key === "a"
              ? "left"
              : key === "arrowright" || key === "d"
                ? "right"
                : null;
      if (!dir) return;

      const next = NEIGHBORS[focusedColor][dir];
      if (next) {
        e.preventDefault();
        setFocusedColor(next);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [geniusSequenceOpen, focusedColor, handlePress, handleClose]);

  const renderButton = (color: GeniusColor, gridArea: string) => {
    const style = COLOR_STYLES[color];
    const isLit = activeColor === color;
    const isFocused = focusedColor === color;
    const isWrong = wrongColor === color;

    return (
      <Box
        key={color}
        component="button"
        type="button"
        data-testid={`genius-color-${color}`}
        onClick={() => handlePress(color)}
        sx={{
          gridArea,
          border: isFocused
            ? `2px solid ${LayoutConfig.COLORS.GOLD}`
            : "2px solid transparent",
          borderRadius: 1,
          bgcolor: isLit ? style.lit : style.dim,
          cursor: "pointer",
          padding: 0,
          transition: "background-color 0.1s ease-out",
          animation: isWrong ? `${shake} 0.4s ease` : "none",
          outline: "none",
        }}
      />
    );
  };

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: geniusSequenceOpen ? "flex" : "none",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgba(0, 0, 0, 0.62)",
        zIndex: UI_LAYERS.FULLSCREEN,
        pointerEvents: geniusSequenceOpen ? "auto" : "none",
        p: 2,
      }}
    >
      <Paper
        elevation={4}
        sx={{
          width: "100%",
          maxWidth: 520,
          position: "relative",
          bgcolor: GAME_UI_TOKENS.colors.bgSecondary,
          border: `2px solid ${GAME_UI_TOKENS.colors.accentGold}`,
          borderRadius: `${GAME_UI_TOKENS.radius.panel}px`,
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
          p: 3,
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

        <Typography
          variant="h5"
          sx={{
            mb: 1,
            textAlign: "left",
            fontFamily: GAME_UI_TOKENS.fonts.display,
            fontWeight: 700,
            color: GAME_UI_TOKENS.colors.accentGold,
          }}
        >
          Afine o acordeon
        </Typography>

        <Typography
          variant="body2"
          sx={{
            mb: 3,
            textAlign: "left",
            fontFamily: GAME_UI_TOKENS.fonts.body,
            color: GAME_UI_TOKENS.colors.textSecondary,
          }}
        >
          Repita a sequência de sons. Use o mouse ou WASD/setas + Enter.
        </Typography>

        <Box
          sx={{
            position: "relative",
            width: "100%",
            maxWidth: 360,
            aspectRatio: "1 / 1",
            mx: "auto",
            mb: 3,
            display: "grid",
            gridTemplateAreas: `"green red" "yellow blue"`,
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: "6px",
          }}
        >
          {renderButton("green", "green")}
          {renderButton("red", "red")}
          {renderButton("yellow", "yellow")}
          {renderButton("blue", "blue")}

          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "34%",
              height: "34%",
              borderRadius: 1,
              bgcolor: GAME_UI_TOKENS.colors.bgPrimary,
              border: `2px solid ${GAME_UI_TOKENS.colors.accentGold}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              px: 0.5,
            }}
          >
            <Typography
              sx={{
                fontFamily: GAME_UI_TOKENS.fonts.display,
                fontWeight: 700,
                color: GAME_UI_TOKENS.colors.accentGold,
                fontSize: "clamp(14px, 5vw, 22px)",
                lineHeight: 1.1,
              }}
            >
              {round}/{TOTAL_ROUNDS}
            </Typography>
            <Typography
              sx={{
                fontFamily: GAME_UI_TOKENS.fonts.body,
                color: GAME_UI_TOKENS.colors.textPrimary,
                fontSize: "clamp(9px, 2.6vw, 13px)",
              }}
            >
              {STATUS_LABEL[phase]}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
