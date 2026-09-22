import {
  GpsFixed as ConversionIcon,
  TrendingDown as DropoffIcon,
  EmojiEvents as RetentionIcon,
} from "@mui/icons-material";
import { Box, Grid, Typography } from "@mui/material";
import type { FunnelStep } from "./FunnelChart";

interface FunnelInsightsProps {
  steps: FunnelStep[];
}

interface InsightCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}

function InsightCard({ icon, label, value, detail }: InsightCardProps) {
  return (
    <Box
      sx={{
        borderTop: 2,
        borderColor: "text.primary",
        pt: 2.5,
        px: 0.5,
      }}
    >
      <Box sx={{ color: "custom.highlight", mb: 2.5 }}>{icon}</Box>
      <Typography
        variant="caption"
        sx={{
          display: "block",
          color: "text.secondary",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="subtitle2"
        sx={{ mt: 0.5, fontWeight: 700, color: "text.primary" }}
      >
        {value}
      </Typography>
      <Typography
        variant="caption"
        sx={{ display: "block", mt: 1, color: "text.secondary" }}
      >
        {detail}
      </Typography>
    </Box>
  );
}

/**
 * Stub of the Lovable reference's "Insights do funil" grid — every card
 * is computed from the same FunnelStep[] the chart above already renders,
 * no invented numbers. Steps without a defined stepConversion (only the
 * first step) are excluded from the drop-off/retention comparisons since
 * there's no "previous step" to compare against.
 */
interface StepWithConversion extends FunnelStep {
  stepConversion: number;
}

interface EntryWithPrevious {
  step: StepWithConversion;
  index: number;
  previous: FunnelStep;
}

export function FunnelInsights({ steps }: FunnelInsightsProps) {
  const withPrevious = steps
    .map((step, index) => ({ step, index, previous: steps[index - 1] }))
    .filter(
      (entry): entry is EntryWithPrevious =>
        entry.index > 0 && typeof entry.step.stepConversion === "number",
    );

  if (withPrevious.length === 0 || steps.length === 0) {
    return null;
  }

  const biggestDropoff = withPrevious.reduce((worst, entry) =>
    entry.step.stepConversion < worst.step.stepConversion ? entry : worst,
  );
  const bestRetention = withPrevious.reduce((best, entry) =>
    entry.step.stepConversion > best.step.stepConversion ? entry : best,
  );
  const lowestConversion = steps.reduce((worst, step) =>
    step.value < worst.value ? step : worst,
  );

  const dropoffLost =
    typeof biggestDropoff.previous.count === "number" &&
    typeof biggestDropoff.step.count === "number"
      ? biggestDropoff.previous.count - biggestDropoff.step.count
      : null;

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 4 }}>
        <InsightCard
          icon={<DropoffIcon />}
          label="Maior drop-off"
          value={`${biggestDropoff.previous.label} → ${biggestDropoff.step.label}`}
          detail={
            dropoffLost !== null
              ? `${dropoffLost.toLocaleString("pt-BR")} jogadores`
              : `${Math.round(biggestDropoff.step.stepConversion * 100)}% do anterior`
          }
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <InsightCard
          icon={<RetentionIcon />}
          label="Maior retenção"
          value={bestRetention.step.label}
          detail={`${Math.round(bestRetention.step.stepConversion * 100)}% da etapa anterior`}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <InsightCard
          icon={<ConversionIcon />}
          label="Menor conversão"
          value={lowestConversion.label}
          detail={`${Math.round(lowestConversion.value * 100)}% do alcance total`}
        />
      </Grid>
    </Grid>
  );
}
