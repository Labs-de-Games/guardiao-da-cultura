"use client";

import { Box, Typography } from "@mui/material";
import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

const TOOLTIP_WIDTH = 280;
const TOOLTIP_OFFSET_Y = 44;
const ARROW_SIZE = 10;
const VIEWPORT_PADDING = 16;

function Keycap({ label }: { label: string }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 72,
        px: 1.5,
        py: 0.5,
        bgcolor: GAME_UI_TOKENS.colors.bgSecondary,
        border: `1px solid ${GAME_UI_TOKENS.colors.accentGoldMuted}`,
        borderRadius: "6px",
        boxShadow: "inset 0 -2px 0 rgba(0, 0, 0, 0.35)",
      }}
    >
      <Typography
        component="span"
        sx={{
          fontFamily: "monospace",
          fontWeight: 700,
          fontSize: "13px",
          color: GAME_UI_TOKENS.colors.textPrimary,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

function clampHorizontalPosition(screenX: number) {
  const halfWidth = TOOLTIP_WIDTH / 2;
  const maxLeft =
    typeof window === "undefined"
      ? screenX
      : window.innerWidth - VIEWPORT_PADDING - halfWidth;

  return Math.min(Math.max(screenX, VIEWPORT_PADDING + halfWidth), maxLeft);
}

export function MapPinTooltip() {
  const activeMapMarker = useGameUIStore((s) => s.activeMapMarker);
  const gameStarted = useGameUIStore((s) => s.gameStarted);

  if (
    !activeMapMarker ||
    gameStarted ||
    activeMapMarker.screenX <= 0 ||
    activeMapMarker.screenY <= 0
  ) {
    return null;
  }

  const left = clampHorizontalPosition(activeMapMarker.screenX);
  const arrowOffsetX = activeMapMarker.screenX - left;
  const showBelowPin = activeMapMarker.screenY < 160;

  const instructionText = activeMapMarker.isAvailable
    ? "Pressione ESPAÇO para entrar no mapa."
    : "Este local está em reforma.";

  return (
    <Box
      role="tooltip"
      aria-live="polite"
      sx={{
        position: "absolute",
        left,
        top: showBelowPin
          ? activeMapMarker.screenY + TOOLTIP_OFFSET_Y
          : activeMapMarker.screenY - TOOLTIP_OFFSET_Y,
        transform: showBelowPin
          ? "translate(-50%, 0)"
          : "translate(-50%, -100%)",
        width: TOOLTIP_WIDTH,
        pointerEvents: "none",
        zIndex: 35,
      }}
    >
      <Box
        sx={{
          bgcolor: "rgba(22, 23, 23, 0.96)",
          border: `2px solid ${LayoutConfig.COLORS.INFO_TITLE}`,
          borderRadius: `${GAME_UI_TOKENS.radius.small}px`,
          p: 2,
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            mb: 1.25,
          }}
        >
          <Keycap label="ESPAÇO" />
          <Typography
            sx={{
              fontFamily: "Jockey One, sans-serif",
              fontSize: "18px",
              color: LayoutConfig.COLORS.INFO_TITLE,
              lineHeight: 1.2,
              textAlign: "center",
            }}
          >
            {activeMapMarker.title}
          </Typography>
        </Box>

        <Typography
          sx={{
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
            color: LayoutConfig.COLORS.INFO_BODY,
            lineHeight: 1.4,
            textAlign: "center",
          }}
        >
          {instructionText}
        </Typography>
      </Box>

      <Box
        aria-hidden
        sx={{
          position: "absolute",
          left: `calc(50% + ${arrowOffsetX}px)`,
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          ...(showBelowPin
            ? {
                top: -ARROW_SIZE,
                borderLeft: `${ARROW_SIZE}px solid transparent`,
                borderRight: `${ARROW_SIZE}px solid transparent`,
                borderBottom: `${ARROW_SIZE}px solid ${LayoutConfig.COLORS.INFO_TITLE}`,
              }
            : {
                bottom: -ARROW_SIZE,
                borderLeft: `${ARROW_SIZE}px solid transparent`,
                borderRight: `${ARROW_SIZE}px solid transparent`,
                borderTop: `${ARROW_SIZE}px solid ${LayoutConfig.COLORS.INFO_TITLE}`,
              }),
        }}
      />
    </Box>
  );
}
