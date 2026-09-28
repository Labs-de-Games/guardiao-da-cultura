"use client";

import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useCallback, useEffect, useRef } from "react";

import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS, UI_LAYERS } from "@/ui/theme/tokens";

const EXIT_ANIMATION_MS = 250;

export function ToastItem({
  id,
  message,
  duration,
  iconSrc,
  exiting,
  onDismiss,
  onDismissComplete,
}: {
  id: string;
  message: string;
  duration: number;
  iconSrc?: string;
  exiting: boolean;
  onDismiss: (id: string) => void;
  onDismissComplete: (id: string) => void;
}) {
  const theme = useTheme();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (exiting) return;

    timerRef.current = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id, duration, exiting, onDismiss]);

  useEffect(() => {
    if (!exiting) return;

    exitTimerRef.current = setTimeout(() => {
      onDismissComplete(id);
    }, EXIT_ANIMATION_MS);

    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [id, exiting, onDismissComplete]);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        width: "min(480px, 90vw)",
        minHeight: 120,
        bgcolor: "#161717",
        border: "none",
        borderRadius: "16px",
        px: 3,
        py: 2,
        animation: exiting
          ? `toast-exit ${EXIT_ANIMATION_MS}ms ease-in forwards`
          : "toast-enter 300ms ease-out",
        "@keyframes toast-enter": {
          from: { opacity: 0, transform: "translateY(-10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "@keyframes toast-exit": {
          from: { opacity: 1, transform: "translateY(0)" },
          to: { opacity: 0, transform: "translateY(-10px)" },
        },
      }}
    >
      {iconSrc && (
        <Box
          component="img"
          src={`/assets/${iconSrc}`}
          role="presentation"
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            objectFit: "cover",
            mr: 2,
            flexShrink: 0,
          }}
        />
      )}

      <Typography
        sx={{
          fontFamily: theme.typography.fontFamily,
          fontSize: "28px",
          color: GAME_UI_TOKENS.colors.textPrimary,
          textAlign: "center",
          lineHeight: 1.3,
          wordBreak: "break-word",
          whiteSpace: "pre-line",
          flex: 1,
        }}
      >
        {message}
      </Typography>
    </Box>
  );
}

export function ToastNotification() {
  const toasts = useGameUIStore((s) => s.toasts);
  const dismissToast = useGameUIStore((s) => s.dismissToast);
  const removeToast = useGameUIStore((s) => s.removeToast);

  const handleDismiss = useCallback(
    (id: string) => dismissToast(id),
    [dismissToast],
  );
  const handleDismissComplete = useCallback(
    (id: string) => removeToast(id),
    [removeToast],
  );

  if (toasts.length === 0) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        top: "15%",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        alignItems: "center",
        pointerEvents: "auto",
        zIndex: UI_LAYERS.NOTIFICATION,
      }}
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          duration={toast.duration}
          iconSrc={toast.iconSrc}
          exiting={toast.exiting}
          onDismiss={handleDismiss}
          onDismissComplete={handleDismissComplete}
        />
      ))}
    </Box>
  );
}
