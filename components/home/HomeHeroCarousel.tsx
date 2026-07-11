"use client";

import {
  useEffect,
  useState,
  type ReactElement,
} from "react";
import { cn } from "@/lib/utils/cn";

const DEFAULT_INTERVAL_MS = 5500;

type HomeHeroCarouselProps = {
  slides: ReactElement[];
  ariaLabel: string;
  intervalMs?: number;
  className?: string;
};

export function HomeHeroCarousel({
  slides,
  ariaLabel,
  intervalMs = DEFAULT_INTERVAL_MS,
  className,
}: HomeHeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const activeIndex = count > 0 ? index % count : 0;

  useEffect(() => {
    if (count <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [count, intervalMs]);

  if (count === 0) {
    return null;
  }

  if (count === 1) {
    return <div className={className}>{slides[0]}</div>;
  }

  return (
    <div
      className={cn("relative", className)}
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      {slides.map((slide, slideIndex) => {
        const isActive = slideIndex === activeIndex;

        return (
          <div
            key={slide.key ?? slideIndex}
            className={cn(
              "motion-safe:transition-opacity motion-safe:duration-500 motion-safe:ease-in-out",
              isActive
                ? "relative opacity-100"
                : "pointer-events-none absolute inset-0 opacity-0",
            )}
            aria-hidden={!isActive}
          >
            {slide}
          </div>
        );
      })}
    </div>
  );
}
