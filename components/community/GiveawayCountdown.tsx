"use client";

import { useEffect, useState } from "react";

type GiveawayCountdownProps = {
  targetIso: string | null;
  label?: string;
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Finalizado";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function computeRemaining(targetIso: string | null): string {
  if (!targetIso) return "—";
  return formatRemaining(new Date(targetIso).getTime() - Date.now());
}

export function GiveawayCountdown({
  targetIso,
  label = "Cierra en",
}: GiveawayCountdownProps) {
  const [remaining, setRemaining] = useState(() => computeRemaining(targetIso));

  useEffect(() => {
    if (!targetIso) return;

    const target = new Date(targetIso).getTime();
    const id = window.setInterval(() => {
      setRemaining(formatRemaining(target - Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [targetIso]);

  if (!targetIso) return null;

  return (
    <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-purple-300/80">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-white">{remaining}</p>
    </div>
  );
}
