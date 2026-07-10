import type { CommunityBarDatum } from "@/lib/community/admin/dashboard-metrics";

type CommunityActivityChartProps = {
  data: CommunityBarDatum[];
};

export function CommunityActivityChart({ data }: CommunityActivityChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  if (data.every((d) => d.value === 0)) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
        Sin actividad registrada en los indicadores del período.
      </p>
    );
  }

  return (
    <div className="space-y-3" role="img" aria-label="Indicadores de actividad reciente">
      {data.map((datum) => {
        const width = Math.max((datum.value / max) * 100, datum.value > 0 ? 4 : 0);
        return (
          <div key={datum.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-zinc-400">{datum.label}</span>
              <span className="font-semibold tabular-nums text-zinc-100">
                {datum.value.toLocaleString("es-AR")}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800/80">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${width}%`,
                  background: `linear-gradient(90deg, ${datum.tone}, ${datum.tone}88)`,
                  boxShadow: `0 0 12px ${datum.tone}33`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
