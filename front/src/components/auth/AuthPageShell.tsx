import { Box, Paper } from "@mui/material";
import type { ReactNode } from "react";
import { AuthFooter } from "./AuthFooter";
import { AuthIllustration } from "./AuthIllustration";

interface AuthPageShellProps {
  children: ReactNode;
  /**
   * Whether the split-layout row stretches to fill remaining viewport
   * height. Preserves each page's pre-existing (and inconsistent between
   * pages) behavior exactly — not something this refactor changes.
   */
  fillHeight?: boolean;
}

/** Full-viewport split layout (mascot + form card + sponsor footer) shared by login/register/reset. */
export function AuthPageShell({
  children,
  fillHeight = false,
}: AuthPageShellProps) {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          ...(fillHeight ? { flex: 1 } : {}),
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "safe center",
          justifyContent: "center",
          gap: { xs: 4, md: 10 },
          px: { xs: 3, md: 8 },
          py: { xs: 4, md: 6 },
          background: "#f5f0e8",
        }}
      >
        <AuthIllustration />
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 480,
            background: "#faf6ef",
            border: "4px solid #1a1a1a",
            borderRadius: "16px",
            p: { xs: 3, sm: 5 },
            flexShrink: 0,
          }}
        >
          {children}
        </Paper>
      </Box>
      <AuthFooter />
    </Box>
  );
}
