"use client";

import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import GroupsIcon from "@mui/icons-material/Groups";
import LinkIcon from "@mui/icons-material/Link";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import TimerIcon from "@mui/icons-material/Timer";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import {
  Box,
  Button,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Skeleton,
  Typography,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { DashboardFooter } from "@/components/dashboard/DashboardFooter";
import { DashboardState } from "@/components/dashboard/DashboardState";
import { DataTable } from "@/components/dashboard/DataTable";
import {
  FunnelChart,
  type FunnelStep,
} from "@/components/dashboard/FunnelChart";
import { getPublicDashboard } from "@/lib/api/edital";
import { EDITAL_ANNUAL_PLAYER_GOAL } from "@/lib/edital/rate";
import type { DateRange, PublicDashboardResponse } from "@/lib/edital/types";
import { useAsyncData } from "@/lib/edital/useAsyncData";

const PERIOD_OPTIONS: { value: DateRange["type"]; label: string }[] = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "all-time", label: "Acumulado" },
];

/**
 * Fixed pt-BR short month labels, no trailing period — unlike
 * `Intl.DateTimeFormat("pt-BR", { month: "short" })`, which appends a
 * dot to some abbreviations (e.g. "ago."). The reference's chart/period
 * labels never have one ("Jan", "Set"), so this avoids relying on ICU
 * output matching that by coincidence.
 */
const SHORT_MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function shortMonthLabel(isoDate: string): string {
  return SHORT_MONTHS[new Date(isoDate).getUTCMonth()];
}

/** "Jan — Set 2026" (same year) or "Jan 2025 — Mar 2026" (spans years). */
function periodRangeLabel(
  points: PublicDashboardResponse["playerTrend"],
): string {
  const first = new Date(points[0].month);
  const last = new Date(points[points.length - 1].month);
  const firstMonth = shortMonthLabel(points[0].month);
  const lastMonth = shortMonthLabel(points[points.length - 1].month);
  const firstYear = first.getUTCFullYear();
  const lastYear = last.getUTCFullYear();

  if (points.length === 1) {
    return `${firstMonth} ${firstYear}`;
  }
  if (firstYear === lastYear) {
    return `${firstMonth} — ${lastMonth} ${lastYear}`;
  }
  return `${firstMonth} ${firstYear} — ${lastMonth} ${lastYear}`;
}

/** e.g. "os últimos 30 dias" / "o período acumulado" — for "Indicadores consolidados para {phrase}". */
function periodPhrase(type: DateRange["type"]): string {
  switch (type) {
    case "7d":
      return "os últimos 7 dias";
    case "30d":
      return "os últimos 30 dias";
    case "90d":
      return "os últimos 90 dias";
    default:
      return "o período acumulado";
  }
}

function formatMinutes(seconds: number): string {
  return `${(seconds / 60).toFixed(1).replace(".", ",")} min`;
}

function toFunnelSteps(
  phaseProgression: PublicDashboardResponse["phaseProgression"],
): FunnelStep[] {
  if (phaseProgression.length === 0) return [];
  const first = phaseProgression[0].players;
  return phaseProgression.map((step, index) => {
    const previous =
      index === 0 ? step.players : phaseProgression[index - 1].players;
    return {
      label: step.label,
      value: first > 0 ? step.players / first : 0,
      count: step.players,
      stepConversion:
        index === 0 ? undefined : previous > 0 ? step.players / previous : 0,
    };
  });
}

/**
 * Keeps anchored sections clear of the sticky PublicHeader when a nav link
 * scrolls them to the top (logo row + nav row ≈ 140px).
 */
const SECTION_SX = { mb: 5, scrollMarginTop: 144 };

const NAV_LINKS = [
  { href: "#resumo", label: "Resumo" },
  { href: "#alcance", label: "Alcance" },
  { href: "#progressao", label: "Progressão" },
  { href: "#desempenho", label: "Desempenho" },
  { href: "#origens", label: "Origem dos acessos" },
];

