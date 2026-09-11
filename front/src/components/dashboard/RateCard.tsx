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
export function RateCard({ title, rate }: RateCardProps) {
  return (
    <KPICard
      title={title}
      value={formatPercent(rate.value)}
      subtitle={`${rate.numerator.toLocaleString("pt-BR")} / ${rate.denominator.toLocaleString("pt-BR")}`}
    />
  );
}
