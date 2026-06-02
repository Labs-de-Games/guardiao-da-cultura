"use client";

import { Box, Grid, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { BadgeProgress } from "@/components/dashboard/BadgeProgress";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { KPICard } from "@/components/dashboard/KPICard";
import { Section } from "@/components/dashboard/Section";
import {
  type DashboardMetrics,
  getDashboardMetrics,
} from "@/lib/api/analytics";
import { useAuth } from "@/lib/auth/useAuth";

const FUNNEL_TARGETS = {
  loginCompletionRate: 0.8,
  chapter1StartRate: 0.9,
  chapter1CompletionRate: 0.4,
};

const GAMEPLAY_TARGETS = {
  challengeSuccessRate: 0.7,
};

const TECHNICAL_TARGETS = {
  errorFreeSessionRate: 0.9,
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatMinutes(value: number): string {
  return `${value.toFixed(1).replace(".", ",")} min`;
}

function getStatus(value: number, target?: number): "good" | "bad" | "neutral" {
  if (typeof target !== "number") {
    return "neutral";
  }
  return value >= target ? "good" : "bad";
}

export default function InstitutionOverviewPage() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState("last-30-days");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMetrics() {
      setLoading(true);
      try {
        const data = await getDashboardMetrics({ dateRange });
        if (!cancelled) {
          setMetrics(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar métricas",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchMetrics();
    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
          Carregando...
        </Typography>
      </Box>
    );
  }

  if (error || !metrics) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
          Erro
        </Typography>
        <Typography color="error">{error ?? "Dados indisponíveis"}</Typography>
      </Box>
    );
  }

  const funnelSteps = [
    { label: "Login concluído", value: metrics.funnel.loginCompletionRate },
    { label: "Entrada na Sessão 1", value: metrics.funnel.chapter1StartRate },
    {
      label: "Conclusão da Sessão 1",
      value: metrics.funnel.chapter1CompletionRate,
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
        Olá, {user?.firstName ?? user?.nickname ?? "Escola"}!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Aqui está o resumo da jornada dos jogadores e das métricas de
        engajamento no jogo.
      </Typography>

      <FilterBar dateRange={dateRange} onDateRangeChange={setDateRange} />

      <Section
        title="Funil de Engajamento"
        description="Acompanhe as etapas críticas do onboarding até a conclusão da Sessão 1."
      >
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <KPICard
              title="Login concluído"
              value={formatPercent(metrics.funnel.loginCompletionRate)}
              target={formatPercent(FUNNEL_TARGETS.loginCompletionRate)}
              status={getStatus(
                metrics.funnel.loginCompletionRate,
                FUNNEL_TARGETS.loginCompletionRate,
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <KPICard
              title="Entrada na Sessão 1"
              value={formatPercent(metrics.funnel.chapter1StartRate)}
              target={formatPercent(FUNNEL_TARGETS.chapter1StartRate)}
              status={getStatus(
                metrics.funnel.chapter1StartRate,
                FUNNEL_TARGETS.chapter1StartRate,
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <KPICard
              title="Conclusão da Sessão 1"
              value={formatPercent(metrics.funnel.chapter1CompletionRate)}
              target={formatPercent(FUNNEL_TARGETS.chapter1CompletionRate)}
              status={getStatus(
                metrics.funnel.chapter1CompletionRate,
                FUNNEL_TARGETS.chapter1CompletionRate,
              )}
              subtitle="Métrica crítica"
            />
          </Grid>
        </Grid>
        <FunnelChart steps={funnelSteps} highlightIndex={2} />
      </Section>

      <Section title="Engajamento">
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <KPICard
              title="Tempo médio de sessão"
              value={formatMinutes(metrics.engagement.averageSessionTime)}
              target="3 min"
              status={getStatus(metrics.engagement.averageSessionTime, 3)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <KPICard
              title="Total de jogadores"
              value={metrics.engagement.totalPlayers.toLocaleString("pt-BR")}
              status="neutral"
            />
          </Grid>
        </Grid>
      </Section>

      <Section title="Métricas de Engajamento no Jogo">
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <KPICard
              title="Acerto nos desafios"
              value={formatPercent(metrics.pedagogical.quizSuccessRate)}
              target={formatPercent(GAMEPLAY_TARGETS.challengeSuccessRate)}
              status={getStatus(
                metrics.pedagogical.quizSuccessRate,
                GAMEPLAY_TARGETS.challengeSuccessRate,
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <KPICard
              title="Média de estrelas"
              value={`${metrics.pedagogical.averageStarScore.toFixed(1)}/5`}
              status="neutral"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <KPICard
              title="Interação com pistas e objetos"
              value={formatPercent(metrics.pedagogical.objectInteractionRate)}
              status="neutral"
            />
          </Grid>
        </Grid>
      </Section>

      <Section title="Aquisição de Badges">
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <BadgeProgress
              label="Explorer"
              value={metrics.badges.explorerRate}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <BadgeProgress
              label="Restaurador"
              value={metrics.badges.restauradorRate}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <BadgeProgress label="Curador" value={metrics.badges.curadorRate} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <BadgeProgress
              label="Detetive"
              value={metrics.badges.detetiveRate}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <BadgeProgress
              label="Persistente"
              value={metrics.badges.persistenteRate}
            />
          </Grid>
        </Grid>
      </Section>

      <Section title="Saúde Técnica">
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <KPICard
              title="Sessões sem erro"
              value={formatPercent(metrics.technical.errorFreeSessionRate)}
              target={formatPercent(TECHNICAL_TARGETS.errorFreeSessionRate)}
              status={getStatus(
                metrics.technical.errorFreeSessionRate,
                TECHNICAL_TARGETS.errorFreeSessionRate,
              )}
            />
          </Grid>
        </Grid>
      </Section>
    </Box>
  );
}
