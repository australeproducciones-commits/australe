import type { Partner } from "@/lib/site/types";
import { cn } from "@/lib/utils/cn";

type AdminPartnersSummaryMetricsProps = {
  partners: Partner[];
};

function MetricTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "green" | "blue" | "purple";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-400/20 bg-emerald-500/5"
      : tone === "blue"
        ? "border-sky-400/20 bg-sky-500/5"
        : tone === "purple"
          ? "border-purple-400/20 bg-purple-500/5"
          : "border-white/10 bg-zinc-900/50";

  return (
    <div className={cn("rounded-xl border px-3 py-2.5", toneClass)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums text-zinc-50">{value}</p>
    </div>
  );
}

export function AdminPartnersSummaryMetrics({
  partners,
}: AdminPartnersSummaryMetricsProps) {
  const active = partners.filter((p) => p.is_active).length;
  const views = partners.reduce((sum, p) => sum + p.view_count, 0);
  const clicks = partners.reduce((sum, p) => sum + p.click_count, 0);

  return (
    <section
      aria-label="Métricas de partners"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      <MetricTile label="Total partners" value={partners.length.toLocaleString("es-AR")} />
      <MetricTile
        label="Activos"
        value={active.toLocaleString("es-AR")}
        tone="green"
      />
      <MetricTile
        label="Vistas totales"
        value={views.toLocaleString("es-AR")}
        tone="blue"
      />
      <MetricTile
        label="Clics totales"
        value={clicks.toLocaleString("es-AR")}
        tone="purple"
      />
    </section>
  );
}
