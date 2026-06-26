import type { OperationalStatusRow } from "@/lib/admin/dashboard/metrics";
import { cn } from "@/lib/utils/cn";

const dotByTone: Record<OperationalStatusRow["tone"], string> = {
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-rose-400",
  blue: "bg-sky-400",
  neutral: "bg-zinc-500",
};

type OperationalStatusPanelProps = {
  rows: OperationalStatusRow[];
};

export function OperationalStatusPanel({ rows }: OperationalStatusPanelProps) {
  return (
    <ul className="space-y-1">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-transparent px-2 py-2 transition hover:border-white/10 hover:bg-white/[0.03]"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={cn("h-2 w-2 shrink-0 rounded-full", dotByTone[row.tone])}
              aria-hidden
            />
            <span className="truncate text-sm text-zinc-300">{row.label}</span>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-100">
            {typeof row.value === "number"
              ? row.value.toLocaleString("es-AR")
              : row.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
