import { EventInfoBadge } from "@/components/events/EventInfoBadge";
import { cn } from "@/lib/utils/cn";

type StoreMerchBadgeProps = {
  label?: string;
  className?: string;
  size?: "default" | "compact" | "hero";
};

export function StoreMerchBadge({
  label = "MERCH DISPONIBLE",
  className,
  size = "default",
}: StoreMerchBadgeProps) {
  return (
    <EventInfoBadge
      tone="featured"
      className={cn(
        "border-[rgba(214,168,72,0.45)] bg-[rgba(255,236,180,0.95)] font-semibold uppercase tracking-wide text-[#6b4f12] shadow-sm",
        size === "compact" && "text-[10px] px-2 py-0.5",
        size === "hero" && "text-xs sm:text-sm px-3 py-1",
        className,
      )}
    >
      {label}
    </EventInfoBadge>
  );
}
