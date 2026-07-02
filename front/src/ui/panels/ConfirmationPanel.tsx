import { Box, Button, Typography } from "@mui/material";
import { useCallback, useEffect } from "react";
import { useDialogueStore } from "@/ui/state/dialogue-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

interface ConfirmationPanelProps {
  onComplete: (callbackId: string, confirmed?: boolean) => void;
  onDismiss: (callbackId: string) => void;
}

export function ConfirmationPanel({
  onComplete,
  onDismiss,
}: ConfirmationPanelProps) {
  const message = useDialogueStore((s) => s.dialogueConfirmMessage);
  const callbackId = useDialogueStore((s) => s.dialogueCallbackId);
  const setConfirmSelection = useDialogueStore((s) => s.setConfirmSelection);
  const moveConfirmSelection = useDialogueStore((s) => s.moveConfirmSelection);
  const confirmDialogueSelection = useDialogueStore(
    (s) => s.confirmDialogueSelection,
  );
  const closeDialogue = useDialogueStore((s) => s.closeDialogue);

  const handleConfirm = useCallback(
    (confirmed: boolean) => {
      onComplete(callbackId, confirmed);
      confirmDialogueSelection();
    },
    [callbackId, confirmDialogueSelection, onComplete],
  );

  const handleDismiss = useCallback(() => {
    onDismiss(callbackId);
    closeDialogue();
  }, [closeDialogue, callbackId, onDismiss]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "a" ||
        e.key === "A" ||
        e.key === "d" ||
        e.key === "D"
      ) {
        e.preventDefault();
        e.stopPropagation();
        moveConfirmSelection(
          e.key === "ArrowRight" || e.key === "d" || e.key === "D" ? 1 : -1,
        );
      }
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        e.stopPropagation();
        const currentSelected =
          useDialogueStore.getState().dialogueConfirmSelected;
        handleConfirm(currentSelected === 0);
      }
      if (e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleDismiss();
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [moveConfirmSelection, handleConfirm, handleDismiss]);

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        pointerEvents: "auto",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          bgcolor: "#1f1f1f",
          borderRadius: "8px",
          px: 5,
          pt: 4,
          pb: 4,
          width: 811,
          height: 182,
        }}
      >
        <Typography
          sx={{
            fontFamily: GAME_UI_TOKENS.fonts.body,
            fontSize: "20px",
            color: GAME_UI_TOKENS.colors.accentGold,
            lineHeight: 1.2,
            minHeight: "1.5em",
            textAlign: "center",
            mb: 4,
          }}
        >
          {message}
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Button
            sx={{
              fontFamily: GAME_UI_TOKENS.fonts.body,
              fontSize: "16px",
              fontWeight: 500,
              textTransform: "none",
              bgcolor: GAME_UI_TOKENS.colors.accentGold,
              color: "#252726",
              borderRadius: "8px",
              px: 3,
              py: 1.5,
              width: 82,
              height: 56,
              "&:hover": { bgcolor: GAME_UI_TOKENS.colors.accentGoldHover },
            }}
            onClick={() => handleConfirm(true)}
            onMouseEnter={() => setConfirmSelection(0)}
          >
            Sim
          </Button>
          <Button
            sx={{
              fontFamily: GAME_UI_TOKENS.fonts.body,
              fontSize: "16px",
              fontWeight: 500,
              textTransform: "none",
              bgcolor: GAME_UI_TOKENS.colors.white,
              color: "#252726",
              borderRadius: "8px",
              px: 3,
              py: 1.5,
              width: 82,
              height: 56,
              "&:hover": { bgcolor: "#e0e0e0" },
            }}
            onClick={() => handleConfirm(false)}
            onMouseEnter={() => setConfirmSelection(1)}
          >
            Não
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
