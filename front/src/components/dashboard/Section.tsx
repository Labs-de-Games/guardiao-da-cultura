import { Box, Typography } from "@mui/material";
import type { PropsWithChildren } from "react";

interface SectionProps {
  title: string;
  description?: string;
}

export function Section({
  title,
  description,
  children,
}: PropsWithChildren<SectionProps>) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      ) : null}
      {children}
    </Box>
  );
}
