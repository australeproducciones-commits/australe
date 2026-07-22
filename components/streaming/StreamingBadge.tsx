import { STREAM_STATUS_LABELS, type StreamStatus } from "@/lib/streaming/types";
import { getStatusBadgeVariant } from "@/lib/streaming/utils";
import { cn } from "@/lib/utils/cn";

type StreamingBadgeProps = {
  status: StreamStatus;
  className?: string;
};

const variantToneClass: Record<string, string> = {
  live: "border-[rgba(248,113,113,0.4)] bg-[rgba(248,113,113,0.12)] text-[#fecaca]",
  scheduled:
    "border-[rgba(167,139,219,0.35)] bg-[rgba(167,139,219,0.15)] text-[var(--public-primary-hover)]",
  paused:
    "border-[rgba(232,196,104,0.35)] bg-[rgba(232,196,104,0.12)] text-[var(--australe-warning-foreground)]",
  ended:
    "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] text-[var(--public-text-soft)]",
  draft:
    "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--public-text-secondary)]",
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
