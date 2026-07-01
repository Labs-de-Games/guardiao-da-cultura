import ArrowRight from "@mui/icons-material/ArrowRight";
import { Box, Typography } from "@mui/material";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

interface ConfirmationPanelProps {
  message: string;
  speakerName: string;
  selectedIndex: number;
  onSelect: (dir: number) => void;
  onConfirm: (confirmed: boolean) => void;
}

export function ConfirmationPanel({
  message,
  speakerName,
  selectedIndex,
  onSelect,
  onConfirm,
}: ConfirmationPanelProps) {
  return (
    <Box>
      {speakerName && (
        <Typography
          sx={{
            fontFamily: GAME_UI_TOKENS.fonts.display,
            fontSize: "24px",
            lineHeight: "1.21em",
            color: GAME_UI_TOKENS.colors.accentGoldMuted,
            mb: "12px",
          }}
        >
          {speakerName}
        </Typography>
      )}
      <Typography
        sx={{
          fontFamily: GAME_UI_TOKENS.fonts.body,
          fontSize: "20px",
          color: GAME_UI_TOKENS.colors.accentGoldMuted,
          lineHeight: 1.2,
          minHeight: "2.5em",
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
      <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ArrowRight
          sx={{
            fontSize: 32,
            color: GAME_UI_TOKENS.colors.dialogueCta,
          }}
        />
        <Typography
          sx={{
            fontFamily: GAME_UI_TOKENS.fonts.body,
            fontWeight: 500,
            fontSize: "14px",
            color: GAME_UI_TOKENS.colors.dialogueCta,
          }}
        >
          CONFIRMAR
        </Typography>
      </Box>
    </Box>
  );
}
