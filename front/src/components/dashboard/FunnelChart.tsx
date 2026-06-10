import { Box, LinearProgress, Typography } from "@mui/material";

interface FunnelStep {
  label: string;
  value: number;
}

interface FunnelChartProps {
  steps: FunnelStep[];
  highlightIndex?: number;
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
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isHighlight ? 700 : 500,
                  color: isHighlight ? "primary.main" : "text.secondary",
                }}
              >
                {Math.round(step.value * 100)}%
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
