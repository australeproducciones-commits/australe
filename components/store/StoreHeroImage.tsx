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
  aspectClassName = "aspect-square",
  imageClassName,
  className,
}: StoreHeroImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={cn("relative overflow-hidden", aspectClassName, className)}>
        <StoreHeroImageFallback />
      </div>
    );
  }

  const optimizable = isNextImageOptimizable(src);

  return (
    <div className={cn("relative overflow-hidden", aspectClassName, className)}>
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
          className={cn("h-full w-full object-contain object-center", imageClassName)}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
