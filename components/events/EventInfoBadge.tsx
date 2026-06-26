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
    "border-[rgba(155,126,222,0.18)] bg-[rgba(251,247,255,0.92)] text-[var(--public-text-secondary)]",
  primary:
    "border-[rgba(155,126,222,0.28)] bg-[rgba(155,126,222,0.12)] text-[var(--public-primary-hover)]",
  community:
    "border-[rgba(155,126,222,0.24)] bg-[rgba(237,228,255,0.9)] text-[#5b4a7a]",
  success:
    "border-[rgba(95,168,130,0.28)] bg-[rgba(224,245,234,0.92)] text-[#2f6b52]",
  warning:
    "border-[rgba(214,168,72,0.28)] bg-[rgba(255,244,214,0.95)] text-[#7a5a18]",
  featured:
    "border-[rgba(155,126,222,0.35)] bg-[rgba(155,126,222,0.16)] text-[var(--public-primary-hover)]",
  neutral:
    "border-[rgba(120,113,140,0.18)] bg-[rgba(248,246,252,0.95)] text-[var(--public-text-secondary)]",
  live:
    "border-[rgba(214,96,96,0.28)] bg-[rgba(255,232,232,0.95)] text-[#9a3f3f]",
  finished:
    "border-[rgba(120,113,140,0.2)] bg-[rgba(241,239,245,0.95)] text-[#5f5a6d]",
  soldOut:
    "border-[rgba(176,96,96,0.22)] bg-[rgba(248,236,236,0.95)] text-[#8a4545]",
  upcoming:
    "border-[rgba(214,168,72,0.28)] bg-[rgba(255,244,214,0.95)] text-[#7a5a18]",
  multiDay:
    "border-[rgba(155,126,222,0.22)] bg-[rgba(243,236,255,0.95)] text-[#6b4f9a]",
  gallery:
    "border-[rgba(127,168,196,0.24)] bg-[rgba(232,244,252,0.95)] text-[#3f6278]",
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
