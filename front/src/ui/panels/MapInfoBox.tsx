"use client";

import { Box, Typography } from "@mui/material";
import { AUTO_START_TICK_INTERVAL_MS } from "@/game/constants/AutoStart";
import { useGameUIStore } from "@/ui/state/game-ui-store";

export function MapInfoBox() {
  const activeMapMarker = useGameUIStore((s) => s.activeMapMarker);
  const gameStarted = useGameUIStore((s) => s.gameStarted);
  const autoStartProgress = useGameUIStore((s) => s.autoStartProgress);

  // Only show when there's an active marker and game hasn't started
  if (!activeMapMarker || gameStarted) return null;

  const ctaText = activeMapMarker.isAvailable
    ? "Aperte ESPAÇO para jogar"
    : "Em reforma";
  const ctaColor = activeMapMarker.isAvailable ? "#3B8C45" : "#A84528";
  const showProgress =
    activeMapMarker.isAvailable &&
    autoStartProgress !== null &&
    autoStartProgress < 1;
  const progressWidth = showProgress
    ? Math.max(0, Math.min(1, autoStartProgress)) * 100
    : 0;

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: "15px",
        left: "15px",
        width: "min(530px, calc(100vw - 30px))",
        minHeight: "120px",
        bgcolor: "rgba(37, 39, 38, 0.92)",
        borderRadius: "8px",
        p: 3,
        pointerEvents: "auto",
        zIndex: 30,
      }}
    >
      <Typography
        sx={{
          fontFamily: "Jockey One, sans-serif",
          fontSize: "clamp(24px, 4vw, 28px)",
          color: "#D9AD56",
          lineHeight: 1.2,
          mb: 1,
        }}
      >
        {activeMapMarker.title}
      </Typography>

      <Typography
        sx={{
          fontFamily: "Inter, sans-serif",
          fontSize: "clamp(14px, 2.5vw, 16px)",
          color: "#F5F5F5",
          lineHeight: 1.4,
          mb: 2,
        }}
      >
        {activeMapMarker.location}
      </Typography>

      <Typography
        sx={{
          fontFamily: "Inter, sans-serif",
          fontSize: "clamp(12px, 2vw, 14px)",
          color: ctaColor,
          lineHeight: 1.3,
        }}
      >
        {ctaText}
      </Typography>

      {showProgress && (
        <Box
          role="progressbar"
          aria-label="Auto-start countdown"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressWidth)}
          sx={{
            mt: 1,
            height: 4,
            width: "100%",
            bgcolor: "rgba(255,255,255,0.15)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              height: "100%",
              width: `${progressWidth}%`,
              bgcolor: ctaColor,
              transition: `width ${AUTO_START_TICK_INTERVAL_MS}ms linear`,
            }}
          />
        </Box>
      )}
    </Box>
  );
}
