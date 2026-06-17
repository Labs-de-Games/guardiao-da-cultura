"use client";

import { Box, Typography } from "@mui/material";
import { useGameUIStore } from "@/ui/state/game-ui-store";

export function MapInfoBox() {
  const activeMapMarker = useGameUIStore((s) => s.activeMapMarker);
  const gameStarted = useGameUIStore((s) => s.gameStarted);

  // Only show when there's an active marker and game hasn't started
  if (!activeMapMarker || gameStarted) return null;

  const ctaText = activeMapMarker.isAvailable
    ? "Aperte ESPAÇO para jogar"
    : "Em reforma";
  const ctaColor = activeMapMarker.isAvailable ? "#3B8C45" : "#A84528";

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
    </Box>
  );
}
