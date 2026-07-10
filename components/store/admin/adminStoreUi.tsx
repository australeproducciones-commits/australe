import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export const adminStoreFieldClass =
  "w-full rounded-lg border border-zinc-700/80 bg-zinc-900/80 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/40";

export const adminStoreLabelClass = "mb-1 block text-xs font-medium text-zinc-400";

export function AdminStoreField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={adminStoreLabelClass}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function AdminStoreStatusBadge({
  active,
  status,
}: {
  active: boolean;
  status: string;
}) {
  const tone =
    status === "archived"
      ? "bg-zinc-700/60 text-zinc-300"
      : active
        ? "bg-emerald-500/15 text-emerald-300"
        : "bg-amber-500/15 text-amber-300";

  const label =
    status === "archived" ? "Archivado" : active ? "Activo" : "Inactivo";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tone,
      )}
    >
      {label}
    </span>
  );
}
