import { cn } from "@/lib/utils/cn";

export type EventInfoBadgeTone =
  | "default"
  | "primary"
  | "community"
  | "success"
  | "warning"
  | "featured"
  | "neutral";

type EventInfoBadgeProps = {
  children: React.ReactNode;
  icon?: React.ReactNode;
  tone?: EventInfoBadgeTone;
  className?: string;
};

const toneStyles: Record<EventInfoBadgeTone, string> = {
  default:
    "border-[var(--public-border)] bg-[var(--public-bg-section)] text-[var(--public-text-secondary)]",
  primary:
    "border-[rgba(155,126,222,0.25)] bg-[rgba(155,126,222,0.12)] text-[var(--public-primary-hover)]",
  community:
    "border-[rgba(242,193,78,0.35)] bg-[rgba(242,193,78,0.2)] text-[var(--public-text)]",
  success:
    "border-[rgba(127,216,190,0.35)] bg-[rgba(127,216,190,0.18)] text-[var(--public-fresh-foreground)]",
  warning:
    "border-[rgba(242,193,78,0.4)] bg-[rgba(242,193,78,0.22)] text-[var(--warning-foreground)]",
  featured:
    "border-[var(--public-primary)] bg-[var(--public-primary)] text-white",
  neutral:
    "border-[var(--public-border)] bg-[var(--public-card-tint)] text-[var(--public-text-secondary)]",
};

export function EventInfoBadge({
  children,
  icon,
  tone = "default",
  className,
}: EventInfoBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold leading-snug",
        toneStyles[tone],
        className,
      )}
    >
      {icon ? (
        <span className="shrink-0 opacity-80" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}

export function EventInfoBadgeIcon({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      {children}
    </svg>
  );
}
