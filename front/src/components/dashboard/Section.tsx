import { Box, Typography } from "@mui/material";
import type { PropsWithChildren } from "react";

interface SectionProps {
  /** Omit when the page's own heading already identifies this content — avoids a redundant nested title. */
  title?: string;
  description?: string;
}

export function Section({
  title,
  description,
  children,
}: PropsWithChildren<SectionProps>) {
  return (
    <Box sx={{ mb: 4 }}>
      {title ? (
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            mb: 0.5,
            color: "text.primary",
            fontFamily: "'Jockey One', sans-serif",
          }}
        >
          {title}
        </Typography>
      ) : null}
      {description ? (
        <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
          {description}
        </Typography>
      ) : null}
      {children}
    </Box>
  );
}
