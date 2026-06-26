"use client";

import { useMemo, useState } from "react";
import type { DailyRevenuePoint } from "@/lib/admin/dashboard/types";
import {
  formatDashboardCurrency,
  formatShortDayLabel,
} from "@/lib/admin/dashboard/formatters";
import { cn } from "@/lib/utils/cn";

type RevenueChartProps = {
  series: DailyRevenuePoint[];
  rangeLabel: string;
  totalRevenue: number;
  trendPercent: number | null;
  emptyMessage?: string;
};

type HoverPoint = {
  index: number;
  x: number;
  y: number;
};

export function RevenueChart({
  series,
  rangeLabel,
  totalRevenue,
  trendPercent,
  emptyMessage = "Todavía no hay recaudación confirmada para este período.",
}: RevenueChartProps) {
  const [hover, setHover] = useState<HoverPoint | null>(null);

  const chart = useMemo(() => {
    if (series.length === 0) {
      return null;
    }

    const width = 640;
    const height = 220;
    const padding = { top: 16, right: 12, bottom: 28, left: 12 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max(...series.map((point) => point.total), 1);

    const points = series.map((point, index) => {
      const x =
        padding.left +
        (series.length === 1
          ? innerWidth / 2
          : (index / (series.length - 1)) * innerWidth);
      const y = padding.top + innerHeight - (point.total / maxValue) * innerHeight;
      return { ...point, x, y, index };
    });

    const areaPath = [
      `M ${points[0]?.x ?? 0} ${padding.top + innerHeight}`,
      ...points.map((point) => `L ${point.x} ${point.y}`),
      `L ${points[points.length - 1]?.x ?? 0} ${padding.top + innerHeight}`,
      "Z",
    ].join(" ");

    const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

    return {
      width,
      height,
      padding,
      innerHeight,
      maxValue,
      points,
      areaPath,
      linePath,
    };
  }, [series]);

  if (!chart) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-zinc-950/40 px-4 text-center text-sm text-zinc-400">
        {emptyMessage}
      </div>
    );
  }

  const activePoint =
    hover != null ? chart.points[hover.index] ?? null : chart.points[chart.points.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
            Recaudación · {rangeLabel}
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-50">
            {formatDashboardCurrency(totalRevenue)}
          </p>
          {trendPercent != null ? (
            <p className="mt-1 text-xs text-zinc-400">
              Variación en el período:{" "}
              <span
                className={cn(
                  "font-semibold",
                  trendPercent >= 0 ? "text-emerald-300" : "text-rose-300",
                )}
              >
                {trendPercent >= 0 ? "+" : ""}
                {trendPercent.toLocaleString("es-AR")}%
              </span>
            </p>
          ) : null}
        </div>

        {activePoint ? (
          <div className="rounded-xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-300">
            <p className="font-medium text-zinc-100">
              {formatShortDayLabel(activePoint.date)}
            </p>
            <p>Total: {formatDashboardCurrency(activePoint.total)}</p>
            <p>Entradas: {formatDashboardCurrency(activePoint.tickets)}</p>
            <p>Consumiciones: {formatDashboardCurrency(activePoint.kiosk)}</p>
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="h-auto w-full min-w-[320px]"
          role="img"
          aria-label="Gráfico de recaudación"
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="revenue-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((ratio) => {
            const y = chart.padding.top + chart.innerHeight * ratio;
            return (
              <line
                key={ratio}
                x1={chart.padding.left}
                x2={chart.width - chart.padding.right}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
              />
            );
          })}

          {chart.points.map((point) => {
            const barHeight =
              (point.total / chart.maxValue) * (chart.innerHeight * 0.18);
            const barY = chart.padding.top + chart.innerHeight - barHeight;
            return (
              <rect
                key={`bar-${point.date}`}
                x={point.x - 4}
                y={barY}
                width={8}
                height={Math.max(barHeight, 0)}
                fill="rgba(56,189,248,0.35)"
                rx={2}
              />
            );
          })}

          <path d={chart.areaPath} fill="url(#revenue-area)" />
          <path
            d={chart.linePath}
            fill="none"
            stroke="#c084fc"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {chart.points.map((point) => (
            <g key={point.date}>
              <circle
                cx={point.x}
                cy={point.y}
                r={hover?.index === point.index ? 5 : 3}
                fill={hover?.index === point.index ? "#f4f4f5" : "#c084fc"}
              />
              <rect
                x={point.x - 12}
                y={chart.padding.top}
                width={24}
                height={chart.innerHeight}
                fill="transparent"
                onMouseEnter={() =>
                  setHover({ index: point.index, x: point.x, y: point.y })
                }
              />
            </g>
          ))}

          {chart.points.map((point, index) =>
            index % Math.max(1, Math.floor(chart.points.length / 6)) === 0 ||
            index === chart.points.length - 1 ? (
              <text
                key={`label-${point.date}`}
                x={point.x}
                y={chart.height - 8}
                textAnchor="middle"
                fontSize="11"
                fill="#a1a1aa"
              >
                {formatShortDayLabel(point.date)}
              </text>
            ) : null,
          )}
        </svg>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-4 rounded-sm bg-purple-400/80" />
          Recaudación total
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-4 rounded-sm bg-sky-400/50" />
          Actividad diaria
        </span>
      </div>
    </div>
  );
}
