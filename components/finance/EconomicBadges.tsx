import type { EventFinancialSummary } from "@/lib/finance/types";
import { formatTicketPrice } from "@/lib/tickets/utils";
import { cn } from "@/lib/utils/cn";

type EconomicBadgesProps = {
  summary: EventFinancialSummary;
  pendingSalesCount?: number;
  compact?: boolean;
  ventasHref?: string;
  gestionHref?: string;
};

export function EconomicBadges({
  summary,
  pendingSalesCount = summary.pendingSalesCount,
  compact = false,
  ventasHref,
  gestionHref,
}: EconomicBadgesProps) {
  const profitClass =
    summary.profitVisualState === "positive"
      ? "public-badge-success"
      : summary.profitVisualState === "negative"
        ? "public-badge-warning"
        : summary.profitVisualState === "incomplete"
          ? "public-badge-neutral"
          : "public-badge-neutral";

  return (
    <div className={cn("flex flex-wrap gap-2", compact ? "text-xs" : "text-sm")}>
      {summary.revenueConfirmed > 0 ? (
        <span className="public-badge">
          Recaudado: {formatTicketPrice(summary.revenueConfirmed)}
        </span>
      ) : null}
      {summary.expensesPaid > 0 ? (
        <span className="public-badge-muted">
          Gastos: {formatTicketPrice(summary.expensesPaid)}
        </span>
      ) : null}
      <span className={profitClass}>{summary.profitBadgeLabel}</span>
      {pendingSalesCount > 0 && ventasHref ? (
        <a href={ventasHref} className="public-badge-warning hover:opacity-90">
          {pendingSalesCount} venta{pendingSalesCount === 1 ? "" : "s"} por confirmar
        </a>
      ) : null}
      {gestionHref ? (
        <a href={gestionHref} className="public-badge-muted hover:opacity-90">
          Ver gestión
        </a>
      ) : null}
    </div>
  );
}