function PublicHeader() {
  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        borderBottom: 1,
        borderColor: "divider",
        backgroundColor: "rgba(255, 253, 246, 0.95)",
        backdropFilter: "blur(6px)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Image
            src="/images/auth/logo-jogo.png"
            alt="Guardião da Cultura"
            width={48}
            height={48}
            style={{ objectFit: "contain" }}
          />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontFamily: "'Jockey One', sans-serif",
              color: "text.primary",
            }}
          >
            Guardião da Cultura
          </Typography>
        </Box>
        <Button
          component={Link}
          href="/login"
          variant="outlined"
          size="small"
          sx={{ color: "text.primary", borderColor: "divider" }}
        >
          Área institucional
        </Button>
      </Box>
      <Box
        component="nav"
        aria-label="Navegação da página"
        sx={{
          display: "flex",
          gap: 3,
          overflowX: "auto",
          pb: 2,
        }}
      >
        {NAV_LINKS.map((link) => (
          <Typography
            key={link.href}
            component="a"
            href={link.href}
            variant="caption"
            sx={{
              flexShrink: 0,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "text.secondary",
              textDecoration: "none",
              "&:hover": { color: "text.primary" },
            }}
          >
            {link.label}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Issue #808 — this page's own SectionHeading, distinct from the shared
 * dashboard `Section` component: the reference's public-dashboard mock
 * (reference/public-dashboard/src/routes/index.tsx SectionHeading) puts
 * eyebrow+title stacked together on the LEFT and a description paragraph
 * in its own column on the RIGHT — not the institution dashboard's
 * eyebrow-left/title-right single row (`Section`'s "split" variant).
 * Reusing `Section` here would silently copy the wrong reference's
 * layout, which is exactly the mistake this component fixes.
 */
function PublicSectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "minmax(0,1fr) minmax(280px,460px)",
        },
        alignItems: "end",
        gap: 2,
        borderTop: 1,
        borderColor: "divider",
        pt: 3,
        mb: 3.5,
      }}
    >
      <Box>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mb: 1,
            fontWeight: 700,
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          {eyebrow}
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            fontFamily: "'Jockey One', sans-serif",
            color: "text.primary",
            lineHeight: 1,
          }}
        >
          {title}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        sx={{ color: "text.secondary", textAlign: { xs: "left", md: "right" } }}
      >
        {description}
      </Typography>
    </Box>
  );
}

interface PublicKpiCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  subtitle?: string;
}

/**
 * The reference's KPI card is a different shape from the shared
 * `KPICard` used across the institution dashboard: left-aligned text
 * (not centered) and an icon badge top-right. No "+12,4% vs. período
 * anterior" trend line — that needs a real previous-period comparison
 * query, which doesn't exist yet; showing a number there without one
 * would be exactly the invented-data problem this project has avoided
 * everywhere else (see QuickRead, FunnelInsights).
 */
