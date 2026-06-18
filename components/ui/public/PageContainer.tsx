import { cn } from "@/lib/utils/cn";

type PageContainerSize = "sm" | "md" | "lg";

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
  size?: PageContainerSize;
};

const sizeStyles: Record<PageContainerSize, string> = {
  sm: "max-w-3xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
};

export function PageContainer({
  children,
  className,
  size = "md",
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto px-4 py-10 sm:px-6 sm:py-16",
        sizeStyles[size],
        className,
      )}
    >
      {children}
    </div>
  );
}
