import { Box, LinearProgress, Typography } from "@mui/material";

interface BadgeProgressProps {
  label: string;
  value: number;
}

export function BadgeProgress({ label, value }: BadgeProgressProps) {
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {Math.round(value * 100)}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value * 100}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: "rgba(148,163,184,0.12)",
          "& .MuiLinearProgress-bar": {
            borderRadius: 4,
          },
        }}
      />
    </Box>
  );
}
