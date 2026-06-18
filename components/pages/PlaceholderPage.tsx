import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PublicButton } from "@/components/ui/public/PublicButton";
import { PublicCard } from "@/components/ui/public/PublicCard";
import { StatusBadge } from "@/components/ui/public/StatusBadge";

export type PlaceholderLink = {
  href: string;
  label: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
};

export type PlaceholderPageProps = {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  links?: PlaceholderLink[];
  operational?: boolean;
  embedded?: boolean;
};

export function PlaceholderPage({
  title,
  description,
  backHref,
  backLabel = "Volver",
  links = [],
  operational = false,
  embedded = false,
}: PlaceholderPageProps) {
  const content = (
    <>
      {!embedded && (
        <>
          <p className="public-label text-xs uppercase tracking-[0.3em]">
            Australe Producciones
          </p>
          <h1 className="public-heading mt-4 text-3xl font-black sm:text-4xl">
            {title}
          </h1>
        </>
      )}
      <p
        className={
          embedded
            ? "mx-auto max-w-xl text-base leading-7 public-text-muted"
            : "mx-auto mt-4 max-w-xl text-base leading-7 public-text-muted"
        }
      >
        {description}
      </p>

      <div className="mt-6 inline-flex items-center gap-2">
        {embedded ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Módulo en preparación
          </span>
        ) : (
          <StatusBadge tone="warning">Módulo en preparación</StatusBadge>
        )}
      </div>

      <div
        className={
          operational
            ? "mt-10 flex flex-col gap-4"
            : "mt-10 flex flex-wrap justify-center gap-3"
        }
      >
        {backHref &&
          (embedded ? (
            <Button
              href={backHref}
              variant="outline"
              size={operational ? "xl" : "md"}
              className={operational ? "w-full" : undefined}
            >
              {backLabel}
            </Button>
          ) : (
            <PublicButton
              href={backHref}
              variant="outline"
              size={operational ? "xl" : "md"}
              className={operational ? "w-full" : undefined}
            >
              {backLabel}
            </PublicButton>
          ))}
        {links.map((link) =>
          embedded ? (
            <Button
              key={link.href}
              href={link.href}
              variant={link.variant ?? "primary"}
              size={link.size ?? (operational ? "xl" : "md")}
              className={operational ? "w-full" : undefined}
            >
              {link.label}
            </Button>
          ) : (
            <PublicButton
              key={link.href}
              href={link.href}
              variant={
                link.variant === "secondary"
                  ? "primary"
                  : (link.variant ?? "primary")
              }
              size={link.size ?? (operational ? "xl" : "md")}
              className={operational ? "w-full" : undefined}
            >
              {link.label}
            </PublicButton>
          ),
        )}
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="px-4 py-8 sm:px-8">
        <Card padding="lg" className="text-center">
          {content}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <PublicCard padding="lg" className="text-center">
        {content}
      </PublicCard>
    </div>
  );
}
