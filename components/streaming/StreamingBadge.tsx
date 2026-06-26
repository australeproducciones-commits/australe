import { STREAM_STATUS_LABELS, type StreamStatus } from "@/lib/streaming/types";
import { getStatusBadgeVariant } from "@/lib/streaming/utils";
import { cn } from "@/lib/utils/cn";

type StreamingBadgeProps = {
  status: StreamStatus;
  className?: string;
};

export function StreamingBadge({ status, className }: StreamingBadgeProps) {
  const variant = getStatusBadgeVariant(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]",
        variant === "live" && "bg-red-600 text-white",
        variant === "scheduled" && "bg-purple-100 text-purple-800",
        variant === "paused" && "bg-amber-100 text-amber-900",
        variant === "ended" && "bg-zinc-200 text-zinc-700",
        variant === "draft" && "bg-zinc-100 text-zinc-600",
        className,
      )}
      aria-label={`Estado: ${STREAM_STATUS_LABELS[status]}`}
    >
      {status === "live" ? "EN VIVO" : STREAM_STATUS_LABELS[status]}
    </span>
  );
}