function PublicKpiCard({ icon, label, value, subtitle }: PublicKpiCardProps) {
  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: 1,
        borderColor: "divider",
        backgroundColor: "background.paper",
        borderRadius: 0,
        p: { xs: 2.5, md: 3 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          mb: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: "text.secondary" }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            backgroundColor: "custom.sidebarBg",
            color: "text.secondary",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </Box>
      <Typography
        variant="h3"
        sx={{
          fontWeight: 700,
          fontFamily: "'Jockey One', sans-serif",
          color: "text.primary",
          lineHeight: 1,
        }}
      >
        {value}
      </Typography>
      {subtitle ? (
        <Typography
          variant="caption"
          sx={{ display: "block", mt: 1.5, color: "text.secondary" }}
        >
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  );
}

/**
 * The reference's SmallMetric — icon to the LEFT of the label, same row,
 * no circular badge. A different shape from `PublicKpiCard` (icon badge
 * on the right); reused for the "Alcance" section's session-duration
 * side cards, which use this layout in the reference, not the KPI one.
 */
function SmallMetricCard({ icon, label, value, subtitle }: PublicKpiCardProps) {
  return (
    <Box
      sx={{
        height: "100%",
        border: 1,
        borderColor: "divider",
        backgroundColor: "background.paper",
        borderRadius: 0,
        p: { xs: 2.5, md: 3 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 3.5,
          color: "text.secondary",
        }}
      >
        {icon}
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
      </Box>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          fontFamily: "'Jockey One', sans-serif",
          color: "text.primary",
          lineHeight: 1,
        }}
      >
        {value}
      </Typography>
      {subtitle ? (
        <Typography
          variant="caption"
          sx={{ display: "block", mt: 1.5, color: "text.secondary" }}
        >
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  );
}

/**
 * SVG line/area chart, ported from the reference's LineChart
 * (reference/public-dashboard/src/routes/index.tsx) but driven by real
 * `playerTrend` data instead of a hardcoded 9-point array: point count,
 * axis max, and gridline count are all computed from what the API
 * actually returned, not assumed to be "Jan through Set".
 */
function PlayerTrendChart({
  points,
}: {
  points: PublicDashboardResponse["playerTrend"];
}) {
  const width = 800;
  const height = 285;
  const top = 50;
  const bottom = 234;
  const left = 42;
  const right = 758;

  const max = Math.max(...points.map((p) => p.players), 1);
  // Round the axis ceiling up to a clean step above the real max, e.g. a
  // max of 6 becomes a 10-unit axis, not a max literally equal to 6.
  const axisMax = Math.max(
    Math.ceil(max / 10 ** Math.floor(Math.log10(max || 1))) *
      10 ** Math.floor(Math.log10(max || 1)),
    1,
  );

  const coords = points.map((point, index) => {
    const x =
      points.length > 1
        ? left + index * ((right - left) / (points.length - 1))
        : (left + right) / 2;
    const y = bottom - (point.players / axisMax) * (bottom - top);
    return { ...point, x, y };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((fraction) => ({
    y: bottom - fraction * (bottom - top),
    label: Math.round(axisMax * fraction).toLocaleString("pt-BR"),
  }));

  return (
    <Box
      sx={{ height: 285, width: "100%" }}
      aria-label="Gráfico da evolução de jogadores únicos"
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      >
        <title>Evolução de jogadores únicos</title>
        {gridLines.map((line) => (
          <g key={line.y}>
            <line
              x1={left}
              y1={line.y}
              x2={right}
              y2={line.y}
              stroke="rgba(0,0,0,0.08)"
              strokeWidth={1}
            />
            <text
              x={left - 12}
              y={line.y + 4}
              textAnchor="end"
              fontSize={10}
              fill="currentColor"
              opacity={0.6}
            >
              {line.label}
            </text>
          </g>
        ))}
        {coords.length > 1 ? (
          <path
            d={`M ${polyline} L ${coords[coords.length - 1].x},${bottom} L ${coords[0].x},${bottom} Z`}
            fill="rgba(0,0,0,0.06)"
          />
        ) : null}
        <polyline
          points={polyline}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c, index) => (
          <g key={c.month}>
            <circle
              cx={c.x}
              cy={c.y}
              r={index === coords.length - 1 ? 5 : 3}
              fill="white"
              stroke="currentColor"
              strokeWidth={2}
            />
            <text
              x={c.x}
              y={264}
              textAnchor="middle"
              fontSize={10}
              fill="currentColor"
              opacity={0.6}
            >
              {shortMonthLabel(c.month)}
            </text>
          </g>
        ))}
      </svg>
    </Box>
  );
}

function MiniBar({ label, percent }: { label: string; percent: number }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          mb: 0.5,
        }}
      >
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: "text.primary" }}
        >
          {label}
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: "text.primary" }}
        >
          {Math.round(percent * 100)}%
        </Typography>
      </Box>
      <Box sx={{ height: 10, backgroundColor: "rgba(0,0,0,0.08)" }}>
        <Box
          sx={{
            height: "100%",
            width: `${Math.round(percent * 100)}%`,
            backgroundColor: "custom.highlight",
          }}
        />
      </Box>
    </Box>
  );
}

/**
 * The reference's "Desempenho por etapa" panel is hardcoded to a single
 * fictional "Capítulo 1" — this replaces that with a real level switcher
 * (1/2/3), each level's 3 bars computed from `phaseDetail`: entrada
 * (reached this level / all players who started gameplay), conclusão
 * (completed this level / reached this level), and the same quiz pass
 * rate already shown per-level above.
 */
