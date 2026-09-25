import { Typography } from "@mui/material";
import type { ReactNode } from "react";

export function AuthTitle({ children }: { children: ReactNode }) {
  return (
    <Typography
      variant="h4"
      component="h1"
      sx={{
        mb: 1,
        fontWeight: 700,
        fontFamily: "'Jockey One', sans-serif",
        textAlign: "center",
        color: "#1a1a1a",
      }}
    >
      {children}
    </Typography>
  );
}

export function AuthSubtitle({
  children,
  mb = 2,
}: {
  children: ReactNode;
  mb?: number;
}) {
  return (
    <Typography
      variant="body1"
      sx={{ mb, textAlign: "center", color: "#4a4a4a" }}
    >
      {children}
    </Typography>
  );
}
