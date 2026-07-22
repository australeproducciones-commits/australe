"use client";

import {
  useCallback,
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
  showIndicators?: boolean;
};

export function HomeHeroCarousel({
  slides,
  ariaLabel,
  intervalMs = DEFAULT_INTERVAL_MS,
  className,
  showIndicators = true,
}: HomeHeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const count = slides.length;
  const activeIndex = count > 0 ? index % count : 0;

  const goTo = useCallback(
    (nextIndex: number) => {
      if (count <= 0) {
        return;
      }
      setPaused(true);
      setIndex(((nextIndex % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if (count <= 1 || paused || reducedMotion) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [count, intervalMs, paused, reducedMotion]);

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
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      {slides.map((slide, slideIndex) => {
        const isActive = slideIndex === activeIndex;

        return (
          <div
            key={slide.key ?? slideIndex}
            className={cn(
              "motion-safe:transition-opacity motion-safe:duration-700 motion-safe:ease-in-out",
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

      {showIndicators ? (
        <div
          className="home-hero-indicators pointer-events-none absolute inset-x-0 z-20 flex items-center justify-center gap-2"
          role="tablist"
          aria-label="Indicadores del carrusel"
        >
          {slides.map((slide, slideIndex) => {
            const isActive = slideIndex === activeIndex;
            return (
              <button
                key={slide.key ?? slideIndex}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Ir al slide ${slideIndex + 1} de ${count}`}
                className={cn(
                  "home-hero-dot pointer-events-auto motion-safe:transition-all motion-safe:duration-300",
                  isActive && "home-hero-dot--active",
                )}
                onClick={() => goTo(slideIndex)}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
