import type { Rate } from "@/lib/edital/types";
import { KPICard } from "./KPICard";

interface RateCardProps {
  title: string;
  rate: Rate;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Thin wrapper around KPICard (issue #745: no changes needed to KPICard
 * itself — target/status are already optional, subtitle already carries
 * a free-text line). Renders a Rate as a percentage with its
 * numerator/denominator underneath — discovery §7's "never present an
 * unqualified number" rule, and no target/status, since the onepager
 * defines no official thresholds (the FUNNEL_TARGETS-style constants
 * this replaces are being removed for exactly that reason).
 */
const NO_DATA_VALUE = "—";
const NO_DATA_SUBTITLE = "Sem dados no período";

export function RateCard({ title, rate }: RateCardProps) {
  // 0/0 isn't 0% — it's a metric nobody has generated yet.
  if (rate.denominator <= 0) {
    return (
      <KPICard
        title={title}
        value={NO_DATA_VALUE}
        subtitle={NO_DATA_SUBTITLE}
      />
    );
  }

  return (
    <KPICard
      title={title}
      value={formatPercent(rate.value)}
      subtitle={`${rate.numerator.toLocaleString("pt-BR")} / ${rate.denominator.toLocaleString("pt-BR")}`}
    />
  );
}
