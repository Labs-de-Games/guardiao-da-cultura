"use client";

import { Card, CardContent, type SxProps, Typography } from "@mui/material";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { useGameUIStore } from "@/ui/state/game-ui-store";

interface PhaseInfoCardProps {
  sx?: SxProps;
}

export function PhaseInfoCard({ sx }: PhaseInfoCardProps) {
  const levelInfo = useGameUIStore((s) => s.levelInfo);

  if (!levelInfo) return null;

  return (
    <Card
      sx={{
        bgcolor: LayoutConfig.COLORS.PANEL_INNER_BG_CSS,
        borderRadius: "16px",
        border: "none",
        ...sx,
      }}
    >
      <CardContent sx={{ "&:last-child": { pb: 2 }, p: 2 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontFamily: LayoutConfig.FONTS.TITLE,
            color: LayoutConfig.COLORS.INFO_TITLE,
            fontWeight: 700,
            fontSize: "16px",
            mb: 0.5,
          }}
        >
          {levelInfo.title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontFamily: LayoutConfig.FONTS.BODY,
            color: LayoutConfig.COLORS.INFO_TITLE,
            fontSize: "13px",
            lineHeight: 1.4,
          }}
        >
          {levelInfo.location}
        </Typography>
      </CardContent>
    </Card>
  );
}
