"use client";

import { Box, Skeleton, Typography } from "@mui/material";
import { Suspense } from "react";
import { DashboardState } from "@/components/dashboard/DashboardState";
import { FilterBar } from "@/components/dashboard/FilterBar";
import {
  FunnelChart,
  type FunnelStep,
} from "@/components/dashboard/FunnelChart";
import { FunnelInsights } from "@/components/dashboard/FunnelInsights";
import { Section } from "@/components/dashboard/Section";
import { TurmaSelect } from "@/components/dashboard/TurmaSelect";
import { getFunnel } from "@/lib/api/edital";
import type { EditalFunnelResponse, FunnelStepCount } from "@/lib/edital/types";
import { useAsyncData } from "@/lib/edital/useAsyncData";
import { useEditalFilters } from "@/lib/edital/useEditalFilters";
import {
  isDateRangeValid,
  useFilterBarProps,
} from "@/lib/edital/useFilterBarProps";
import { useTurmaFilter } from "@/lib/edital/useTurmaFilter";

/**
 * Human-readable pt-BR labels for the 3 acquisition steps (raw event
 * names). The level-completion steps that follow don't need an entry
 * here — the server already sends the level's own title as `label`
 * (queries.ts's `getFunnelSteps`), so `toFunnelSteps` below just passes
 * those through unchanged.
 */
const STEP_LABELS: Record<string, string> = {
  landing_page_viewed: "Visualizou a landing page",
  play_clicked: "Clicou em jogar",
  gameplay_started: "Iniciou a gameplay",
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

function FunnelHeader() {
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
        Funil
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, color: "text.secondary" }}>
        Da landing page até a conclusão de cada fase, monotonicamente
        não-crescente.
      </Typography>
    </>
  );
}

/**
 * 3 acquisition steps + one per real level. Not derived from
 * LEVEL_REGISTRY here — the skeleton only needs to look roughly right
 * before data arrives, not match the exact step count.
 */
const FUNNEL_SKELETON = (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
    {Array.from({ length: 6 }).map((_, index) => (
      <Skeleton key={index} variant="rounded" height={40} />
    ))}
  </Box>
);

/** Loaded, but nobody entered the funnel in the selected period. */
function isFunnelEmpty(steps: FunnelStepCount[] | null | undefined): boolean {
  return !steps || steps.every((step) => step.value === 0);
}

function InstitutionFunnelContent() {
  const { dateRange, setDateRange } = useEditalFilters();
  const filterBarProps = useFilterBarProps(dateRange, setDateRange);
  const { turma, setTurma } = useTurmaFilter();

  const { data, loading, error, errorKind, retry } =
    useAsyncData<EditalFunnelResponse>(
      () => getFunnel(dateRange, turma),
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
      <FunnelHeader />

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
        linked={data?.linked ?? true}
        skeleton={FUNNEL_SKELETON}
        empty={isFunnelEmpty(data?.data)}
      >
        {data
          ? (() => {
              const steps = toFunnelSteps(data.data);
              return (
                <>
                  <Section
                    variant="split"
                    eyebrow={`${steps.length} etapas da experiência`}
                    title="Progressão da jornada"
                    sx={{ borderTop: 1, borderColor: "divider", pt: 3.5 }}
                  >
                    <FunnelChart steps={steps} />
                  </Section>

                  <Section
                    variant="split"
                    eyebrow="Sinais do período"
                    title="Insights do funil"
                  >
                    <FunnelInsights steps={steps} />
                  </Section>
                </>
              );
            })()
          : null}
      </DashboardState>
    </Box>
  );
}

export default function InstitutionFunnelPage() {
  return (
    <Suspense
      fallback={
        <Box>
          <FunnelHeader />
          {FUNNEL_SKELETON}
        </Box>
      }
    >
      <InstitutionFunnelContent />
    </Suspense>
  );
}
