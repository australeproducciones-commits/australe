import { INTERNAL_ROLE_LABELS } from "@/lib/constants/roles";
import type { InternalRole } from "@/lib/users/types";
import { cn } from "@/lib/utils/cn";

const ROLE_STYLES: Record<InternalRole, string> = {
  admin: "bg-purple-500/20 text-purple-200 ring-purple-400/30",
  cashier: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/20",
  door: "bg-sky-500/15 text-sky-200 ring-sky-400/20",
};

type StaffRoleBadgeProps = {
  role: InternalRole;
  className?: string;
};

export function StaffRoleBadge({ role, className }: StaffRoleBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        ROLE_STYLES[role],
        className,
      )}
    >
      {INTERNAL_ROLE_LABELS[role]}
    </span>
  );
}
