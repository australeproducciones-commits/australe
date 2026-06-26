import type { ConversionFunnelStep } from "@/lib/admin/dashboard/metrics";
import type { TrafficSummary } from "@/lib/admin/dashboard/types";
import { formatDashboardNumber } from "@/lib/admin/dashboard/formatters";

type TrafficConversionPanelProps = {
  traffic: TrafficSummary;
  funnel: ConversionFunnelStep[];
};

export function TrafficConversionPanel({
  traffic,
  funnel,
}: TrafficConversionPanelProps) {
  if (!traffic.available) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-zinc-950/40 px-4 py-8 text-center text-sm text-zinc-400">
        La analítica no está disponible. Activá la migración de analítica para
        registrar visitas y conversión.
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="grid grid-cols-2 gap-3">
        <MetricMini label="Visitas" value={traffic.totalVisits} />
        <MetricMini label="Únicos" value={traffic.uniqueVisitors} />
        <MetricMini label="Hoy" value={traffic.visitsToday} />
        <MetricMini label="7 días" value={traffic.visits7d} />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Embudo de conversión
        </p>
        {funnel.length > 0 ? (
          <ol className="space-y-2">
            {funnel.map((step, index) => (
              <li key={step.id} className="relative pl-0">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      {formatDashboardNumber(step.value)} {step.label.toLowerCase()}
                    </p>
                    {step.rateFromPrevious != null && index > 0 ? (
                      <p className="mt-0.5 text-xs text-zinc-400">
                        ↓ {Math.round(step.rateFromPrevious)}% del paso anterior
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-sky-500/10 px-2 py-1 text-[10px] font-semibold text-sky-200 ring-1 ring-sky-400/20">
                    Paso {index + 1}
                  </span>
                </div>
                {index < funnel.length - 1 ? (
                  <div className="flex justify-center py-1 text-zinc-500" aria-hidden>
                    ↓
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-zinc-400">
            Todavía no hay suficientes datos para calcular el embudo.
          </p>
        )}
        <p className="text-[11px] text-zinc-500">{traffic.conversionFormula}</p>
      </div>
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums text-zinc-50">
        {formatDashboardNumber(value)}
      </p>
    </div>
  );
}
