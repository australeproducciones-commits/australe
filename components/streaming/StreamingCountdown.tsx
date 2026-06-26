"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

type StreamingCountdownProps = {
  targetIso: string;
  className?: string;
  onComplete?: () => void;
};

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

function getCountdownParts(targetIso: string, nowMs: number): CountdownParts {
  const targetMs = Date.parse(targetIso);
  if (Number.isNaN(targetMs)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const diff = targetMs - nowMs;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, expired: false };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function StreamingCountdown({
  targetIso,
  className,
  onComplete,
}: StreamingCountdownProps) {
  const [parts, setParts] = useState<CountdownParts | null>(null);

  useEffect(() => {
    const tick = () => {
      const next = getCountdownParts(targetIso, Date.now());
      setParts(next);
      if (next.expired) {
        onComplete?.();
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [targetIso, onComplete]);

  if (!parts) {
    return (
      <p
        className={cn("text-sm font-medium text-purple-700", className)}
        aria-hidden="true"
      >
        Calculando…
      </p>
    );
  }

  if (parts.expired) {
    return (
      <p className={cn("text-sm font-medium text-purple-700", className)}>
        Comienza pronto
      </p>
    );
  }

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="timer"
      aria-live="polite"
      aria-label="Cuenta regresiva para la transmisión"
    >
      {parts.days > 0 ? (
        <CountdownUnit label="días" value={pad(parts.days)} />
      ) : null}
      <CountdownUnit label="horas" value={pad(parts.hours)} />
      <CountdownUnit label="min" value={pad(parts.minutes)} />
      <CountdownUnit label="seg" value={pad(parts.seconds)} />
    </div>
  );
}

function CountdownUnit({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[3.25rem] rounded-xl border border-purple-100 bg-white/90 px-2 py-2 text-center shadow-sm">
      <div className="text-lg font-black tabular-nums text-purple-900">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-purple-500">
        {label}
      </div>
    </div>
  );
}