function LevelDetailPanel({
  phaseDetail,
  playersUnique,
}: {
  phaseDetail: PublicDashboardResponse["phaseDetail"];
  playersUnique: number;
}) {
  const [selectedLevel, setSelectedLevel] = useState(
    phaseDetail[0].levelNumber,
  );
  const level =
    phaseDetail.find((p) => p.levelNumber === selectedLevel) ?? phaseDetail[0];

  const entryRate = playersUnique > 0 ? level.reached / playersUnique : 0;
  const completionRate =
    level.reached > 0 ? level.completed / level.reached : 0;

  return (
    <Grid
      container
      spacing={0}
      sx={{
        border: 1,
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      <Grid
        size={{ xs: 12, md: 4 }}
        sx={(theme) => ({
          p: { xs: 2.5, md: 3 },
          borderBottom: {
            xs: `1px solid ${theme.palette.divider}`,
            md: "none",
          },
          borderRight: {
            xs: "none",
            md: `1px solid ${theme.palette.divider}`,
          },
        })}
      >
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mb: 1,
            fontWeight: 700,
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          Nível {level.levelNumber}
        </Typography>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            fontFamily: "'Jockey One', sans-serif",
            mb: 2,
          }}
        >
          Desempenho por nível
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {phaseDetail.map((phase) => (
            <Button
              key={phase.levelId}
              size="small"
              variant={
                phase.levelNumber === selectedLevel ? "contained" : "outlined"
              }
              onClick={() => setSelectedLevel(phase.levelNumber)}
              sx={{
                minWidth: 0,
                color:
                  phase.levelNumber === selectedLevel
                    ? "primary.contrastText"
                    : "text.secondary",
                borderColor: "divider",
              }}
            >
              Nível {phase.levelNumber}
            </Button>
          ))}
        </Box>
        <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
          {level.label}
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }} sx={{ p: { xs: 2.5, md: 3 } }}>
        <MiniBar label="Entrada no nível" percent={entryRate} />
        <MiniBar label="Conclusão do nível" percent={completionRate} />
        <MiniBar label="Aprovação no quiz" percent={level.quizPassRate.value} />
      </Grid>
    </Grid>
  );
}

/**
 * Reference's "Como o público chega ao jogo" table (participation bar +
 * unique users, numbered rows) — only 2 real rows (institucional,
 * direto), not the reference's extra fictional per-campaign rows
 * ("Campanha Cultura Viva" etc.), since that's a level of segmentation
 * (per-link/turma) this global section isn't scoped to.
 */
function OriginTable({
  originSplit,
}: {
  originSplit: PublicDashboardResponse["originSplit"];
}) {
  const total = originSplit.institutional + originSplit.spontaneous;
  const rows = [
    { label: "Acesso institucional", value: originSplit.institutional },
    { label: "Acesso direto", value: originSplit.spontaneous },
  ].sort((a, b) => b.value - a.value);

  return (
    <DataTable
      label="Origem dos acessos"
      sx={{ borderRadius: 0 }}
      columns={[
        { header: "Origem" },
        { header: "Participação" },
        { header: "Usuários únicos", align: "right" },
      ]}
      rows={rows.map((row, index) => {
        const share = total > 0 ? row.value / total : 0;
        return [
          <Box
            key="origin"
            sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                display: "grid",
                placeItems: "center",
                border: 1,
                borderColor: "divider",
                fontSize: "0.7rem",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {row.label}
            </Typography>
          </Box>,
          <Box
            key="share"
            sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
          >
            <Box
              sx={{ flex: 1, height: 8, backgroundColor: "rgba(0,0,0,0.08)" }}
            >
              <Box
                sx={{
                  height: "100%",
                  width: `${Math.round(share * 100)}%`,
                  backgroundColor: "primary.main",
                }}
              />
            </Box>
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", minWidth: 32 }}
            >
              {Math.round(share * 100)}%
            </Typography>
          </Box>,
          <Typography
            key="value"
            sx={{ fontWeight: 700, fontFamily: "'Jockey One', sans-serif" }}
          >
            {row.value.toLocaleString("pt-BR")}
          </Typography>,
        ];
      })}
    />
  );
}

const OVERVIEW_SKELETON = (
  <Grid container spacing={3}>
    {Array.from({ length: 4 }).map((_, index) => (
      <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
        <Skeleton variant="rounded" height={140} />
      </Grid>
    ))}
  </Grid>
);

