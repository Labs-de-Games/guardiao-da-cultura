"use client";

import { Box, Grid, Typography } from "@mui/material";
import { Suspense, useState } from "react";
import { CsvExportButton } from "@/components/dashboard/CsvExportButton";
import { DashboardState } from "@/components/dashboard/DashboardState";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KPICard } from "@/components/dashboard/KPICard";
import { RateCard } from "@/components/dashboard/RateCard";
import { Section } from "@/components/dashboard/Section";
import { getReport } from "@/lib/api/edital";
import type { EditalReportResponse } from "@/lib/edital/types";
import { useAsyncData } from "@/lib/edital/useAsyncData";
import { useEditalFilters } from "@/lib/edital/useEditalFilters";
import {
  isDateRangeComplete,
  useFilterBarProps,
} from "@/lib/edital/useFilterBarProps";

function formatMinutes(seconds: number): string {
  return `${(seconds / 60).toFixed(1).replace(".", ",")} min`;
}

function InstitutionReportContent() {
  const { dateRange, setDateRange } = useEditalFilters();
  const filterBarProps = useFilterBarProps(dateRange, setDateRange);
  const [csvError, setCsvError] = useState<string | null>(null);

  const { data, loading, error, retry } = useAsyncData<EditalReportResponse>(
    () => getReport(dateRange),
    [
      dateRange.type,
      dateRange.type === "custom" ? dateRange.start : "",
      dateRange.type === "custom" ? dateRange.end : "",
    ],
    isDateRangeComplete(dateRange),
  );

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
          Relatório
        </Typography>
        {data?.linked ? (
          <CsvExportButton dateRange={dateRange} onError={setCsvError} />
        ) : null}
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        O CSV vem do mesmo caminho de código que calculou esta tela.
      </Typography>

      {csvError ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {csvError}
        </Typography>
      ) : null}

      <FilterBar {...filterBarProps} />

      <DashboardState
        loading={loading}
        error={error}
        onRetry={retry}
        linked={data?.linked ?? true}
      >
        {data?.data ? (
          <Section title="Sessões e Erros Críticos">
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <KPICard
                  title="Sessões iniciadas"
                  value={data.data.sessionDuration.sessionsStarted.toLocaleString(
                    "pt-BR",
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <KPICard
                  title="Tempo médio de sessão"
                  value={formatMinutes(data.data.sessionDuration.avgSeconds)}
                  subtitle={`Mediana: ${formatMinutes(data.data.sessionDuration.medianSeconds)}`}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <RateCard
                  title="Taxa de aprovação no quiz"
                  rate={data.data.quizPassRate}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <KPICard
                  title="Erros críticos"
                  value={data.data.criticalErrors.total.toLocaleString("pt-BR")}
                  subtitle={Object.entries(data.data.criticalErrors.byErrorCode)
                    .map(([code, count]) => `${code}: ${count}`)
                    .join(", ")}
                />
              </Grid>
            </Grid>
          </Section>
        ) : null}
      </DashboardState>
    </Box>
  );
}

export default function InstitutionReportPage() {
  return (
    <Suspense fallback={null}>
      <InstitutionReportContent />
    </Suspense>
  );
}
