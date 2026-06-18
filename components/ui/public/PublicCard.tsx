import { cn } from "@/lib/utils/cn";

type PublicCardProps = {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
};

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function PublicCard({
  children,
  className,
  padding = "md",
}: PublicCardProps) {
  return (
    <div
      className={cn("public-card rounded-3xl", paddingStyles[padding], className)}
    >
      {children}
    </div>
  );
}
