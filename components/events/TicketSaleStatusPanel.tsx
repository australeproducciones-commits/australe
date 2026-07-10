import type { TicketPublicSaleStatus } from "@/lib/tickets/getTicketPublicSaleStatus";
import { cn } from "@/lib/utils/cn";

type TicketSaleStatusPanelProps = {
  status: TicketPublicSaleStatus;
  className?: string;
};

const kindClass: Record<TicketPublicSaleStatus["kind"], string> = {
  coming_soon: "public-scada-sale-panel--soon",
  sale_active_with_end: "public-scada-sale-panel--active",
  sale_active_open: "public-scada-sale-panel--active",
  sale_ended: "public-scada-sale-panel--ended",
  sold_out: "public-scada-sale-panel--sold-out",
  unavailable: "public-scada-sale-panel--unavailable",
};

export function TicketSaleStatusPanel({
  status,
  className,
}: TicketSaleStatusPanelProps) {
  return (
    <div
      className={cn(
        "public-scada-sale-panel",
        kindClass[status.kind],
        className,
      )}
      role="status"
      aria-label={`Estado de venta: ${status.badge}`}
    >
      <span className="public-scada-sale-panel__badge">{status.badge}</span>
      <p className="public-scada-sale-panel__title public-heading mt-2 font-semibold">
        {status.title}
      </p>
      {status.dateLabel ? (
        <p className="public-scada-sale-panel__date mt-1 font-mono text-sm">
          {status.dateLabel}
        </p>
      ) : null}
      <p className="public-scada-sale-panel__secondary mt-2 text-sm">
        {status.secondary}
      </p>
    </div>
  );
}
