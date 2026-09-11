"use client";

import { Box, Typography } from "@mui/material";
import { Suspense } from "react";
import { DashboardState } from "@/components/dashboard/DashboardState";
import { FilterBar } from "@/components/dashboard/FilterBar";
import {
  FunnelChart,
  type FunnelStep,
} from "@/components/dashboard/FunnelChart";
import { Section } from "@/components/dashboard/Section";
import { getFunnel } from "@/lib/api/edital";
import type { DateRange, EditalFunnelResponse } from "@/lib/edital/types";
import { useAsyncData } from "@/lib/edital/useAsyncData";
import { useEditalFilters } from "@/lib/edital/useEditalFilters";

/** Same bridge as institution/page.tsx — FilterBar's string interface. */
function dateRangeToFilterBarValue(range: DateRange): string {
  if (range.type === "7d") return "last-7-days";
  if (range.type === "30d") return "last-30-days";
  if (range.type === "all-time") return "all-time";
  if (range.type === "custom") return "custom";
  return "last-30-days";
}

/** Human-readable pt-BR labels for the canonical funnel event names. */
const STEP_LABELS: Record<string, string> = {
  landing_page_viewed: "Visualizou a landing page",
  play_clicked: "Clicou em jogar",
  gameplay_started: "Iniciou a gameplay",
  chapter_1_started: "Iniciou o Capítulo 1",
  quiz_started: "Iniciou o quiz",
  quiz_completed: "Concluiu o quiz",
  chapter_1_completed: "Concluiu o Capítulo 1",
};

/**
 * fetchFunnel (server) returns absolute, monotonic counts — this
 * converts them into the [0,1] fractions FunnelChart renders as bar
 * widths (relative to step 1), while keeping the absolute count and the
 * step-over-step conversion as the auditor-facing numbers (discovery
 * §5.6: "o número do auditor é uma contagem, não uma taxa").
 */
function toFunnelSteps(data: EditalFunnelResponse["data"]): FunnelStep[] {
  if (!data || data.length === 0) return [];
  const first = data[0].value;
  return data.map((step, index) => {
    const previous = index === 0 ? step.value : data[index - 1].value;
    return {
      label: STEP_LABELS[step.label] ?? step.label,
      value: first > 0 ? step.value / first : 0,
      count: step.value,
      stepConversion:
        index === 0 ? undefined : previous > 0 ? step.value / previous : 0,
    };
  });
}

function InstitutionFunnelContent() {
  const { dateRange, setDateRange } = useEditalFilters();

  const { data, loading, error, retry } = useAsyncData<EditalFunnelResponse>(
    () => getFunnel(dateRange),
    [
      dateRange.type,
      dateRange.type === "custom" ? dateRange.start : "",
      dateRange.type === "custom" ? dateRange.end : "",
    ],
  );

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
        Funil
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        As 7 etapas do onepager, monotonicamente não-crescentes.
      </Typography>

      <FilterBar
        dateRange={dateRangeToFilterBarValue(dateRange)}
        onDateRangeChange={(value) => {
          if (value === "last-7-days") setDateRange({ type: "7d" });
          else if (value === "last-30-days") setDateRange({ type: "30d" });
          else if (value === "all-time") setDateRange({ type: "all-time" });
          else if (value === "custom") {
            setDateRange({ type: "custom", start: "", end: "" });
          }
        }}
        customFrom={dateRange.type === "custom" ? dateRange.start : ""}
        customTo={dateRange.type === "custom" ? dateRange.end : ""}
        onCustomFromChange={(value) => {
          if (dateRange.type === "custom") {
            setDateRange({ ...dateRange, start: value });
          }
        }}
        onCustomToChange={(value) => {
          if (dateRange.type === "custom") {
            setDateRange({ ...dateRange, end: value });
          }
        }}
      />

      <DashboardState
        loading={loading}
        error={error}
        onRetry={retry}
        linked={data?.linked ?? true}
      >
        {data ? (
          <Section title="Funil de 7 etapas">
            <FunnelChart steps={toFunnelSteps(data.data)} />
          </Section>
        ) : null}
      </DashboardState>
    </Box>
  );
}

export default function InstitutionFunnelPage() {
  return (
    <Suspense fallback={null}>
      <InstitutionFunnelContent />
    </Suspense>
  );
}
