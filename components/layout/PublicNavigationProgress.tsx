"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

function shouldStartNavigation(anchor: HTMLAnchorElement, event: MouseEvent): boolean {
  if (event.defaultPrevented) {
    return false;
  }

  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) {
    return false;
  }

  if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
    return false;
  }

  const protocol = href.split(":")[0]?.toLowerCase();
  if (protocol === "mailto" || protocol === "tel") {
    return false;
  }

  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return false;
  }

  if (url.origin !== window.location.origin) {
    return false;
  }

  const next = `${url.pathname}${url.search}`;
  const current = `${window.location.pathname}${window.location.search}`;

  return next !== current;
}

export function PublicNavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRouteRef = useRef(true);

  const clearTimers = useCallback(() => {
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const startProgress = useCallback(() => {
    clearTimers();
    setActive(true);
    setProgress(0);

    requestAnimationFrame(() => {
      setProgress(72);
    });
  }, [clearTimers]);

  const finishProgress = useCallback(() => {
    clearTimers();
    setProgress(100);

    hideTimerRef.current = setTimeout(() => {
      setActive(false);
      setProgress(0);
    }, 180);
  }, [clearTimers]);

  useEffect(() => {
    if (isFirstRouteRef.current) {
      isFirstRouteRef.current = false;
      return;
    }

    finishProgress();
  }, [routeKey, finishProgress]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a");
      if (!anchor || !shouldStartNavigation(anchor, event)) {
        return;
      }

      startProgress();
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [startProgress]);

  useEffect(() => {
    function handlePopState() {
      startProgress();
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [startProgress]);

  useEffect(() => clearTimers, [clearTimers]);

  if (!active) {
    return null;
  }

  return (
    <div
      className="public-nav-progress pointer-events-none absolute inset-x-0 bottom-0 z-[60] h-[2px] overflow-hidden"
      aria-hidden
    >
      <div
        className={cn(
          "public-nav-progress__bar h-full",
          progress >= 100 && "public-nav-progress__bar--complete",
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
