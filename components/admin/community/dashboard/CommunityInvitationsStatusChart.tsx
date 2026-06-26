import type { CommunityInvitationSlice } from "@/lib/community/admin/dashboard-metrics";

type CommunityInvitationsStatusChartProps = {
  slices: CommunityInvitationSlice[];
  total: number;
};

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function buildInvitationArcs(
  slices: CommunityInvitationSlice[],
  total: number,
  cx: number,
  cy: number,
  radius: number,
) {
  const arcs: Array<CommunityInvitationSlice & { path: string }> = [];
  let angleCursor = 0;

  for (const slice of slices) {
    const angle = (slice.value / total) * 360;
    const start = angleCursor;
    const end = angleCursor + angle;
    angleCursor = end;
    arcs.push({
      ...slice,
      path: describeArc(cx, cy, radius, start, end - 0.2),
    });
  }

  return arcs;
}

export function CommunityInvitationsStatusChart({
  slices,
  total,
}: CommunityInvitationsStatusChartProps) {
  if (total === 0 || slices.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
        Sin invitaciones registradas en el sistema.
      </p>
    );
  }

  const cx = 80;
  const cy = 80;
  const radius = 58;
  const stroke = 18;
  const arcs = buildInvitationArcs(slices, total, cx, cy, radius);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative mx-auto shrink-0 sm:mx-0">
        <svg
          viewBox="0 0 160 160"
          className="h-36 w-36"
          role="img"
          aria-label="Distribución de invitaciones por estado"
        >
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth={stroke}
          />
          {arcs.map((arc) => (
            <path
              key={arc.id}
              d={arc.path}
              fill="none"
              stroke={arc.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
            />
          ))}
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            className="fill-zinc-100 text-[18px] font-bold"
            style={{ fontSize: 18 }}
          >
            {total.toLocaleString("es-AR")}
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            className="fill-zinc-500 text-[9px] uppercase tracking-widest"
            style={{ fontSize: 9 }}
          >
            total
          </text>
        </svg>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {slices.map((slice) => (
          <li
            key={slice.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
                aria-hidden
              />
              <span className="truncate text-sm text-zinc-300">{slice.label}</span>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-100">
              {slice.value.toLocaleString("es-AR")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
