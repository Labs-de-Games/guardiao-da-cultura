"use client";

import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton, Paper, Typography } from "@mui/material";
import { useCallback, useEffect, useRef } from "react";

import { useGameUIStore } from "@/ui/state/game-ui-store";
import { UI_LAYERS } from "@/ui/theme/tokens";

const CONTROLS = [
  { key: "Q", action: "Rever controles" },
  { key: "WASD / Setas", action: "Andar, subir e descer" },
  { key: "Espaço", action: "Pular" },
  { key: "E", action: "Interagir" },
  { key: "TAB", action: "Painel de status" },
  { key: "B", action: "Galeria de conquistas" },
  { key: "ESC", action: "Fechar controles" },
];

const COLORS = {
  gold: "#d9ad56",
  cream: "#f4eede",
  white: "#ffffff",
  panelBg: "#222323",
  muted: "#a0a0a0",
} as const;

const CAPTURED_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "w",
  "a",
  "s",
  "d",
  "W",
  "A",
  "S",
  "D",
  " ",
  "Tab",
  "Escape",
  "e",
  "E",
  "b",
  "B",
]);

export function ControlsPanel() {
  const controlsOpen = useGameUIStore((s) => s.controlsOpen);
  const setControlsOpen = useGameUIStore((s) => s.setControlsOpen);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setControlsOpen(false);
  }, [setControlsOpen]);

  useEffect(() => {
    if (!controlsOpen) return;

    panelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
      if (CAPTURED_KEYS.has(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [controlsOpen, close]);

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: controlsOpen ? 1 : 0,
        pointerEvents: controlsOpen ? "auto" : "none",
        transition: "opacity 200ms ease-in-out",
        zIndex: UI_LAYERS.PANEL,
      }}
      onClick={close}
    >
      <Paper
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Controles"
        tabIndex={-1}
        elevation={8}
        sx={{
          width: 520,
          bgcolor: "rgb(23, 23, 23)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: "16px",
          p: 4,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          outline: "none",
          position: "relative",
          transform: controlsOpen ? "scale(1)" : "scale(0.95)",
          transition: "transform 200ms ease-in-out, opacity 200ms ease-in-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton
          aria-label="Fechar"
          onClick={close}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: COLORS.muted,
            "&:hover": { color: COLORS.white },
          }}
        >
          <CloseIcon />
        </IconButton>

        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            textAlign: "center",
            color: COLORS.gold,
            fontSize: "20px",
          }}
        >
          Controles
        </Typography>

        <Box
          sx={{ display: "flex", flexDirection: "column", gap: 1.25, mt: 1 }}
        >
          {CONTROLS.map(({ key, action }) => (
            <Box
              key={key}
              sx={{ display: "flex", alignItems: "center", gap: 2 }}
            >
              <Paper
                elevation={0}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  minWidth: 140,
                  textAlign: "center",
                  bgcolor: COLORS.panelBg,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: COLORS.cream,
                    fontFamily: "monospace",
                  }}
                >
                  {key}
                </Typography>
              </Paper>
              <Typography variant="body2" sx={{ color: COLORS.white }}>
                {action}
              </Typography>
            </Box>
          ))}
        </Box>

        <Typography
          variant="caption"
          sx={{ color: COLORS.muted, textAlign: "center", mt: 1 }}
        >
          Aperte ESC para fechar
        </Typography>
      </Paper>
    </Box>
  );
}
