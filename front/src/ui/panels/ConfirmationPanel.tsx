import { Box, Typography } from "@mui/material";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

interface ConfirmationPanelProps {
  message: string;
  selectedIndex: number;
  onSelect: (dir: number) => void;
  onConfirm: (confirmed: boolean) => void;
}

export function ConfirmationPanel({
  message,
  selectedIndex,
  onSelect,
  onConfirm,
}: ConfirmationPanelProps) {
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
          gap: 4,
        }}
      >
        <Typography
          sx={{
            fontFamily: GAME_UI_TOKENS.fonts.body,
            fontSize: "18px",
            fontWeight: selectedIndex === 0 ? 700 : 500,
            color:
              selectedIndex === 0
                ? GAME_UI_TOKENS.colors.dialogueCta
                : GAME_UI_TOKENS.colors.textSecondary,
            cursor: "pointer",
            transition: "all 0.15s",
            transform: selectedIndex === 0 ? "scale(1.1)" : "scale(1)",
            "&:hover": { color: GAME_UI_TOKENS.colors.dialogueCta },
          }}
          onClick={() => onConfirm(true)}
          onMouseEnter={() => onSelect(0)}
        >
          Sim
        </Typography>
        <Typography
          sx={{
            fontFamily: GAME_UI_TOKENS.fonts.body,
            fontSize: "18px",
            fontWeight: selectedIndex === 1 ? 700 : 500,
            color:
              selectedIndex === 1
                ? GAME_UI_TOKENS.colors.dialogueCta
                : GAME_UI_TOKENS.colors.textSecondary,
            cursor: "pointer",
            transition: "all 0.15s",
            transform: selectedIndex === 1 ? "scale(1.1)" : "scale(1)",
            "&:hover": { color: GAME_UI_TOKENS.colors.dialogueCta },
          }}
          onClick={() => onConfirm(false)}
          onMouseEnter={() => onSelect(1)}
        >
          Não
        </Typography>
      </Box>
    </Box>
  );
}
