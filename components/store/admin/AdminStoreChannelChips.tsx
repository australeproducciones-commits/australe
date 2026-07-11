"use client";

import type { StoreChannelChip } from "@/lib/store/adminHub";
import { cn } from "@/lib/utils/cn";

const chipStyles: Record<StoreChannelChip["id"], string> = {
  tienda: "bg-violet-500/15 text-violet-200",
  eventos: "bg-sky-500/15 text-sky-200",
  "solo-evento": "bg-sky-500/15 text-sky-200",
  comunidad: "bg-emerald-500/15 text-emerald-200",
  "tienda-eventos": "bg-violet-500/15 text-violet-200",
  "sin-canal": "bg-zinc-700/50 text-zinc-300",
  agotado: "bg-red-500/15 text-red-300",
  inactivo: "bg-zinc-700/60 text-zinc-400",
};

export function AdminStoreChannelChips({
  chips,
  className,
}: {
  chips: StoreChannelChip[];
  className?: string;
}) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {chips.map((chip) => (
        <span
          key={`${chip.id}-${chip.label}`}
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            chipStyles[chip.id],
          )}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

export function AdminStoreWarnings({
  warnings,
}: {
  warnings: string[];
}) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
      {warnings.map((warning) => (
        <li key={warning}>• {warning}</li>
      ))}
    </ul>
  );
}

export const adminStoreTabClass = (active: boolean) =>
  cn(
    "rounded-lg px-3 py-2 text-xs font-medium transition",
    active
      ? "bg-violet-600 text-white"
      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
  );
