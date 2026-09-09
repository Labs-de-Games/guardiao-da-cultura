import { Box, Typography } from "@mui/material";
import { useCallback, useEffect } from "react";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS, UI_LAYERS } from "@/ui/theme/tokens";

const X_ICON_PATH =
  "M 9.15625 6.3125 L 6.3125 9.15625 L 22.15625 25 L 6.21875 40.96875 L 9.03125 43.78125 L 25 27.84375 L 40.9375 43.78125 L 43.78125 40.9375 L 27.84375 25 L 43.6875 9.15625 L 40.84375 6.3125 L 25 22.15625 Z";

function CloseXIcon() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 50 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path d={X_ICON_PATH} fill="currentColor" />
    </svg>
  );
}

export function BandPanel() {
  const bandPanelOpen = useGameUIStore((s) => s.bandPanelOpen);
  const closeBandPanel = useGameUIStore((s) => s.closeBandPanel);

  const handleClose = useCallback(() => {
    closeBandPanel();
    EventBus.emit("ui:band-panel-close", undefined);
  }, [closeBandPanel]);

  useEffect(() => {
    if (!bandPanelOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [bandPanelOpen, handleClose]);

  if (!bandPanelOpen) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: UI_LAYERS.PANEL,
        pointerEvents: "auto",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        role="dialog"
        aria-modal="true"
        sx={{
          position: "relative",
          bgcolor: "#1f1f1f",
          borderRadius: "8px",
          px: 5,
          pt: 4,
          pb: 4,
          width: 480,
          minHeight: 240,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          component="button"
          type="button"
          aria-label="Fechar"
          onClick={handleClose}
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            p: 0,
            cursor: "pointer",
            color: GAME_UI_TOKENS.colors.white,
            "&:hover": { opacity: 0.7 },
            "&:focus-visible": {
              outline: "2px solid #3088B9",
              outlineOffset: 2,
              borderRadius: 1,
            },
          }}
        >
          <CloseXIcon />
        </Box>

        <Typography
          sx={{
            fontFamily: GAME_UI_TOKENS.fonts.body,
            fontSize: "20px",
            color: GAME_UI_TOKENS.colors.accentGold,
            textAlign: "center",
          }}
        >
          Em breve
        </Typography>
      </Box>
    </Box>
  );
}
