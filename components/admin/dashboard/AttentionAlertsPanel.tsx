import Link from "next/link";
import type { AlertItem } from "@/lib/admin/dashboard/types";
import { cn } from "@/lib/utils/cn";

const severityMeta = {
  high: {
    label: "Crítico",
    border: "border-l-rose-400",
    badge: "bg-rose-500/15 text-rose-100 ring-rose-400/30",
    dot: "bg-rose-400",
  },
  medium: {
    label: "Advertencia",
    border: "border-l-amber-400",
    badge: "bg-amber-500/15 text-amber-100 ring-amber-400/30",
    dot: "bg-amber-400",
  },
  low: {
    label: "Información",
    border: "border-l-sky-400",
    badge: "bg-sky-500/15 text-sky-100 ring-sky-400/30",
    dot: "bg-sky-400",
  },
} as const;

type AttentionAlertsPanelProps = {
  alerts: AlertItem[];
};

export function AttentionAlertsPanel({ alerts }: AttentionAlertsPanelProps) {
  const sortedAlerts = [...alerts].sort((left, right) => {
    const order = { high: 0, medium: 1, low: 2 } as const;
    return order[left.severity] - order[right.severity];
  });

  if (sortedAlerts.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-emerald-100">
            Todo está funcionando correctamente
          </p>
          <p className="mt-1 text-xs text-emerald-200/80">
            No hay alertas críticas ni advertencias pendientes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {sortedAlerts.map((alert) => {
        const meta = severityMeta[alert.severity];
        return (
          <li key={alert.id}>
            <Link
              href={alert.href}
              className={cn(
                "block rounded-xl border border-white/10 bg-zinc-950/50 p-3 transition hover:border-white/20 hover:bg-zinc-950/80",
                "border-l-[3px]",
                meta.border,
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", meta.dot)} aria-hidden />
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                        meta.badge,
                      )}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-zinc-100">
                    {alert.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-zinc-400">
                    {alert.description}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
