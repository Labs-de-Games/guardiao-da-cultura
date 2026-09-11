import { Box, LinearProgress, Typography } from "@mui/material";

export interface FunnelStep {
  label: string;
  value: number;
  /**
   * Absolute count for this step — optional, backward-compatible.
   * Issue #745: "FunnelStep ganha count e stepConversion opcionais...
   * o número do auditor é uma contagem, não uma taxa" (discovery §5.6).
   */
  count?: number;
  /** Step-over-step conversion (this step's count / previous step's), optional. */
  stepConversion?: number;
}

interface FunnelChartProps {
  steps: FunnelStep[];
  highlightIndex?: number;
}

function formatCount(value: number): string {
  return value.toLocaleString("pt-BR");
}

export function FunnelChart({
  steps,
  highlightIndex = steps.length - 1,
}: FunnelChartProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {steps.map((step, index) => {
        const isHighlight = index === highlightIndex;
        return (
          <Box key={step.label}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
            >
              <Typography
                variant="body2"
                sx={{ fontWeight: isHighlight ? 700 : 500 }}
              >
                {step.label}
                {typeof step.count === "number" ? (
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                    sx={{ ml: 1 }}
                  >
                    ({formatCount(step.count)})
                  </Typography>
                ) : null}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isHighlight ? 700 : 500,
                  color: isHighlight ? "primary.main" : "text.secondary",
                }}
              >
                {Math.round(step.value * 100)}%
                {typeof step.stepConversion === "number" ? (
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                    sx={{ ml: 1 }}
                  >
                    ({Math.round(step.stepConversion * 100)}% do anterior)
                  </Typography>
                ) : null}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={step.value * 100}
              sx={{
                height: 10,
                borderRadius: 6,
                backgroundColor: "rgba(148,163,184,0.12)",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 6,
                  backgroundColor: isHighlight
                    ? "primary.main"
                    : "success.main",
                },
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
}
