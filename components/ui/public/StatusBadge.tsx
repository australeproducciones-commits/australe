import { cn } from "@/lib/utils/cn";

export type StatusBadgeTone =
  | "featured"
  | "primary"
  | "neutral"
  | "success"
  | "warning"
  | "community";

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: StatusBadgeTone;
  className?: string;
};

const toneStyles: Record<StatusBadgeTone, string> = {
  featured: "public-badge-featured",
  primary: "public-badge-primary",
  neutral: "public-badge-neutral",
  success: "public-badge-success",
  warning: "public-badge-warning",
  community: "public-badge-community",
};

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <span className={cn("public-badge", toneStyles[tone], className)}>
      {children}
    </span>
  );
}
