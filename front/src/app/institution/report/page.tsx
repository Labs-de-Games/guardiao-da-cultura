"use client";

import { Box, Grid, Skeleton, Typography } from "@mui/material";
import { Suspense, useState } from "react";
import { CsvExportButton } from "@/components/dashboard/CsvExportButton";
import { DashboardState } from "@/components/dashboard/DashboardState";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KPICard } from "@/components/dashboard/KPICard";
import { TurmaSelect } from "@/components/dashboard/TurmaSelect";
import { getReport } from "@/lib/api/edital";
import type { EditalReportResponse } from "@/lib/edital/types";
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

function ReportHeader() {
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
        Relatório
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, color: "text.secondary" }}>
        O CSV inclui o detalhamento por fase, além destes números — não apenas o
        que está na tela.
      </Typography>
    </>
  );
}

const REPORT_SKELETON = (
  <Grid container spacing={3}>
    {Array.from({ length: 4 }).map((_, index) => (
      <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
        <Skeleton variant="rounded" height={120} />
      </Grid>
    ))}
  </Grid>
);

function InstitutionReportContent() {
  const { dateRange, setDateRange } = useEditalFilters();
  const filterBarProps = useFilterBarProps(dateRange, setDateRange);
  const { turma, setTurma } = useTurmaFilter();
  const [csvError, setCsvError] = useState<string | null>(null);

  const { data, loading, error, retry } = useAsyncData<EditalReportResponse>(
    () => getReport(dateRange, turma),
    [
      turma,
      dateRange.type,
      dateRange.type === "custom" ? dateRange.start : "",
      dateRange.type === "custom" ? dateRange.end : "",
    ],
    isDateRangeValid(dateRange),
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
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: "text.primary",
            fontFamily: "'Jockey One', sans-serif",
          }}
        >
          Relatório
        </Typography>
        {data?.linked ? (
          <CsvExportButton
            dateRange={dateRange}
            turma={turma}
            onError={setCsvError}
            disabled={!isDateRangeValid(dateRange)}
          />
        ) : null}
      </Box>
      <Typography variant="body1" sx={{ mb: 4, color: "text.secondary" }}>
        O CSV inclui o detalhamento por fase, além destes números — não apenas o
        que está na tela.
      </Typography>

      {csvError ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {csvError}
        </Typography>
      ) : null}

      <TurmaSelect value={turma} onChange={setTurma} />

      <FilterBar {...filterBarProps} />

      <DashboardState
        loading={loading}
        error={error}
        onRetry={retry}
        linked={data?.linked ?? true}
        skeleton={REPORT_SKELETON}
      >
        {data?.data ? (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KPICard
                title="Sessões iniciadas"
                value={data.data.sessionDuration.sessionsStarted.toLocaleString(
                  "pt-BR",
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KPICard
                title="Tempo médio de sessão"
                value={formatMinutes(data.data.sessionDuration.avgSeconds)}
                subtitle={`Mediana: ${formatMinutes(data.data.sessionDuration.medianSeconds)}`}
              />
            </Grid>
          </Grid>
        ) : null}
      </DashboardState>
    </Box>
  );
}

export default function InstitutionReportPage() {
  return (
    <Suspense
      fallback={
        <Box>
          <ReportHeader />
          {REPORT_SKELETON}
        </Box>
      }
    >
      <InstitutionReportContent />
    </Suspense>
  );
}
