"use client";

import { Box, Typography } from "@mui/material";
import Image from "next/image";
import { useMemo } from "react";
import { AUTO_START_TICK_INTERVAL_MS } from "@/game/constants/AutoStart";
import { useGameUIStore } from "@/ui/state/game-ui-store";

const GOLD_STAR = "/assets/ui/stars/gold_star.png";
const GRAY_STAR = "/assets/ui/stars/star_gray.png";
const MAX_STARS = 5;

export function MapInfoBox() {
  const activeMapMarker = useGameUIStore((s) => s.activeMapMarker);
  const gameStarted = useGameUIStore((s) => s.gameStarted);
  const autoStartProgress = useGameUIStore((s) => s.autoStartProgress);
  const progression = useGameUIStore((s) => s.progression);

  const levelStars = activeMapMarker?.levelId
    ? Math.min(
        Math.floor(
          progression?.completedLevels[activeMapMarker.levelId]?.stars ?? 0,
        ),
        MAX_STARS,
      )
    : 0;

  const starAssets = useMemo(
    () =>
      Array.from({ length: MAX_STARS }, (_, i) =>
        i < levelStars ? GOLD_STAR : GRAY_STAR,
      ),
    [levelStars],
  );

  if (!activeMapMarker || gameStarted) return null;

  const { isAvailable, isCompleted = false } = activeMapMarker;

  const showProgress =
    isAvailable &&
    !isCompleted &&
    autoStartProgress !== null &&
    autoStartProgress < 1;
  const progressWidth = showProgress
    ? Math.max(0, Math.min(1, autoStartProgress)) * 100
    : 0;

  const phaseNumber = activeMapMarker.levelId
    ? activeMapMarker.levelId.replace("level_", "").padStart(2, "0")
    : null;
  const prereqNumber = phaseNumber
    ? String(Math.max(1, parseInt(phaseNumber, 10) - 1)).padStart(2, "0")
    : null;

  const prereqLevelId = prereqNumber ? `level_${prereqNumber}` : null;
  const prereqCompleted = prereqLevelId
    ? !!progression?.completedLevels[prereqLevelId]
    : false;

  let headerLabel: string | null = null;
  let ctaColor: string;
  let ctaText: string;
  let ctaIcon: string | null = "▶";

  if (isCompleted) {
    headerLabel = "Você visitou:";
    ctaColor = "#D9AD56";
    ctaText = "Fase concluída";
    ctaIcon = "✓";
  } else if (isAvailable) {
    headerLabel = "Você está aqui:";
    ctaColor = "#3B8C45";
    ctaText = 'Pressione "ESPAÇO" para jogar';
    ctaIcon = "▶";
  } else {
    headerLabel = phaseNumber ? `Fase ${phaseNumber}:` : null;
    ctaColor = "#6B7280";
    // If prerequisites are already done but the stage is still unavailable,
    // treat it as "coming soon" (e.g. feature-gated level).
    ctaText =
      prereqNumber && !prereqCompleted
        ? `Finalize a Fase ${prereqNumber} para jogar`
        : "Em breve";
    ctaIcon = "▶";
  }

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: "15px",
        left: "15px",
        width: "min(497px, calc(100vw - 30px))",
        zIndex: 30,
      }}
    >
      <Box
        role="img"
        aria-label={`${levelStars} de ${MAX_STARS} estrelas`}
        sx={{
          position: "absolute",
          bottom: "100%",
          left: 0,
          display: "flex",
          gap: "4px",
          alignItems: "center",
          bgcolor: "#252726",
          borderRadius: "4px 4px 0 0",
          pt: "8px",
          pb: "4px",
          pl: "15px",
          pr: "10px",
          pointerEvents: "none",
        }}
      >
        {starAssets.map((src, i) => (
          <Box
            key={i}
            component="img"
            src={src}
            alt=""
            aria-hidden="true"
            sx={{ width: "18px", height: "17px", objectFit: "contain" }}
          />
        ))}
      </Box>

      <Box
        sx={{
          height: "189px",
          bgcolor: "#252726",
          borderRadius: "0 4px 4px 4px",
          pointerEvents: "auto",
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

        {/* imagem direita */}
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
              opacity: isCompleted ? 0.7 : 1,
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
          {headerLabel && (
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
              {headerLabel}
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
            {ctaIcon && (
              <Box
                component="span"
                aria-hidden="true"
                sx={{ fontSize: "10px", color: ctaColor, lineHeight: 1 }}
              >
                {ctaIcon}
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
    </Box>
  );
}
