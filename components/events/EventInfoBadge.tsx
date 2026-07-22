import { cn } from "@/lib/utils/cn";

export type EventInfoBadgeTone =
  | "default"
  | "primary"
  | "community"
  | "success"
  | "warning"
  | "featured"
  | "neutral"
  | "live"
  | "finished"
  | "soldOut"
  | "upcoming"
  | "multiDay"
  | "gallery";

type EventInfoBadgeProps = {
  children: React.ReactNode;
  icon?: React.ReactNode;
  tone?: EventInfoBadgeTone;
  className?: string;
};

const toneStyles: Record<EventInfoBadgeTone, string> = {
  default:
    "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] text-[var(--public-text-secondary)]",
  primary:
    "border-[rgba(167,139,219,0.35)] bg-[rgba(167,139,219,0.15)] text-[var(--public-primary-hover)]",
  community:
    "border-[rgba(232,196,104,0.35)] bg-[rgba(232,196,104,0.12)] text-[var(--australe-warning-foreground)]",
  success:
    "border-[rgba(107,196,168,0.35)] bg-[rgba(107,196,168,0.12)] text-[var(--public-fresh-foreground)]",
  warning:
    "border-[rgba(232,196,104,0.35)] bg-[rgba(232,196,104,0.12)] text-[var(--australe-warning-foreground)]",
  featured:
    "border-[rgba(167,139,219,0.4)] bg-[rgba(167,139,219,0.18)] text-[var(--public-primary-hover)]",
  neutral:
    "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--public-text-secondary)]",
  live:
    "border-[rgba(248,113,113,0.4)] bg-[rgba(248,113,113,0.12)] text-[#fecaca]",
  finished:
    "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] text-[var(--public-text-soft)]",
  soldOut:
    "border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.1)] text-[#fca5a5]",
  upcoming:
    "border-[rgba(232,196,104,0.35)] bg-[rgba(232,196,104,0.12)] text-[var(--australe-warning-foreground)]",
  multiDay:
    "border-[rgba(167,139,219,0.3)] bg-[rgba(167,139,219,0.12)] text-[var(--public-primary-hover)]",
  gallery:
    "border-[rgba(96,165,250,0.3)] bg-[rgba(96,165,250,0.1)] text-[#93c5fd]",
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
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium leading-snug tracking-[0.01em] backdrop-blur-[2px]",
        toneStyles[tone],
        className,
      )}
    >
      {icon ? (
        <span className="shrink-0 opacity-85" aria-hidden>
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
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      {children}
    </svg>
  );
}
