import { cn } from "@/lib/utils/cn";

type SectionHeadingProps = {
  label?: string;
  title: string;
  subtitle?: string;
  className?: string;
  titleClassName?: string;
};

export function SectionHeading({
  label,
  title,
  subtitle,
  className,
  titleClassName,
}: SectionHeadingProps) {
  return (
    <div className={className}>
      {label ? (
        <p className="public-label text-xs font-semibold uppercase tracking-[0.35em] sm:text-sm sm:tracking-[0.3em]">
          {label}
        </p>
      ) : null}
      <h1
        className={cn(
          "public-heading mt-2 text-3xl font-black sm:text-4xl",
          !label && "mt-0",
          titleClassName,
        )}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 text-sm public-text-muted sm:text-base">{subtitle}</p>
      ) : null}
    </div>
  );
}
