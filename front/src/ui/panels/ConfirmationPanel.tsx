import { Box, Button, Typography } from "@mui/material";
import { useEffect } from "react";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

interface ConfirmationPanelProps {
  message: string;
  onSelect: (dir: number) => void;
  onConfirm: (confirmed: boolean) => void;
  onDismiss: () => void;
}

export function ConfirmationPanel({
  message,
  onSelect,
  onConfirm,
  onDismiss,
}: ConfirmationPanelProps) {
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
        onSelect(
          e.key === "ArrowRight" || e.key === "d" || e.key === "D" ? 1 : -1,
        );
      }
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        e.stopPropagation();
        onConfirm(true);
      }
      if (e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onDismiss();
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onSelect, onConfirm, onDismiss]);

  return (
    <Box
      sx={{
        bgcolor: "#1f1f1f",
        borderRadius: "8px",
        p: 3,
      }}
    >
      <Typography
        sx={{
          fontFamily: GAME_UI_TOKENS.fonts.body,
          fontSize: "20px",
          color: GAME_UI_TOKENS.colors.accentGold,
          lineHeight: 1.2,
          minHeight: "2.5em",
          textAlign: "center",
        }}
      >
        {message}
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 2,
          mt: 2,
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
            borderRadius: "5px",
            px: 3,
            py: 1.5,
            minWidth: 83,
            "&:hover": { bgcolor: GAME_UI_TOKENS.colors.accentGoldHover },
          }}
          onClick={() => onConfirm(true)}
          onMouseEnter={() => onSelect(0)}
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
            borderRadius: "5px",
            px: 3,
            py: 1.5,
            minWidth: 91,
            "&:hover": { bgcolor: "#e0e0e0" },
          }}
          onClick={() => onConfirm(false)}
          onMouseEnter={() => onSelect(1)}
        >
          Não
        </Button>
      </Box>
    </Box>
  );
}
