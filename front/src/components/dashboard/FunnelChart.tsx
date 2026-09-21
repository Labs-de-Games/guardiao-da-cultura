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
  if (steps.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Sem dados de funil para o período selecionado.
      </Typography>
    );
  }

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
                sx={{
                  fontWeight: 700,
                  color: "text.primary",
                }}
              >
                <Typography
                  component="span"
                  variant="caption"
                  sx={{
                    display: "inline-block",
                    width: 24,
                    color: "text.secondary",
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </Typography>
                {step.label}
                {typeof step.count === "number" ? (
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ ml: 1, color: "text.secondary" }}
                  >
                    ({formatCount(step.count)})
                  </Typography>
                ) : null}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: "text.primary",
                }}
              >
                {Math.round(step.value * 100)}%
                {typeof step.stepConversion === "number" ? (
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ ml: 1, color: "text.secondary" }}
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
                backgroundColor: "rgba(0,0,0,0.08)",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 6,
                  backgroundColor: isHighlight
                    ? "custom.highlight"
                    : "primary.main",
                },
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
}
