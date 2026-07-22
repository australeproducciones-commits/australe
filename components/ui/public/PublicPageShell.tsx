import { cn } from "@/lib/utils/cn";

type PublicPageShellSize = "sm" | "md" | "lg";

type PublicPageShellProps = {
  children: React.ReactNode;
  className?: string;
  size?: PublicPageShellSize;
};

const sizeStyles: Record<PublicPageShellSize, string> = {
  sm: "max-w-3xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
};

export function PublicPageShell({
  children,
  className,
  size = "lg",
}: PublicPageShellProps) {
  return (
    <div
      className={cn(
        "public-page-shell mx-auto w-full flex-1 px-4 py-10 sm:px-6 sm:py-16",
        sizeStyles[size],
        className,
      )}
    >
      {children}
    </div>
  );
}
