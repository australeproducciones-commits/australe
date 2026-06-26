import type { CommunityHealthInsight } from "@/lib/community/admin/dashboard-metrics";
import { cn } from "@/lib/utils/cn";

const stylesByTone: Record<
  CommunityHealthInsight["tone"],
  { border: string; badge: string; dot: string }
> = {
  green: {
    border: "border-emerald-400/25 bg-emerald-500/5",
    badge: "bg-emerald-500/15 text-emerald-200",
    dot: "bg-emerald-400",
  },
  yellow: {
    border: "border-amber-400/25 bg-amber-500/5",
    badge: "bg-amber-500/15 text-amber-100",
    dot: "bg-amber-400",
  },
  red: {
    border: "border-rose-400/25 bg-rose-500/5",
    badge: "bg-rose-500/15 text-rose-100",
    dot: "bg-rose-400",
  },
  blue: {
    border: "border-sky-400/25 bg-sky-500/5",
    badge: "bg-sky-500/15 text-sky-100",
    dot: "bg-sky-400",
  },
  neutral: {
    border: "border-zinc-500/25 bg-zinc-500/5",
    badge: "bg-zinc-500/15 text-zinc-200",
    dot: "bg-zinc-400",
  },
};

type CommunityInsightsPanelProps = {
  insights: CommunityHealthInsight[];
};

export function CommunityInsightsPanel({ insights }: CommunityInsightsPanelProps) {
  return (
    <ul className="space-y-2">
      {insights.map((insight) => {
        const styles = stylesByTone[insight.tone];
        return (
          <li
            key={insight.id}
            className={cn(
              "rounded-xl border px-3.5 py-3",
              styles.border,
            )}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", styles.dot)}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-100">
                  {insight.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  {insight.detail}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
