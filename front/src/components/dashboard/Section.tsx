import { Box, type SxProps, type Theme, Typography } from "@mui/material";
import type { PropsWithChildren } from "react";

interface SectionProps {
  /** Omit when the page's own heading already identifies this content — avoids a redundant nested title. */
  title?: string;
  /** Small uppercase label above the title, e.g. "Desempenho agregado". */
  eyebrow?: string;
  description?: string;
  /**
   * "stacked" (default): eyebrow above title, both left-aligned.
   * "split": eyebrow left / title right on the same row, matching the
   * Lovable reference's .section-heading (dashboard-ui.tsx SectionHeading).
   */
  variant?: "stacked" | "split";
  /** Extra styles merged onto the outer container, e.g. a top divider. */
  sx?: SxProps<Theme>;
  /** DOM id on the outer container, e.g. for an anchor-nav target. */
  id?: string;
}

export function Section({
  title,
  eyebrow,
  description,
  variant = "stacked",
  sx,
  id,
  children,
}: PropsWithChildren<SectionProps>) {
  if (variant === "split") {
    return (
      <Box id={id} sx={{ mb: 4, ...sx }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 2,
            mb: 1.5,
          }}
        >
          {eyebrow ? (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                textTransform: "uppercase",
                color: "custom.highlight",
              }}
            >
              {eyebrow}
            </Typography>
          ) : null}
          {title ? (
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                fontFamily: "'Jockey One', sans-serif",
              }}
            >
              {title}
            </Typography>
          ) : null}
        </Box>
        {description ? (
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            {description}
          </Typography>
        ) : null}
        {children}
      </Box>
    );
  }

  return (
    <Box id={id} sx={{ mb: 4, ...sx }}>
      {eyebrow ? (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            fontWeight: 700,
            textTransform: "uppercase",
            color: "custom.highlight",
          }}
        >
          {eyebrow}
        </Typography>
      ) : null}
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
