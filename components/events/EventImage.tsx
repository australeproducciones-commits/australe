"use client";

import Image from "next/image";
import { useState } from "react";
import {
  DEFAULT_EVENT_IMAGE,
  getEventImage,
  hasCustomEventImage,
  type EventImageFields,
} from "@/lib/events/getEventImage";
import { isNextImageOptimizable } from "@/lib/utils/imageHosts";
import { cn } from "@/lib/utils/cn";

export type EventImageVariant =
  | "banner"
  | "flyer"
  | "card"
  | "thumbnail"
  | "og";

const VARIANT_STYLES: Record<
  EventImageVariant,
  { aspect: string; rounded: string; sizes: string }
> = {
  banner: {
    aspect: "aspect-[12/5]",
    rounded: "rounded-t-2xl",
    sizes: "(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1152px",
  },
  flyer: {
    aspect: "aspect-[4/5]",
    rounded: "rounded-2xl",
    sizes: "(max-width: 768px) 90vw, 400px",
  },
  card: {
    aspect: "aspect-[12/5]",
    rounded: "rounded-t-xl",
    sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 560px",
  },
  thumbnail: {
    aspect: "aspect-video",
    rounded: "rounded-xl",
    sizes: "(max-width: 768px) 40vw, 160px",
  },
  og: {
    aspect: "aspect-[1.91/1]",
    rounded: "rounded-xl",
    sizes: "1200px",
  },
};

type EventImageBaseProps = {
  alt: string;
  variant?: EventImageVariant;
  className?: string;
  imageClassName?: string;
  roundedClass?: string;
  priority?: boolean;
  sizes?: string;
  showBlurredBackground?: boolean;
};

type EventImageFromEvent = EventImageBaseProps & {
  event: EventImageFields;
  src?: never;
};

type EventImageFromSrc = EventImageBaseProps & {
  src: string;
  event?: never;
};

export type EventImageProps = EventImageFromEvent | EventImageFromSrc;

export function EventImage(props: EventImageProps) {
  const {
    alt,
    variant = "card",
    className,
    imageClassName,
    roundedClass,
    priority = false,
    sizes,
    showBlurredBackground = true,
  } = props;

  const resolvedSrc =
    "event" in props && props.event
      ? getEventImage(props.event)
      : props.src ?? DEFAULT_EVENT_IMAGE;

  const hasCustom =
    "event" in props && props.event
      ? hasCustomEventImage(props.event)
      : resolvedSrc !== DEFAULT_EVENT_IMAGE;

  const styles = VARIANT_STYLES[variant];
  const [failed, setFailed] = useState(false);
  const displaySrc = failed ? DEFAULT_EVENT_IMAGE : resolvedSrc;
  const showBlur = showBlurredBackground && hasCustom && !failed;

  if (!hasCustom || failed) {
    return (
      <EventImageFallback
        variant={variant}
        className={className}
        roundedClass={roundedClass}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden border",
        styles.aspect,
        roundedClass ?? styles.rounded,
        className,
      )}
      style={{
        borderColor: "var(--public-border)",
        backgroundColor: "var(--public-card-tint)",
      }}
    >
      {showBlur ? (
        <Image
          src={displaySrc}
          alt=""
          aria-hidden
          fill
          sizes={sizes ?? styles.sizes}
          className="scale-110 object-cover opacity-35 blur-2xl"
          unoptimized={!isNextImageOptimizable(displaySrc)}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, var(--public-bg-section) 0%, var(--public-card-tint) 100%)",
          }}
          aria-hidden
        />
      )}

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#8568CC]/10 via-transparent to-transparent"
        aria-hidden
      />

      <Image
        src={displaySrc}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes ?? styles.sizes}
        className={cn(
          "relative z-10 object-contain object-center motion-safe:transition motion-safe:duration-300",
          imageClassName,
        )}
        unoptimized={!isNextImageOptimizable(displaySrc)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function EventImageFallback({
  variant,
  className,
  roundedClass,
}: {
  variant: EventImageVariant;
  className?: string;
  roundedClass?: string;
}) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 border text-center",
        styles.aspect,
        roundedClass ?? styles.rounded,
        className,
      )}
      style={{
        borderColor: "var(--public-border)",
        background: "var(--public-image-fallback)",
      }}
    >
      <span className="text-2xl" style={{ color: "var(--public-secondary)" }}>
        ✦
      </span>
      <span className="px-4 text-xs public-text-soft">Imagen próximamente</span>
    </div>
  );
}
