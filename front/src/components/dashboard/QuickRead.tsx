import { TrendingDown as TrendingDownIcon } from "@mui/icons-material";
import LightbulbIcon from "@mui/icons-material/LightbulbOutlined";
import { Box, Stack, Typography } from "@mui/material";
import type { PhaseQuizPassRateRow } from "@/lib/edital/types";

interface QuickReadProps {
  quizPassRate: PhaseQuizPassRateRow[];
}

/**
 * Stub of Lovable reference's "Leitura rápida" panel. Only shows the one
 * insight we can compute honestly from real data (the phase with the
 * lowest quiz pass rate) — no invented institutional targets, since the
 * rest of this dashboard deliberately avoids unofficial thresholds
 * (see RateCard).
 */
export function QuickRead({ quizPassRate }: QuickReadProps) {
  const withData = quizPassRate.filter((row) => row.rate.denominator > 0);
  if (withData.length === 0) {
    return null;
  }

  const lowest = withData.reduce((worst, row) =>
    row.rate.value < worst.rate.value ? row : worst,
  );

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        borderLeftWidth: 4,
        borderLeftColor: "custom.highlight",
        backgroundColor: "custom.sidebarBg",
        px: 3.5,
        py: 3,
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <LightbulbIcon sx={{ color: "custom.highlight" }} />
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              fontWeight: 700,
              textTransform: "uppercase",
              color: "text.secondary",
            }}
          >
            Análise automática
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, fontFamily: "'Jockey One', sans-serif" }}
          >
            Leitura rápida
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <TrendingDownIcon sx={{ color: "custom.highlight" }} fontSize="small" />
        <Typography variant="body2">
          Menor taxa de aprovação no quiz: Fase {lowest.levelNumber} —{" "}
          {lowest.label} ({Math.round(lowest.rate.value * 100)}%,{" "}
          {lowest.rate.numerator.toLocaleString("pt-BR")} /{" "}
          {lowest.rate.denominator.toLocaleString("pt-BR")}).
        </Typography>
      </Stack>
    </Box>
  );
}
