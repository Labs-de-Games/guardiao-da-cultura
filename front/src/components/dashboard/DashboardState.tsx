import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface DashboardStateProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /** false when the account has no institutionSlug — the "awaiting linkage" state. */
  linked: boolean;
  /** Optional content-shaped placeholder shown instead of the generic spinner while loading. */
  skeleton?: ReactNode;
  children: ReactNode;
}

/**
 * Loading/error/empty(unlinked)/content in one place, so the three
 * screens (#745) don't each hand-roll the artisanal blocks
 * institution/page.tsx:81-100 used to. Never unmounts the surrounding
 * page chrome — callers wrap only the data-dependent region in this,
 * keeping FilterBar (etc.) mounted through an error, which is the real
 * bug useAsyncData's retry() exists to let this component fix.
 */
export function DashboardState({
  loading,
  error,
  onRetry,
  linked,
  skeleton,
  children,
}: DashboardStateProps) {
  if (loading) {
    if (skeleton) return <>{skeleton}</>;
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 8,
        }}
      >
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography sx={{ mb: 2, color: "error.main" }}>{error}</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          sx={{
            color: "text.primary",
            borderColor: "divider",
            "&:hover": { borderColor: "text.secondary" },
          }}
        >
          Tentar novamente
        </Button>
      </Box>
    );
  }

  if (!linked) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography
          variant="h6"
          sx={{ mb: 1, fontWeight: 700, color: "text.primary" }}
        >
          Instituição ainda não vinculada
        </Typography>
        <Typography sx={{ maxWidth: 480, mx: "auto", color: "text.secondary" }}>
          Sua conta ainda não está associada a um link de campanha. Fale com a
          organização do edital para vincular sua instituição — assim que isso
          acontecer, os dados aparecem aqui automaticamente.
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}
