"use client";

import { Box, Grid, Skeleton, Typography } from "@mui/material";
import { type ReactNode, Suspense, useEffect, useState } from "react";
import { CsvExportButton } from "@/components/dashboard/CsvExportButton";
import { DashboardState } from "@/components/dashboard/DashboardState";
import { DataTable } from "@/components/dashboard/DataTable";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KPICard } from "@/components/dashboard/KPICard";
import { RateCard } from "@/components/dashboard/RateCard";
import { Section } from "@/components/dashboard/Section";
import { TurmaSelect } from "@/components/dashboard/TurmaSelect";
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
import { useTurmaFilter } from "@/lib/edital/useTurmaFilter";

function formatMinutes(seconds: number): string {
  return `${(seconds / 60).toFixed(1).replace(".", ",")} min`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

interface ReportData {
  report: EditalReportResponse;
  summary: EditalSummaryResponse;
}

/**
 * "Detalhamento" table rows — all computed from the same summary/report
 * data already fetched for the cards above, nothing hardcoded. Quiz
 * approval gets one row per phase (not a single aggregate) since the
 * game has 3 separate final quizzes, one per level — a single "aprovação
 * no quiz" number would misrepresent that. No institutional-target
 * comparison column, same reason RateCard never shows one: no official
 * threshold is defined anywhere in this codebase.
 */
function toDetailRows(data: ReportData): ReactNode[][] {
  const landingPageViewed = data.summary.data?.landing_page_viewed ?? 0;
  const gameplayStarted = data.summary.data?.gameplay_started ?? 0;
  const entryRate = safeRate(gameplayStarted, landingPageViewed);
  const completionRate = data.report.data?.completionRate ?? {
    value: 0,
    numerator: 0,
    denominator: 0,
  };

  const rows: [string, string, string][] = [
    [
      "Alcance da campanha",
      landingPageViewed.toLocaleString("pt-BR"),
      "Visualizações da página de entrada",
    ],
    [
      "Entrada na gameplay",
      formatPercent(entryRate.value),
      `${entryRate.numerator.toLocaleString("pt-BR")} de ${entryRate.denominator.toLocaleString("pt-BR")} acessos identificados`,
    ],
    [
      "Taxa de conclusão",
      formatPercent(completionRate.value),
      `${completionRate.numerator.toLocaleString("pt-BR")} / ${completionRate.denominator.toLocaleString("pt-BR")} jogadores concluíram`,
    ],
  ];

  for (const phase of data.summary.quizPassRate ?? []) {
    rows.push([
      `Aprovação no quiz — Fase ${phase.levelNumber} — ${phase.label}`,
      formatPercent(phase.rate.value),
      `${phase.rate.numerator.toLocaleString("pt-BR")} / ${phase.rate.denominator.toLocaleString("pt-BR")} conclusões`,
    ]);
  }

  return rows.map(([metric, value, observation]) => [
    metric,
    <Typography key="value" component="span" sx={{ fontWeight: 700 }}>
      {value}
    </Typography>,
    <Typography
      key="observation"
      component="span"
      sx={{ color: "text.secondary" }}
    >
      {observation}
    </Typography>,
  ]);
}

function ReportHeader() {
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

  useEffect(() => {
    setCsvError(null);
  }, [
    turma,
    dateRange.type,
    dateRange.type === "custom" ? dateRange.start : "",
    dateRange.type === "custom" ? dateRange.end : "",
  ]);

  const { data, loading, error, errorKind, retry } = useAsyncData<ReportData>(
    async () => {
      const [report, summary] = await Promise.all([
        getReport(dateRange, turma),
        getSummary(dateRange, turma),
      ]);
      return { report, summary };
    },
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
        {data?.report.linked ? (
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
        linked={data?.report.linked ?? true}
        skeleton={REPORT_SKELETON}
        empty={
          data ? !data.report.data?.sessionDuration.sessionsStarted : false
        }
      >
        {data?.report.data ? (
          <>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <KPICard
                  title="Sessões iniciadas"
                  value={data.report.data.sessionDuration.sessionsStarted.toLocaleString(
                    "pt-BR",
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <KPICard
                  title="Tempo médio de sessão"
                  value={formatMinutes(
                    data.report.data.sessionDuration.avgSeconds,
                  )}
                  subtitle={`Mediana: ${formatMinutes(data.report.data.sessionDuration.medianSeconds)}`}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <RateCard
                  title="Taxa de conclusão"
                  rate={data.report.data.completionRate}
                />
              </Grid>
            </Grid>

            <Section
              variant="split"
              eyebrow="Detalhamento"
              title="Indicadores consolidados"
              sx={{ mt: 4 }}
            >
              <DataTable
                label="Indicadores consolidados"
                columns={[
                  { header: "Métrica" },
                  { header: "Valor" },
                  { header: "Observação" },
                ]}
                rows={toDetailRows(data)}
              />
            </Section>
          </>
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
