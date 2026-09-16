"use client";

import { Box, Grid, Skeleton, Typography } from "@mui/material";
import { Suspense } from "react";
import { DashboardState } from "@/components/dashboard/DashboardState";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { HeroMetric } from "@/components/dashboard/HeroMetric";
import { KPICard } from "@/components/dashboard/KPICard";
import { RateCard } from "@/components/dashboard/RateCard";
import { Section } from "@/components/dashboard/Section";
import { getReport, getSummary } from "@/lib/api/edital";
import { safeRate } from "@/lib/edital/rate";
import type {
  EditalReportResponse,
  EditalSummaryResponse,
} from "@/lib/edital/types";
import { useAsyncData } from "@/lib/edital/useAsyncData";
import { useEditalFilters } from "@/lib/edital/useEditalFilters";
import {
  isDateRangeValid,
  useFilterBarProps,
} from "@/lib/edital/useFilterBarProps";

function formatMinutes(seconds: number): string {
  return `${(seconds / 60).toFixed(1).replace(".", ",")} min`;
}

interface OverviewData {
  summary: EditalSummaryResponse;
  report: EditalReportResponse;
}

function OverviewHeader() {
  return (
    <>
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

function InstitutionOverviewContent() {
  const { dateRange, setDateRange } = useEditalFilters();
  const filterBarProps = useFilterBarProps(dateRange, setDateRange);

  const { data, loading, error, retry } = useAsyncData<OverviewData>(
    async () => {
      const [summary, report] = await Promise.all([
        getSummary(dateRange),
        getReport(dateRange),
      ]);
      return { summary, report };
    },
    [
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

      <FilterBar {...filterBarProps} />

      <DashboardState
        loading={loading}
        error={error}
        onRetry={retry}
        linked={linked}
        skeleton={OVERVIEW_SKELETON}
      >
        {data ? (
          <>
            <Box sx={{ mb: 3 }}>
              <HeroMetric value={data.summary.data?.gameplay_started ?? 0} />
            </Box>
            <Section title="Métricas do Edital">
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
                  <KPICard
                    title="Conclusões do Capítulo 1"
                    value={(
                      data.summary.data?.chapter_1_completed ?? 0
                    ).toLocaleString("pt-BR")}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <RateCard
                    title="Taxa de conclusão do Capítulo 1"
                    rate={safeRate(
                      data.summary.data?.chapter_1_completed ?? 0,
                      data.summary.data?.chapter_1_started ?? 0,
                    )}
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
                    title="Taxa de aprovação no quiz"
                    rate={
                      data.report.data?.quizPassRate ?? {
                        value: 0,
                        numerator: 0,
                        denominator: 0,
                      }
                    }
                  />
                </Grid>
              </Grid>
            </Section>
            <Section>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <KPICard
                    title="Erros críticos"
                    value={(
                      data.report.data?.criticalErrors.total ?? 0
                    ).toLocaleString("pt-BR")}
                  />
                </Grid>
              </Grid>
            </Section>
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
