import type { DashboardMetricTone } from "@/lib/admin/dashboard/metrics";
import { cn } from "@/lib/utils/cn";

const strokeByTone: Record<DashboardMetricTone, string> = {
  green: "#34d399",
  yellow: "#fbbf24",
  red: "#fb7185",
  blue: "#38bdf8",
  neutral: "#a1a1aa",
};

type SparklineProps = {
  values: number[];
  tone?: DashboardMetricTone;
  className?: string;
};

export function Sparkline({
  values,
  tone = "neutral",
  className,
}: SparklineProps) {
  if (values.length < 2) {
    return null;
  }

  const width = 80;
  const height = 32;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("opacity-90", className)}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={strokeByTone[tone]}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
