"use client";

import { Box, Container, Paper, Typography } from "@mui/material";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={8}
          sx={{
            p: { xs: 3, sm: 5 },
            textAlign: "center",
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{ mb: 1, fontWeight: 700 }}
          >
            Guardião da cultura
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Faça o cadastro e venha jogar!
          </Typography>
          {children}
        </Paper>
      </Container>
    </Box>
  );
}
