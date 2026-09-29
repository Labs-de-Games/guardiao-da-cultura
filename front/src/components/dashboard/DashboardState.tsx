import { Box, CircularProgress, Typography } from "@mui/material";
import type { ReactNode } from "react";
import {
  DashboardEmptyState,
  type DashboardEmptyStateProps,
  DashboardInlineError,
} from "@/components/errors/DashboardErrorPages";
import type { ErrorKind } from "@/lib/errors/classifyError";

interface DashboardStateProps {
  loading: boolean;
  error: string | null;
  /** Picks the error screen; the raw `error` message is never shown. */
  errorKind?: ErrorKind | null;
  onRetry: () => void;
  /** false when the account has no institutionSlug — the "awaiting linkage" state. */
  linked: boolean;
  /** Optional content-shaped placeholder shown instead of the generic spinner while loading. */
  skeleton?: ReactNode;
  /** true when the data loaded fine but has nothing to show for the filters. */
  empty?: boolean;
  emptyState?: DashboardEmptyStateProps;
  children: ReactNode;
}

/**
 * Loading/error/unlinked/empty/content in one place, so the three
 * screens (#745) don't each hand-roll the artisanal blocks
 * institution/page.tsx:81-100 used to. Never unmounts the surrounding
 * page chrome — callers wrap only the data-dependent region in this,
 * keeping FilterBar (etc.) mounted through an error, which is the real
 * bug useAsyncData's retry() exists to let this component fix.
 */
export function DashboardState({
  loading,
  error,
  errorKind,
  onRetry,
  linked,
  skeleton,
  empty = false,
  emptyState,
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
      <DashboardInlineError kind={errorKind ?? "unknown"} onRetry={onRetry} />
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

  if (empty) {
    return <DashboardEmptyState {...emptyState} />;
  }

  return <>{children}</>;
}