function PublicDashboardContent() {
  const [dateRange, setDateRange] = useState<DateRange>({ type: "30d" });

  const { data, loading, error, errorKind, retry } =
    useAsyncData<PublicDashboardResponse>(
      () => getPublicDashboard(dateRange),
      [
        dateRange.type,
        dateRange.type === "custom" ? dateRange.start : "",
        dateRange.type === "custom" ? dateRange.end : "",
      ],
    );

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 4 } }}>
      <PublicHeader />

      <Box
        sx={{
          py: { xs: 5, md: 8 },
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ maxWidth: 640 }}>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mb: 2,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "custom.highlight",
            }}
          >
            Indicadores públicos · 2026
          </Typography>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              fontFamily: "'Jockey One', sans-serif",
              color: "text.primary",
              lineHeight: 1.05,
            }}
          >
            Dashboard Público
            <br />— Guardião da Cultura
          </Typography>
          <Typography sx={{ mt: 2, color: "text.secondary" }}>
            Visão agregada de alcance, uso e progresso do jogo educativo, sem
            identificação individual de participantes.
          </Typography>
        </Box>

        <Box sx={{ width: { xs: "100%", md: 360 } }}>
          <Typography
            component="label"
            htmlFor="periodo-analisado"
            variant="caption"
            sx={{
              display: "block",
              mb: 1,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "text.secondary",
            }}
          >
            Período analisado
          </Typography>
          <FormControl size="small" fullWidth>
            <Select
              id="periodo-analisado"
              value={dateRange.type === "custom" ? "30d" : dateRange.type}
              onChange={(e) =>
                setDateRange({
                  type: e.target.value as DateRange["type"],
                } as DateRange)
              }
              sx={{ backgroundColor: "background.paper" }}
            >
              {PERIOD_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ mt: 1.5, display: "flex", gap: 1 }}>
            {PERIOD_OPTIONS.map((option) => {
              const active = dateRange.type === option.value;
              return (
                <Button
                  key={option.value}
                  size="small"
                  variant={active ? "contained" : "text"}
                  onClick={() =>
                    setDateRange({ type: option.value } as DateRange)
                  }
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    px: 1,
                    color: active ? "primary.contrastText" : "text.secondary",
                  }}
                >
                  {option.value === "all-time"
                    ? "Acumulado"
                    : option.label.replace("Últimos ", "")}
                </Button>
              );
            })}
          </Box>
        </Box>
      </Box>

      <DashboardState
        loading={loading}
        error={error}
        errorKind={errorKind}
        onRetry={retry}
        linked
        skeleton={OVERVIEW_SKELETON}
        empty={data ? data.playersUnique === 0 : false}
      >
        {data ? (
          <>
            <Box id="resumo" sx={SECTION_SX}>
              <PublicSectionHeading
                eyebrow="01 · Resumo executivo"
                title="Impacto em números"
                description={`Indicadores consolidados para ${periodPhrase(dateRange.type)}, sem identificação individual de participantes.`}
              />
              <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <PublicKpiCard
                    icon={<GroupsIcon fontSize="small" />}
                    label="Jogadores únicos"
                    value={data.playersUnique.toLocaleString("pt-BR")}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <PublicKpiCard
                    icon={<AccountBalanceIcon fontSize="small" />}
                    label="Instituições participantes"
                    value={data.institutionsActive.toLocaleString("pt-BR")}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <PublicKpiCard
                    icon={<LinkIcon fontSize="small" />}
                    label="Links / turmas ativas"
                    value={data.turmasActive.toLocaleString("pt-BR")}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <PublicKpiCard
                    icon={<CheckCircleIcon fontSize="small" />}
                    label="Taxa geral de conclusão"
                    value={`${Math.round(data.completionRate.value * 100)}%`}
                    subtitle={`${data.completionRate.numerator.toLocaleString("pt-BR")} / ${data.completionRate.denominator.toLocaleString("pt-BR")} jogadores`}
                  />
                </Grid>
              </Grid>

              <Box
                sx={{
                  mt: 2,
                  p: { xs: 3, md: 4 },
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "minmax(0,0.75fr) minmax(140px, auto)",
                  },
                  gap: { xs: 3, md: 4 },
                  alignItems: "center",
                  backgroundColor: "primary.main",
                  color: "primary.contrastText",
                  borderRadius: 0,
                }}
              >
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                      opacity: 0.7,
                    }}
                  >
                    <TrackChangesIcon fontSize="small" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Progresso da meta anual
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 700,
                        fontFamily: "'Jockey One', sans-serif",
                      }}
                    >
                      {data.playersUnique.toLocaleString("pt-BR")}
                    </Typography>
                    <Typography sx={{ opacity: 0.7 }}>
                      / {EDITAL_ANNUAL_PLAYER_GOAL.toLocaleString("pt-BR")}{" "}
                      jogadores
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      mt: 2,
                      height: 8,
                      maxWidth: 480,
                      borderRadius: 0,
                      backgroundColor: "rgba(255,255,255,0.2)",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        width: `${Math.round(data.annualGoalProgress.value * 100)}%`,
                        backgroundColor: "custom.highlight",
                      }}
                    />
                  </Box>
                </Box>
                <Box
                  sx={{
                    borderLeft: { md: 1 },
                    borderColor: "rgba(255,255,255,0.25)",
                    pl: { md: 4 },
                    pr: { md: 3 },
                  }}
                >
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 700,
                      fontFamily: "'Jockey One', sans-serif",
                    }}
                  >
                    {(data.annualGoalProgress.value * 100).toLocaleString(
                      "pt-BR",
                      {
                        maximumFractionDigits: 1,
                      },
                    )}
                    %
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ textTransform: "uppercase", opacity: 0.7 }}
                  >
                    da meta alcançada
                  </Typography>
                </Box>
              </Box>
            </Box>

            {data.playerTrend.length > 0 ? (
              <Box id="alcance" sx={SECTION_SX}>
                <PublicSectionHeading
                  eyebrow="02 · Alcance"
                  title="Evolução de jogadores únicos"
                  description="Crescimento acumulado de pessoas que iniciaram uma experiência no jogo, no período selecionado."
                />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <Box
                      sx={{
                        border: 1,
                        borderColor: "divider",
                        backgroundColor: "background.paper",
                        borderRadius: 0,
                        p: { xs: 2.5, md: 3 },
                        color: "text.primary",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Jogadores acumulados
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          {periodRangeLabel(data.playerTrend)}
                        </Typography>
                      </Box>
                      <PlayerTrendChart points={data.playerTrend} />
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Grid
                      container
                      spacing={2}
                      sx={{ flexDirection: { xs: "row", md: "column" } }}
                    >
                      <Grid size={{ xs: 12, sm: 6, md: 12 }}>
                        <SmallMetricCard
                          icon={<PlayArrowIcon fontSize="small" />}
                          label="Sessões iniciadas"
                          value={data.sessionDuration.sessionsStarted.toLocaleString(
                            "pt-BR",
                          )}
                          subtitle={
                            data.playersUnique > 0
                              ? `${(data.sessionDuration.sessionsStarted / data.playersUnique).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} sessão por jogador`
                              : undefined
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 12 }}>
                        <SmallMetricCard
                          icon={<TimerIcon fontSize="small" />}
                          label="Tempo médio de sessão"
                          value={formatMinutes(data.sessionDuration.avgSeconds)}
                          subtitle={`Mediana de ${formatMinutes(data.sessionDuration.medianSeconds)}`}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Box>
            ) : null}

            <Box id="progressao" sx={SECTION_SX}>
              <PublicSectionHeading
                eyebrow="03 · Progressão"
                title="Jornada agregada"
                description="Distribuição dos jogadores ao longo das fases do jogo, do início à conclusão de cada uma."
              />
              <FunnelChart steps={toFunnelSteps(data.phaseProgression)} />
            </Box>

            <Box id="desempenho" sx={SECTION_SX}>
              <PublicSectionHeading
                eyebrow="04 · Desempenho"
                title="Efetividade da experiência"
                description="Indicadores de avanço e aprendizado agregados, gerais e por fase do jogo."
              />
              <Grid container spacing={2} sx={{ mb: 3, alignItems: "stretch" }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <SmallMetricCard
                    icon={<SportsEsportsIcon fontSize="small" />}
                    label="Taxa de entrada na gameplay"
                    value={`${Math.round(data.entryRate.value * 100)}%`}
                    subtitle="Após visualizar a página de entrada"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <SmallMetricCard
                    icon={<CheckCircleIcon fontSize="small" />}
                    label="Taxa de conclusão"
                    value={`${Math.round(data.completionRate.value * 100)}%`}
                    subtitle={`${data.completionRate.numerator.toLocaleString("pt-BR")} / ${data.completionRate.denominator.toLocaleString("pt-BR")} jogadores`}
                  />
                </Grid>
              </Grid>

              {data.phaseDetail.length > 0 ? (
                <Box sx={{ mt: 3 }}>
                  <LevelDetailPanel
                    phaseDetail={data.phaseDetail}
                    playersUnique={data.playersUnique}
                  />
                </Box>
              ) : null}
            </Box>

            <Box id="origens" sx={SECTION_SX}>
              <PublicSectionHeading
                eyebrow="05 · Origem dos acessos"
                title="Como o público chega ao jogo"
                description="Distribuição agregada por canal de entrada, institucional ou acesso direto."
              />
              <OriginTable originSplit={data.originSplit} />
            </Box>
          </>
        ) : null}
      </DashboardState>
    </Box>
  );
}

export default function PublicDashboardPage() {
  // The root layout locks the body (100vh, overflow hidden) for the game.
  // This page scrolls the window instead of an inner 100vh container, so
  // "#section" anchor jumps can't scroll the locked body and push the sticky
  // header off-screen.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevHeight = document.body.style.height;
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.height = prevHeight;
    };
  }, []);

  return (
    <Box>
      <PublicDashboardContent />
      <DashboardFooter />
    </Box>
  );
}
