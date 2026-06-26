import { cn } from "@/lib/utils/cn";

type DashboardSectionProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
};

export function DashboardSection({
  title,
  description,
  action,
  children,
  className,
  compact = false,
}: DashboardSectionProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/10 bg-zinc-900/80 shadow-sm shadow-black/20",
        compact ? "p-4" : "p-5",
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-zinc-100">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs text-zinc-400">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
