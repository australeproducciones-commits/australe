import { PublicCard } from "@/components/ui/public";

type CommunityPointsCardProps = {
  balance: number;
  lifetimePoints: number;
};

export function CommunityPointsCard({
  balance,
  lifetimePoints,
}: CommunityPointsCardProps) {
  return (
    <PublicCard padding="md" className="flex flex-col justify-between">
      <p className="text-xs font-semibold uppercase tracking-wide public-text-soft">
        Tus puntos
      </p>
      <p className="mt-2 public-heading text-3xl font-bold">{balance.toLocaleString("es-AR")}</p>
      <p className="mt-1 text-xs public-text-muted">
        Histórico: {lifetimePoints.toLocaleString("es-AR")} pts
      </p>
    </PublicCard>
  );
}
