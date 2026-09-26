"use client";

import CloudOffIcon from "@mui/icons-material/CloudOff";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import InboxIcon from "@mui/icons-material/Inbox";
import LockClockIcon from "@mui/icons-material/LockClock";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import TuneIcon from "@mui/icons-material/Tune";
import { Box, Button, Stack, Typography } from "@mui/material";
import type { ComponentType } from "react";
import { classifyError, type ErrorKind } from "@/lib/errors/classifyError";
import { LOGIN_PATH } from "@/lib/navigation/dashboardRoutes";
import { DashboardErrorLayout } from "./DashboardErrorLayout";
import { useReportError } from "./useReportError";

interface FullPageBaseProps {
  /** Where "back to dashboard" goes — institution or public home. */
  homeHref: string;
  homeLabel?: string;
  withFooter?: boolean;
}

const DEFAULT_HOME_LABEL = "Voltar ao painel";

export function DashboardNotFoundPage({
  homeHref,
  homeLabel = DEFAULT_HOME_LABEL,
  withFooter,
}: FullPageBaseProps) {
  useReportError("not_found");

  return (
    <DashboardErrorLayout
      code="404"
      title="Página não encontrada"
      description="O endereço que você tentou acessar não existe ou foi movido."
      primaryAction={{ label: homeLabel, href: homeHref }}
      withFooter={withFooter}
    />
  );
}

export interface DashboardRouteErrorPageProps extends FullPageBaseProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Screen for a dashboard `error.tsx` boundary. A thrown fetch failure gets
 * the connection copy; everything else is a server error.
 */
export function DashboardRouteErrorPage({
  error,
  reset,
  homeHref,
  homeLabel = DEFAULT_HOME_LABEL,
  withFooter,
}: DashboardRouteErrorPageProps) {
  const isConnection = classifyError(error) === "network";
  useReportError(isConnection ? "connection" : "server_error", error, {
    digest: error.digest,
  });

  return (
    <DashboardErrorLayout
      code={isConnection ? undefined : "500"}
      title={isConnection ? "Sem conexão com o servidor" : "Algo deu errado"}
      description={
        isConnection
          ? "Não conseguimos falar com o servidor. Verifique sua internet e tente novamente."
          : "Tivemos um problema inesperado ao carregar o painel. Tente novamente em instantes."
      }
      primaryAction={{ label: "Tentar novamente", onClick: reset }}
      secondaryAction={{ label: homeLabel, href: homeHref }}
      reference={error.digest}
      withFooter={withFooter}
    />
  );
}

export function DashboardSessionExpiredPage({
  withFooter,
}: {
  withFooter?: boolean;
}) {
  useReportError("session_expired");

  return (
    <DashboardErrorLayout
      title="Sua sessão expirou"
      description="Por segurança, sua sessão foi encerrada. Entre novamente para continuar de onde parou."
      primaryAction={{ label: "Entrar novamente", href: LOGIN_PATH }}
      withFooter={withFooter}
    />
  );
}

interface InlineCopy {
  icon: ComponentType<{ sx?: object }>;
  title: string;
  description: string;
}

const INLINE_ERROR_COPY: Record<ErrorKind, InlineCopy> = {
  network: {
    icon: CloudOffIcon,
    title: "Sem conexão com o servidor",
    description:
      "Não conseguimos carregar os dados. Verifique sua internet e tente novamente.",
  },
  unauthorized: {
    icon: LockClockIcon,
    title: "Sua sessão expirou",
    description: "Entre novamente para ver os dados do painel.",
  },
  notFound: {
    icon: SearchOffIcon,
    title: "Dados não encontrados",
    description: "Os dados pedidos não existem ou foram removidos.",
  },
  badRequest: {
    icon: TuneIcon,
    title: "Não foi possível aplicar os filtros",
    description: "Ajuste o período ou a turma selecionados e tente novamente.",
  },
  server: {
    icon: ErrorOutlineIcon,
    title: "Não foi possível carregar os dados",
    description:
      "Tivemos um problema no servidor. Tente novamente em instantes.",
  },
  unknown: {
    icon: ErrorOutlineIcon,
    title: "Não foi possível carregar os dados",
    description: "Algo deu errado. Tente novamente em instantes.",
  },
};

function InlineMessage({
  icon: Icon,
  title,
  description,
  children,
}: InlineCopy & { children?: React.ReactNode }) {
  return (
    <Box role="status" sx={{ textAlign: "center", py: 8, px: 2 }}>
      <Icon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
      <Typography
        variant="h6"
        component="p"
        sx={{ mb: 1, fontWeight: 700, color: "text.primary" }}
      >
        {title}
      </Typography>
      <Typography sx={{ maxWidth: 480, mx: "auto", color: "text.secondary" }}>
        {description}
      </Typography>
      {children}
    </Box>
  );
}

export interface DashboardInlineErrorProps {
  kind: ErrorKind;
  onRetry: () => void;
}

/** Error shown inside a dashboard page, keeping filters and chrome mounted. */
export function DashboardInlineError({
  kind,
  onRetry,
}: DashboardInlineErrorProps) {
  const copy = INLINE_ERROR_COPY[kind];
  const isSession = kind === "unauthorized";

  return (
    <InlineMessage {...copy}>
      <Stack direction="row" sx={{ mt: 3, justifyContent: "center" }}>
        {isSession ? (
          <Button
            variant="contained"
            disableElevation
            href={LOGIN_PATH}
            sx={{ textTransform: "none" }}
          >
            Entrar novamente
          </Button>
        ) : (
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
        )}
      </Stack>
    </InlineMessage>
  );
}

export interface DashboardEmptyStateProps {
  title?: string;
  description?: string;
}

/** No data for the selected filters — a valid result, not an error. */
export function DashboardEmptyState({
  title = "Ainda não há dados para este período",
  description = "Nenhuma atividade foi registrada com os filtros selecionados. Tente outro período ou turma.",
}: DashboardEmptyStateProps) {
  return (
    <InlineMessage icon={InboxIcon} title={title} description={description} />
  );
}
