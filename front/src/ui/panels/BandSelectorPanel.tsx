"use client";

import { keyframes } from "@emotion/react";
import { Check } from "@mui/icons-material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Button, IconButton, Paper, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { BandMechanicHandler } from "@/game/mechanics/handlers/BandMechanicHandler";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS, UI_LAYERS } from "@/ui/theme/tokens";

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
`;

const CONFIRM_CLOSE_DELAY_MS = 600;
const REJECT_SHAKE_DURATION_MS = 400;

export function BandSelectorPanel() {
  const { bandPanelOpen, bandPanelData, closeBandPanel } = useGameUIStore();

  const instanceId = bandPanelData?.instanceId ?? "";
  const correctMusicianId = bandPanelData?.id ?? "";

  const shuffledOptions = useMemo(() => {
    return BandMechanicHandler.shuffle(bandPanelData?.options ?? []);
  }, [bandPanelData]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    setSelectedIndex(null);
    setIsRejecting(false);
    setIsLocked(false);
  }, [bandPanelData]);

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

  const handleToggle = (index: number) => {
    if (isLocked) return;
    setSelectedIndex((prev) => (prev === index ? null : index));
  };

  const handleConfirm = () => {
    if (isLocked || selectedIndex === null) return;
    const musicianId = shuffledOptions[selectedIndex];
    if (!musicianId) return;

    if (musicianId === correctMusicianId) {
      setIsLocked(true);
      EventBus.emit("ui:band-confirm", { instanceId, musicianId });
      setTimeout(() => {
        handleClose();
      }, CONFIRM_CLOSE_DELAY_MS);
    } else {
      setIsRejecting(true);
      EventBus.emit("ui:band-choice-rejected", { instanceId, musicianId });
      setTimeout(() => {
        setIsRejecting(false);
      }, REJECT_SHAKE_DURATION_MS);
    }
  };

  if (!bandPanelOpen) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgba(0, 0, 0, 0.62)",
        zIndex: UI_LAYERS.FULLSCREEN,
        pointerEvents: "auto",
        p: 2,
      }}
    >
      <Paper
        elevation={4}
        role="dialog"
        aria-modal="true"
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
          Monte a banda de forró
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
          Selecione o músico para integrar uma banda de forró tradicional
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 2.5,
            mb: 3,
          }}
        >
          {shuffledOptions.map((musicianId, index) => {
            const isSelected = selectedIndex === index;
            const borderColor =
              isRejecting && isSelected
                ? LayoutConfig.COLORS.UNAVAILABLE_RED
                : isSelected
                  ? LayoutConfig.COLORS.INFO_TITLE
                  : LayoutConfig.COLORS.CHUNK_STROKE_EMPTY;

            return (
              <Box
                key={`${musicianId}-${index}`}
                component="button"
                type="button"
                onClick={() => handleToggle(index)}
                disabled={isLocked}
                sx={{
                  position: "relative",
                  width: 120,
                  height: 120,
                  p: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: GAME_UI_TOKENS.colors.bgTertiary,
                  border: `2px solid ${borderColor}`,
                  borderRadius: `${GAME_UI_TOKENS.radius.small}px`,
                  cursor: isLocked ? "default" : "pointer",
                  animation:
                    isRejecting && isSelected ? `${shake} 0.4s ease` : "none",
                  opacity: isLocked && !isSelected ? 0.5 : 1,
                  transition: "border-color 0.15s ease-out",
                }}
              >
                <Box
                  component="img"
                  src={BandMechanicHandler.getMusicianAsset(musicianId)}
                  alt={musicianId}
                  sx={{
                    width: "80%",
                    height: "80%",
                    objectFit: "contain",
                    imageRendering: "pixelated",
                  }}
                />

                {isLocked && isSelected && (
                  <CheckCircleIcon
                    sx={{
                      position: "absolute",
                      top: "6%",
                      right: "6%",
                      color: LayoutConfig.COLORS.SUCCESS_GREEN,
                      bgcolor: GAME_UI_TOKENS.colors.bgPrimary,
                      borderRadius: "50%",
                      fontSize: "clamp(16px, 18%, 28px)",
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={<Check />}
          onClick={handleConfirm}
          disabled={selectedIndex === null || isLocked}
          sx={{
            mx: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.75,
            bgcolor: GAME_UI_TOKENS.colors.accentGold,
            color: GAME_UI_TOKENS.colors.white,
            fontFamily: GAME_UI_TOKENS.fonts.body,
            fontWeight: 700,
            borderRadius: `${GAME_UI_TOKENS.radius.small}px`,
            "&:hover": {
              bgcolor: GAME_UI_TOKENS.colors.accentGoldHover,
            },
            "&.Mui-disabled": {
              opacity: 0.5,
            },
          }}
        >
          Confirmar
        </Button>
      </Paper>
    </Box>
  );
}
