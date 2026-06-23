import { PublicCard } from "@/components/ui/public";
import type { CommunityRedemption } from "@/lib/community/loyalty/types";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  used: "Usado",
  cancelled: "Cancelado",
  expired: "Vencido",
};

type CommunityRedemptionListProps = {
  redemptions: CommunityRedemption[];
};

export function CommunityRedemptionList({
  redemptions,
}: CommunityRedemptionListProps) {
  if (redemptions.length === 0) {
    return (
      <PublicCard padding="md">
        <p className="text-sm public-text-soft">Todavía no realizaste canjes.</p>
      </PublicCard>
    );
  }

  return (
    <PublicCard padding="none" className="overflow-hidden">
      <ul className="divide-y divide-black/5">
        {redemptions.map((item) => (
          <li key={item.id} className="px-4 py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.reward?.name ?? "Recompensa"}</p>
                <p className="mt-0.5 font-mono text-xs public-text-muted">
                  {item.redemption_code}
                </p>
              </div>
              <span className="text-xs public-text-soft">
                {STATUS_LABELS[item.status] ?? item.status}
              </span>
            </div>
            <p className="mt-1 text-xs public-text-muted">
              {item.points_spent.toLocaleString("es-AR")} pts ·{" "}
              {new Date(item.created_at).toLocaleDateString("es-AR")}
            </p>
          </li>
        ))}
      </ul>
    </PublicCard>
  );
}
