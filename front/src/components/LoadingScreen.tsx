"use client";

import { Box, CircularProgress } from "@mui/material";

export default function LoadingScreen() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100%",
      }}
    >
      <CircularProgress size={48} />
    </Box>
  );
}
