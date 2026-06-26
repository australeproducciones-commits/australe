import { STREAM_STATUS_LABELS, type StreamStatus } from "@/lib/streaming/types";
import { getStatusBadgeVariant } from "@/lib/streaming/utils";
import { cn } from "@/lib/utils/cn";

type StreamingBadgeProps = {
  status: StreamStatus;
  className?: string;
};

const variantToneClass: Record<string, string> = {
  live: "border-[rgba(214,96,96,0.28)] bg-[rgba(255,232,232,0.95)] text-[#9a3f3f]",
  scheduled:
    "border-[rgba(155,126,222,0.28)] bg-[rgba(243,236,255,0.95)] text-[#6b4f9a]",
  paused:
    "border-[rgba(214,168,72,0.28)] bg-[rgba(255,244,214,0.95)] text-[#7a5a18]",
  ended:
    "border-[rgba(120,113,140,0.2)] bg-[rgba(241,239,245,0.95)] text-[#5f5a6d]",
  draft:
    "border-[rgba(120,113,140,0.18)] bg-[rgba(248,246,252,0.95)] text-[var(--public-text-secondary)]",
};

export function StreamingBadge({ status, className }: StreamingBadgeProps) {
  const variant = getStatusBadgeVariant(status);
  const label = status === "live" ? "En vivo" : STREAM_STATUS_LABELS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium leading-snug",
        variantToneClass[variant],
        className,
      )}
      aria-label={`Estado: ${label}`}
    >
      {label}
    </span>
  );
}
