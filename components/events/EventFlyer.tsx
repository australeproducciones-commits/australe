import type { Event } from "@/lib/events/types";
import { cn } from "@/lib/utils/cn";

type EventFlyerProps = {
  event: Pick<Event, "name" | "flyer_url" | "banner_url">;
  variant?: "card" | "hero";
  className?: string;
};

export function EventFlyer({
  event,
  variant = "card",
  className,
}: EventFlyerProps) {
  const imageUrl = event.flyer_url || event.banner_url;
  const heightClass =
    variant === "hero" ? "min-h-[280px] sm:min-h-[360px]" : "h-40 sm:h-48";

  if (imageUrl) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-zinc-900",
          heightClass,
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`Flyer de ${event.name}`}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-500",
        heightClass,
        className,
      )}
    >
      Sin flyer
    </div>
  );
}
