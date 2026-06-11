import type { EventImageFields } from "@/lib/events/utils";
import { getEventPrimaryImageUrl } from "@/lib/events/utils";
import { cn } from "@/lib/utils/cn";

export type EventImageVariant =
  | "banner"
  | "flyer"
  | "card"
  | "thumbnail"
  | "og";

const VARIANT_STYLES: Record<
  EventImageVariant,
  { aspect: string; rounded: string }
> = {
  banner: { aspect: "aspect-[12/5]", rounded: "rounded-2xl" },
  flyer: { aspect: "aspect-[4/5]", rounded: "rounded-2xl" },
  card: { aspect: "aspect-[4/3]", rounded: "rounded-xl" },
  thumbnail: { aspect: "aspect-video", rounded: "rounded-xl" },
  og: { aspect: "aspect-[1.91/1]", rounded: "rounded-xl" },
};

type EventImageProps = {
  event: EventImageFields;
  alt: string;
  variant?: EventImageVariant;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
};

export function EventImage({
  event,
  alt,
  variant = "card",
  className,
  imgClassName,
}: EventImageProps) {
  const src = getEventPrimaryImageUrl(event);
  const styles = VARIANT_STYLES[variant];

  if (!src) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 border border-[#E8DDF8] bg-gradient-to-br from-[#FBF7FF] via-[#F1E8FF] to-[#FFF9F4] text-center",
          styles.aspect,
          styles.rounded,
          className,
        )}
      >
        <span className="text-2xl text-[#C8B6FF]">✦</span>
        <span className="px-4 text-xs text-[#8B7A99]">Imagen próximamente</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-[#E8DDF8] bg-[#FBF7FF]",
        styles.aspect,
        styles.rounded,
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn("h-full w-full object-cover object-center", imgClassName)}
      />
    </div>
  );
}
