"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type PublicAccordionProps = {
  id?: string;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

export function PublicAccordion({
  id,
  title,
  subtitle,
  badges,
  defaultOpen = false,
  className,
  children,
}: PublicAccordionProps) {
  const generatedId = useId();
  const panelId = id ?? `accordion-${generatedId}`;
  const buttonId = `${panelId}-button`;
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn("mt-6", className)}>
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-start justify-between gap-4 rounded-2xl border px-4 py-4 text-left transition hover:bg-[var(--public-card-tint)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--public-primary)] sm:px-5 sm:py-4"
        style={{ borderColor: "var(--public-border)", backgroundColor: "var(--public-card)" }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="public-heading text-lg font-bold sm:text-xl">{title}</h2>
            {badges}
          </div>
          {subtitle ? (
            <p className="mt-1 text-sm public-text-muted">{subtitle}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "mt-1 shrink-0 text-xl leading-none transition motion-safe:duration-200",
            open && "rotate-180",
          )}
          style={{ color: "var(--public-primary)" }}
          aria-hidden
        >
          ▾
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
        className="pt-4"
      >
        {children}
      </div>
    </section>
  );
}
