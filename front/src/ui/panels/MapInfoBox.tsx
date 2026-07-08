"use client";

import { Box, Typography } from "@mui/material";
import Image from "next/image";
import { AUTO_START_TICK_INTERVAL_MS } from "@/game/constants/AutoStart";
import { useGameUIStore } from "@/ui/state/game-ui-store";

export function MapInfoBox() {
  const activeMapMarker = useGameUIStore((s) => s.activeMapMarker);
  const gameStarted = useGameUIStore((s) => s.gameStarted);
  const autoStartProgress = useGameUIStore((s) => s.autoStartProgress);

  if (!activeMapMarker || gameStarted) return null;

  const isAvailable = activeMapMarker.isAvailable;
  const ctaColor = isAvailable ? "#3B8C45" : "#A84528";
  const ctaText = isAvailable ? "Aperte ESPAÇO para jogar" : "Em reforma";
  const showProgress =
    isAvailable && autoStartProgress !== null && autoStartProgress < 1;
  const progressWidth = showProgress
    ? Math.max(0, Math.min(1, autoStartProgress)) * 100
    : 0;

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: "15px",
        left: "15px",
        width: "min(497px, calc(100vw - 30px))",
        height: "189px",
        bgcolor: "#252726",
        borderRadius: "4px",
        pointerEvents: "auto",
        zIndex: 30,
        overflow: "hidden",
      }}
    >
      {/* borda interna decorativa */}
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          top: "12px",
          left: "12px",
          right: "12px",
          bottom: "12px",
          border: "2px solid #AF7E2F",
          borderRadius: "4px",
          pointerEvents: "none",
        }}
      />

      {/* imagem direita com fade */}
      {activeMapMarker.image && (
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            top: "32px",
            left: "57%",
            width: "34%",
            height: "122px",
            pointerEvents: "none",
          }}
        >
          <Image
            src={activeMapMarker.image}
            alt=""
            fill
            sizes="169px"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        </Box>
      )}

      {/* conteúdo de texto */}
      <Box sx={{ position: "absolute", inset: 0 }}>
        {isAvailable && (
          <Typography
            sx={{
              position: "absolute",
              top: "40px",
              left: "45px",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              color: "#D9AD56",
              lineHeight: 1,
            }}
          >
            Você está aqui:
          </Typography>
        )}

        <Typography
          sx={{
            position: "absolute",
            top: "57px",
            left: "45px",
            right: "55%",
            fontFamily: "Jockey One, sans-serif",
            fontSize: "26px",
            color: "#D9AD56",
            lineHeight: 1.1,
          }}
        >
          {activeMapMarker.title}
        </Typography>

        <Typography
          sx={{
            position: "absolute",
            top: "99px",
            left: "45px",
            fontFamily: "Inter, sans-serif",
            fontWeight: 500,
            fontSize: "14px",
            color: "#D9AD56",
            lineHeight: 1,
          }}
        >
          {activeMapMarker.location}
        </Typography>

        <Box
          sx={{
            position: "absolute",
            top: "134px",
            left: "42px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {isAvailable && (
            <Box
              component="span"
              aria-hidden="true"
              sx={{ fontSize: "10px", color: ctaColor, lineHeight: 1 }}
            >
              ▶
            </Box>
          )}
          <Typography
            sx={{
              fontFamily: "Inter, sans-serif",
              fontSize: "12px",
              color: ctaColor,
              lineHeight: 1,
            }}
          >
            {ctaText}
          </Typography>
        </Box>

        {showProgress && (
          <Box
            role="progressbar"
            aria-label="Auto-start countdown"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressWidth)}
            sx={{
              position: "absolute",
              bottom: "20px",
              left: "45px",
              right: "45px",
              height: 4,
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
    </Box>
  );
}
