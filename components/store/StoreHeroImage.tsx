"use client";

import Image from "next/image";
import { useState } from "react";
import { isNextImageOptimizable } from "@/lib/utils/imageHosts";
import { cn } from "@/lib/utils/cn";

type StoreHeroImageProps = {
  src: string | null;
  alt: string;
  priority?: boolean;
  sizes: string;
  variant?: "default" | "campaign";
  aspectClassName?: string;
  imageClassName?: string;
  className?: string;
};

export function StoreHeroImageFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center",
        className,
      )}
      style={{
        background:
          "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(167, 139, 219, 0.14), transparent 65%), var(--public-image-fallback)",
      }}
      aria-hidden
    >
      <div
        className="h-16 w-16 rounded-full border border-purple-400/25 bg-purple-400/10"
        style={{ boxShadow: "0 0 40px rgba(167, 139, 219, 0.2)" }}
      />
      <p className="max-w-[14rem] text-sm leading-relaxed text-[var(--public-text-soft)]">
        Campaña oficial Australe
      </p>
    </div>
  );
}

export function StoreHeroImage({
  src,
  alt,
  priority = false,
  sizes,
  variant = "default",
  aspectClassName = "aspect-square",
  imageClassName,
  className,
}: StoreHeroImageProps) {
  const [failed, setFailed] = useState(false);
  const isCampaign = variant === "campaign";

  if (!src || failed) {
    return (
      <div
        className={cn(
          "relative overflow-hidden",
          isCampaign && "store-hero-campaign-visual",
          aspectClassName,
          className,
        )}
      >
        <StoreHeroImageFallback />
      </div>
    );
  }

  const optimizable = !isCampaign && isNextImageOptimizable(src);
  const imageClass = cn(
    "object-contain object-center",
    isCampaign && "store-hero-campaign-img absolute inset-0 h-full w-full",
    !isCampaign && "h-full w-full",
    imageClassName,
  );

  return (
    <div
      className={cn(
        "relative",
        isCampaign ? "store-hero-campaign-visual overflow-visible" : "overflow-hidden",
        aspectClassName,
        className,
      )}
    >
      {optimizable ? (
        <Image
          src={src}
          alt={alt}
          fill
          className={cn("object-contain object-center", imageClassName)}
          sizes={sizes}
          priority={priority}
          onError={() => setFailed(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={imageClass}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
