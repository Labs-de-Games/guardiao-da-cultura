"use client";

import { Box, Grid, Typography } from "@mui/material";
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
  isDateRangeComplete,
  useFilterBarProps,
} from "@/lib/edital/useFilterBarProps";

function formatMinutes(seconds: number): string {
  return `${(seconds / 60).toFixed(1).replace(".", ",")} min`;
}

interface OverviewData {
  summary: EditalSummaryResponse;
  report: EditalReportResponse;
}

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
    isDateRangeComplete(dateRange),
  );

  const linked = data?.summary.linked ?? true;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          mb: 1,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Resumo Executivo
        </Typography>
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Números de gameplay atribuídos à sua instituição, direto do PostHog.
      </Typography>

      <FilterBar {...filterBarProps} />

      <DashboardState
        loading={loading}
        error={error}
        onRetry={retry}
        linked={linked}
      >
        {data ? (
          <Section title="Métricas do Edital">
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <HeroMetric value={data.summary.data?.gameplay_started ?? 0} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <KPICard
                  title="Sessões iniciadas"
                  value={(
                    data.report.data?.sessionDuration.sessionsStarted ?? 0
                  ).toLocaleString("pt-BR")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <RateCard
                  title="Taxa de entrada na gameplay"
                  rate={safeRate(
                    data.summary.data?.gameplay_started ?? 0,
                    data.summary.data?.landing_page_viewed ?? 0,
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <KPICard
                  title="Conclusões do Capítulo 1"
                  value={(
                    data.summary.data?.chapter_1_completed ?? 0
                  ).toLocaleString("pt-BR")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <RateCard
                  title="Taxa de conclusão do Capítulo 1"
                  rate={safeRate(
                    data.summary.data?.chapter_1_completed ?? 0,
                    data.summary.data?.chapter_1_started ?? 0,
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <KPICard
                  title="Tempo médio de sessão"
                  value={formatMinutes(
                    data.report.data?.sessionDuration.avgSeconds ?? 0,
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
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
              <Grid size={{ xs: 12, md: 4 }}>
                <KPICard
                  title="Erros críticos"
                  value={(
                    data.report.data?.criticalErrors.total ?? 0
                  ).toLocaleString("pt-BR")}
                />
              </Grid>
            </Grid>
          </Section>
        ) : null}
      </DashboardState>
    </Box>
  );
}

export default function InstitutionOverviewPage() {
  return (
    <Suspense fallback={null}>
      <InstitutionOverviewContent />
    </Suspense>
  );
}
