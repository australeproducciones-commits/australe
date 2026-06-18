type ChartSeries = {
  key: string;
  label: string;
  color: string;
  values: number[];
};

type SimpleBarChartProps = {
  labels: string[];
  series: ChartSeries[];
  height?: number;
  formatValue?: (value: number) => string;
  emptyMessage?: string;
};

function formatShortDate(ymd: string): string {
  const [, month, day] = ymd.split("-");
  return `${day}/${month}`;
}

export function SimpleBarChart({
  labels,
  series,
  height = 180,
  formatValue = (v) => String(v),
  emptyMessage = "Sin datos para este período",
}: SimpleBarChartProps) {
  if (labels.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--public-text-soft)]">
        {emptyMessage}
      </p>
    );
  }

  const maxValue = Math.max(
    1,
    ...series.flatMap((s) => s.values),
  );

  const barGroupWidth = 100 / labels.length;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 100 ${height}`}
        className="h-auto w-full min-w-[280px]"
        role="img"
        aria-label="Gráfico de barras"
      >
        {labels.map((label, index) => {
          const x = index * barGroupWidth + barGroupWidth * 0.1;
          const groupInner = barGroupWidth * 0.8;
          const barWidth = groupInner / Math.max(series.length, 1);

          return (
            <g key={label}>
              {series.map((s, seriesIndex) => {
                const value = s.values[index] ?? 0;
                const barHeight = (value / maxValue) * (height - 30);
                const bx = x + seriesIndex * barWidth;
                const by = height - 20 - barHeight;

                return (
                  <rect
                    key={s.key}
                    x={bx}
                    y={by}
                    width={Math.max(barWidth - 0.5, 0.5)}
                    height={Math.max(barHeight, 0)}
                    fill={s.color}
                    rx={0.5}
                  >
                    <title>
                      {s.label} · {formatShortDate(label)}: {formatValue(value)}
                    </title>
                  </rect>
                );
              })}
              <text
                x={x + groupInner / 2}
                y={height - 4}
                textAnchor="middle"
                fontSize="3"
                fill="var(--public-text-soft)"
              >
                {formatShortDate(label)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap gap-3">
        {series.map((s) => (
          <span
            key={s.key}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--public-text-secondary)]"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
