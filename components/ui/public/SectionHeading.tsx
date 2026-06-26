import { cn } from "@/lib/utils/cn";

type SectionHeadingProps = {
  label?: string;
  title: string;
  subtitle?: string;
  className?: string;
  titleClassName?: string;
  align?: "center" | "start";
};

export function SectionHeading({
  label,
  title,
  subtitle,
  className,
  titleClassName,
  align = "center",
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div className={cn(centered && "mx-auto max-w-3xl text-center", className)}>
      {label ? (
        <p className="public-label text-xs font-semibold uppercase tracking-[0.35em] sm:text-sm sm:tracking-[0.3em]">
          {label}
        </p>
      ) : null}
      <h1
        className={cn(
          "public-heading public-page-title mt-2 text-3xl font-black sm:text-4xl",
          !label && "mt-0",
          titleClassName,
        )}
        style={{ textWrap: "balance" }}
      >
        {title}
      </h1>
      {subtitle ? (
        <p
          className={cn(
            "mt-2 text-sm public-text-muted sm:text-base",
            centered && "mx-auto max-w-2xl",
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
