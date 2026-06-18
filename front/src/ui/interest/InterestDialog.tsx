"use client";

import {
  Box,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import posthog from "posthog-js";
import { useCallback, useEffect, useState } from "react";
import { registerInterest } from "@/lib/api/user-interested";
import { interestSchema } from "@/lib/validation/interest";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

export function InterestDialog() {
  const isOpen = useGameUIStore((s) => s.isInterestDialogOpen);
  const closeDialog = useGameUIStore((s) => s.closeInterestDialog);

  const [selection, setSelection] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    selection !== null &&
    (selection === false ||
      (selection === true && emailError === "" && email.trim() !== ""));

  useEffect(() => {
    if (!isOpen) {
      setSelection(null);
      setEmail("");
      setEmailError("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeDialog();
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [isOpen, closeDialog]);

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    if (value.trim() === "") {
      setEmailError("Email é obrigatório quando seleciona Sim");
    } else {
      const result = interestSchema.shape.email.safeParse(value);
      if (result.success) {
        setEmailError("");
      } else {
        setEmailError(result.error.issues[0]?.message ?? "Email inválido");
      }
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const isInterested = selection === true;
      const emailValue = isInterested ? email.trim() : null;

      await registerInterest({
        email: emailValue ?? undefined,
        is_interested: isInterested,
      });

      posthog.capture("user_interest_registered", {
        email_provided: isInterested,
        is_interested: isInterested,
        timestamp: Date.now(),
      });

      closeDialog();
    } catch (error) {
      console.error("[InterestDialog] Error registering interest:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, isSubmitting, selection, email, closeDialog]);

  if (!isOpen) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        bgcolor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
      }}
    >
      <Box
        role="dialog"
        aria-live="polite"
        sx={{
          width: "min(500px, 90vw)",
          bgcolor: GAME_UI_TOKENS.colors.bgPrimary,
          borderRadius: `${GAME_UI_TOKENS.radius.panel}px`,
          border: "none",
          overflow: "hidden",
          p: 4,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: GAME_UI_TOKENS.colors.textPrimary,
            fontFamily: "'Inter', sans-serif",
            fontSize: "1.125rem",
            fontWeight: 600,
            mb: 3,
            lineHeight: 1.5,
          }}
        >
          A gente vai trazer mais fases logo logo. Topa receber um e-mail quando
          uma nova fase chegar?
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 3,
          }}
        >
          <ToggleButtonGroup
            value={
              selection === true ? "sim" : selection === false ? "nao" : null
            }
            exclusive
            fullWidth
            onChange={(_, newValue) => {
              if (newValue !== null) {
                setSelection(newValue === "sim");
              }
            }}
          >
            <ToggleButton value="sim">Sim</ToggleButton>
            <ToggleButton value="nao">Não</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {selection === true && (
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              error={!!emailError}
              helperText={emailError}
              disabled={isSubmitting}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: GAME_UI_TOKENS.colors.bgSecondary,
                  color: GAME_UI_TOKENS.colors.textPrimary,
                  fontFamily: "'Inter', sans-serif",
                  "& fieldset": {
                    borderColor: emailError
                      ? "#FF6659"
                      : GAME_UI_TOKENS.colors.textSecondary,
                  },
                  "&:hover fieldset": {
                    borderColor: GAME_UI_TOKENS.colors.accentGold,
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: GAME_UI_TOKENS.colors.accentGold,
                  },
                },
                "& .MuiInputBase-input::placeholder": {
                  color: GAME_UI_TOKENS.colors.textSecondary,
                  opacity: 1,
                },
                "& .MuiFormHelperText-root": {
                  color: emailError
                    ? "#FF6659"
                    : GAME_UI_TOKENS.colors.textSecondary,
                },
              }}
            />
          </Box>
        )}

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
          }}
        >
          <Button
            onClick={closeDialog}
            disabled={isSubmitting}
            sx={{
              height: 44,
              px: 4,
              fontFamily: "'Inter', sans-serif",
              color: GAME_UI_TOKENS.colors.textSecondary,
              textTransform: "none",
              "&:hover": {
                bgcolor: "rgba(160, 160, 160, 0.1)",
              },
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            sx={{
              height: 44,
              px: 4,
              bgcolor: canSubmit
                ? GAME_UI_TOKENS.colors.accentGold
                : GAME_UI_TOKENS.colors.accentGoldMuted,
              fontFamily: "'Inter', sans-serif",
              color: "#000000",
              fontWeight: 700,
              textTransform: "none",
              "&:hover": {
                bgcolor: canSubmit
                  ? GAME_UI_TOKENS.colors.accentGoldHover
                  : GAME_UI_TOKENS.colors.accentGoldMuted,
              },
              "&:disabled": {
                bgcolor: GAME_UI_TOKENS.colors.accentGoldMuted,
                color: "rgba(0,0,0,0.5)",
              },
            }}
          >
            {isSubmitting ? "Enviando..." : "Confirmar"}
          </Button>
        </Box>

        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 2,
            color: GAME_UI_TOKENS.colors.textSecondary,
            fontSize: "0.75rem",
            textAlign: "center",
          }}
        >
          Aperte ESC para cancelar
        </Typography>
      </Box>
    </Box>
  );
}
