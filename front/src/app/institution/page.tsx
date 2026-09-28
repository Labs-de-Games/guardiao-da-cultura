"use client";

import { Box, Grid, Skeleton, Typography } from "@mui/material";
import { Suspense } from "react";
import { DashboardState } from "@/components/dashboard/DashboardState";
import { FilterBar } from "@/components/dashboard/FilterBar";
import {
  FunnelChart,
  type FunnelStep,
} from "@/components/dashboard/FunnelChart";
import { HeroMetric } from "@/components/dashboard/HeroMetric";
import { KPICard } from "@/components/dashboard/KPICard";
import { QuickRead } from "@/components/dashboard/QuickRead";
import { RateCard } from "@/components/dashboard/RateCard";
import { Section } from "@/components/dashboard/Section";
import { TurmaSelect } from "@/components/dashboard/TurmaSelect";
import { getReport, getSummary } from "@/lib/api/edital";
import { safeRate } from "@/lib/edital/rate";
import type {
  EditalReportResponse,
  EditalSummaryResponse,
  PhaseQuizPassRateRow,
} from "@/lib/edital/types";
import { useAsyncData } from "@/lib/edital/useAsyncData";
import { useEditalFilters } from "@/lib/edital/useEditalFilters";
import {
  isDateRangeValid,
  useFilterBarProps,
} from "@/lib/edital/useFilterBarProps";
import { useTurmaFilter } from "@/lib/edital/useTurmaFilter";

function formatMinutes(seconds: number): string {
  return `${(seconds / 60).toFixed(1).replace(".", ",")} min`;
}

/**
 * #807's "Desempenho por fase": a bar per level with its quiz pass rate.
 * The reached→completed cascading funnel now lives on the Funil page
 * (which covers the whole acquisition-through-every-level journey in
 * one place) — this page no longer duplicates it.
 */
function toQuizPassRateBarSteps(
  quizPassRate: PhaseQuizPassRateRow[],
): FunnelStep[] {
  return quizPassRate.map((row) => ({
    label: `Fase ${row.levelNumber} — ${row.label}`,
    value: row.rate.value,
    count: row.rate.denominator,
  }));
}

interface OverviewData {
  summary: EditalSummaryResponse;
  report: EditalReportResponse;
}

function OverviewHeader() {
  return (
    <>
      <Typography
        variant="caption"
        sx={{
          display: "block",
          mb: 1,
          fontWeight: 700,
          textTransform: "uppercase",
          color: "custom.highlight",
        }}
      >
        Painel institucional
      </Typography>
      <Typography
        variant="h4"
        sx={{
          mb: 1,
          fontWeight: 700,
          color: "text.primary",
          fontFamily: "'Jockey One', sans-serif",
        }}
      >
        Resumo Executivo
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, color: "text.secondary" }}>
        Números de gameplay atribuídos à sua instituição, direto do PostHog.
      </Typography>
    </>
  );
}

const OVERVIEW_SKELETON = (
  <Grid container spacing={3}>
    <Grid size={{ xs: 12 }}>
      <Skeleton variant="rounded" height={160} />
    </Grid>
    {Array.from({ length: 6 }).map((_, index) => (
      <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
        <Skeleton variant="rounded" height={120} />
      </Grid>
    ))}
  </Grid>
);

/** Loaded, but no player activity at all in the selected period. */
function isOverviewEmpty({ summary, report }: OverviewData): boolean {
  const counts = Object.values(summary.data ?? {});
  const sessions = report.data?.sessionDuration.sessionsStarted ?? 0;
  return counts.every((count) => count === 0) && sessions === 0;
}

function InstitutionOverviewContent() {
  const { dateRange, setDateRange } = useEditalFilters();
  const filterBarProps = useFilterBarProps(dateRange, setDateRange);
  const { turma, setTurma } = useTurmaFilter();

  const { data, loading, error, errorKind, retry } = useAsyncData<OverviewData>(
    async () => {
      const [summary, report] = await Promise.all([
        getSummary(dateRange, turma),
        getReport(dateRange, turma),
      ]);
      return { summary, report };
    },
    [
      turma,
      dateRange.type,
      dateRange.type === "custom" ? dateRange.start : "",
      dateRange.type === "custom" ? dateRange.end : "",
    ],
    isDateRangeValid(dateRange),
  );

  const linked = data?.summary.linked ?? true;

  return (
    <Box>
      <OverviewHeader />

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 2,
          mb: 4,
        }}
      >
        <FilterBar {...filterBarProps} />
        <TurmaSelect value={turma} onChange={setTurma} />
      </Box>

      <DashboardState
        loading={loading}
        error={error}
        errorKind={errorKind}
        onRetry={retry}
        linked={linked}
        skeleton={OVERVIEW_SKELETON}
        empty={data ? isOverviewEmpty(data) : false}
      >
        {data ? (
          <>
            <Box sx={{ mb: 3 }}>
              <HeroMetric value={data.summary.data?.gameplay_started ?? 0} />
            </Box>
            <Section
              variant="split"
              eyebrow="Desempenho agregado"
              title="Métricas do Edital"
            >
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <KPICard
                    title="Sessões iniciadas"
                    value={(
                      data.report.data?.sessionDuration.sessionsStarted ?? 0
                    ).toLocaleString("pt-BR")}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <RateCard
                    title="Taxa de entrada na gameplay"
                    rate={safeRate(
                      data.summary.data?.gameplay_started ?? 0,
                      data.summary.data?.landing_page_viewed ?? 0,
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <RateCard
                    title="Taxa de conclusão"
                    rate={
                      data.summary.completionRate ?? {
                        value: 0,
                        numerator: 0,
                        denominator: 0,
                      }
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <KPICard
                    title="Tempo médio de sessão"
                    value={formatMinutes(
                      data.report.data?.sessionDuration.avgSeconds ?? 0,
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <RateCard
                    title="Progresso médio"
                    rate={
                      data.summary.averageProgress ?? {
                        value: 0,
                        numerator: 0,
                        denominator: 0,
                      }
                    }
                  />
                </Grid>
              </Grid>
            </Section>

            <Section
              variant="split"
              eyebrow="Aprovação por fase"
              title="Desempenho por fase (aprovação no quiz)"
            >
              <FunnelChart
                steps={toQuizPassRateBarSteps(data.summary.quizPassRate ?? [])}
                highlightIndex={-1}
              />
            </Section>

            <QuickRead quizPassRate={data.summary.quizPassRate ?? []} />
          </>
        ) : null}
      </DashboardState>
    </Box>
  );
}

export default function InstitutionOverviewPage() {
  return (
    <Suspense
      fallback={
        <Box>
          <OverviewHeader />
          {OVERVIEW_SKELETON}
        </Box>
      }
    >
      <InstitutionOverviewContent />
    </Suspense>
  );
}
