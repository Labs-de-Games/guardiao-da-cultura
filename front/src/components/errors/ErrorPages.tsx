"use client";

import { Typography } from "@mui/material";
import { useEffect } from "react";
import { reportErrorPageOncePerSession } from "@/lib/errors/reportError";
import { PLAYER_LANDING_PATH } from "@/lib/navigation/gameRoutes";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";
import { ErrorPageLayout } from "./ErrorPageLayout";
import {
  type MaintenanceReason,
  useMaintenanceRecovery,
} from "./useMaintenanceRecovery";
import { useReportError } from "./useReportError";

const goHome = { label: "Voltar ao início", href: PLAYER_LANDING_PATH };

export function NotFoundPage() {
  useReportError("not_found");

  return (
    <ErrorPageLayout
      code="404"
      title="Caminho não encontrado"
      description="Parece que você se perdeu no mapa. Esta página não existe ou foi movida."
      primaryAction={goHome}
    />
  );
}

export interface ServerErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ServerErrorPage({ error, reset }: ServerErrorPageProps) {
  useReportError("server_error", error, { digest: error.digest });

  return (
    <ErrorPageLayout
      code="500"
      title="Algo deu errado"
      description="Tivemos um problema inesperado. Tente novamente em instantes."
      primaryAction={{ label: "Tentar novamente", onClick: reset }}
      secondaryAction={goHome}
      reference={error.digest}
    />
  );
}

const MAINTENANCE_COPY: Record<
  MaintenanceReason,
  { description: string; stillDown: string }
> = {
  scheduled: {
    description:
      "Estamos em manutenção programada para melhorar o jogo. Voltamos em breve!",
    stillDown:
      "A manutenção ainda está em andamento. Tentaremos de novo automaticamente.",
  },
  outage: {
    description:
      "Nossos servidores estão indisponíveis no momento. Estamos trabalhando para voltar o quanto antes.",
    stillDown: "Ainda indisponível. Tentaremos de novo automaticamente.",
  },
};

export interface MaintenancePageProps {
  reason: MaintenanceReason;
}

export function MaintenancePage({ reason }: MaintenancePageProps) {
  const { status, retry } = useMaintenanceRecovery(reason);
  const copy = MAINTENANCE_COPY[reason];

  useEffect(() => {
    reportErrorPageOncePerSession("maintenance", reason, { reason });
  }, [reason]);

  const isChecking = status === "checking";

  return (
    <ErrorPageLayout
      title="Em manutenção"
      description={copy.description}
      primaryAction={{
        label: isChecking ? "Verificando..." : "Tentar novamente",
        onClick: retry,
        disabled: isChecking,
      }}
    >
      <Typography
        component="p"
        aria-live="polite"
        sx={{
          mt: 2,
          minHeight: 24,
          fontSize: 14,
          color: GAME_UI_TOKENS.colors.textSecondary,
        }}
      >
        {status === "still_down" ? copy.stillDown : ""}
      </Typography>
    </ErrorPageLayout>
  );
}

export interface GameLoadErrorScreenProps {
  onRetry: () => void;
}

export function GameLoadErrorScreen({ onRetry }: GameLoadErrorScreenProps) {
  return (
    <ErrorPageLayout
      title="Não foi possível carregar o jogo"
      description="Alguns recursos do jogo falharam ao carregar. Verifique sua conexão e tente novamente."
      primaryAction={{ label: "Tentar novamente", onClick: onRetry }}
      secondaryAction={goHome}
    />
  );
}
