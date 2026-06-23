import { PublicCard } from "@/components/ui/public";
import type { CommunityLevel } from "@/lib/community/loyalty/types";

type CommunityLevelProgressProps = {
  level: CommunityLevel | null;
  nextLevel: CommunityLevel | null;
  lifetimePoints: number;
};

export function CommunityLevelProgress({
  level,
  nextLevel,
  lifetimePoints,
}: CommunityLevelProgressProps) {
  const currentMin = level?.minimum_lifetime_points ?? 0;
  const nextMin = nextLevel?.minimum_lifetime_points ?? currentMin;
  const span = Math.max(nextMin - currentMin, 1);
  const progress = nextLevel
    ? Math.min(100, Math.round(((lifetimePoints - currentMin) / span) * 100))
    : 100;

  return (
    <PublicCard padding="md">
      <p className="text-xs font-semibold uppercase tracking-wide public-text-soft">
        Nivel actual
      </p>
      <p className="mt-2 public-heading text-xl font-bold">
        {level?.name ?? "Comunidad"}
      </p>
      {nextLevel ? (
        <>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-[var(--public-accent)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs public-text-muted">
            {lifetimePoints.toLocaleString("es-AR")} / {nextMin.toLocaleString("es-AR")} pts
            hacia {nextLevel.name}
          </p>
        </>
      ) : (
        <p className="mt-2 text-xs public-text-muted">¡Alcanzaste el nivel máximo!</p>
      )}
    </PublicCard>
  );
}
