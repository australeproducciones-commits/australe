import type { DashboardMetricTone } from "@/lib/admin/dashboard/metrics";
import { formatTrendLabel } from "@/lib/admin/dashboard/formatters";
import { cn } from "@/lib/utils/cn";
import { Sparkline } from "@/components/admin/dashboard/Sparkline";

const toneStyles: Record<
  DashboardMetricTone,
  { border: string; badge: string; dot: string; soft: string }
> = {
  green: {
    border: "border-l-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
    dot: "bg-emerald-400",
    soft: "from-emerald-500/10",
  },
  yellow: {
    border: "border-l-amber-400",
    badge: "bg-amber-500/15 text-amber-100 ring-amber-400/30",
    dot: "bg-amber-400",
    soft: "from-amber-500/10",
  },
  red: {
    border: "border-l-rose-400",
    badge: "bg-rose-500/15 text-rose-100 ring-rose-400/30",
    dot: "bg-rose-400",
    soft: "from-rose-500/10",
  },
  blue: {
    border: "border-l-sky-400",
    badge: "bg-sky-500/15 text-sky-100 ring-sky-400/30",
    dot: "bg-sky-400",
    soft: "from-sky-500/10",
  },
  neutral: {
    border: "border-l-zinc-500",
    badge: "bg-zinc-500/15 text-zinc-200 ring-zinc-400/20",
    dot: "bg-zinc-400",
    soft: "from-zinc-500/10",
  },
};

type DashboardMetricCardProps = {
  label: string;
  value: string;
  sublabel?: string;
  tone?: DashboardMetricTone;
  badge?: string;
  trendPercent?: number | null;
  sparkline?: number[];
};

export function DashboardMetricCard({
  label,
  value,
  sublabel,
  tone = "neutral",
  badge,
  trendPercent = null,
  sparkline = [],
}: DashboardMetricCardProps) {
  const styles = toneStyles[tone];
  const trend = formatTrendLabel(trendPercent);

  return (
    <article
      className={cn(
        "relative flex min-h-[118px] flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br to-zinc-900/90 p-3.5 sm:p-4",
        "border-l-[3px]",
        styles.border,
        styles.soft,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            {label}
          </p>
          <p className="mt-1 break-words text-lg font-bold leading-tight text-zinc-50 sm:text-xl lg:text-2xl">
            {value}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {trend ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                trendPercent != null && trendPercent >= 0
                  ? "bg-emerald-500/10 text-emerald-200 ring-emerald-400/20"
                  : "bg-rose-500/10 text-rose-200 ring-rose-400/20",
              )}
              aria-label={`Variación ${trend}`}
            >
              {trendPercent != null && trendPercent >= 0 ? "↗" : "↘"} {trend}
            </span>
          ) : null}
          {badge ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                styles.badge,
              )}
            >
              {badge}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        {sublabel ? (
          <p className="line-clamp-2 text-[11px] leading-4 text-zinc-400">
            {sublabel}
          </p>
        ) : (
          <span />
        )}
        {sparkline.length > 1 ? (
          <Sparkline values={sparkline} tone={tone} className="h-8 w-20 shrink-0" />
        ) : null}
      </div>
    </article>
  );
}
