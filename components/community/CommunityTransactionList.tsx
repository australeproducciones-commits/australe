import { PublicCard } from "@/components/ui/public";
import type { LoyaltyTransaction } from "@/lib/community/loyalty/types";

const TYPE_LABELS: Record<string, string> = {
  earn: "Acreditación",
  redeem: "Canje",
  adjustment: "Ajuste",
  reversal: "Reverso",
  expiration: "Vencimiento",
};

type CommunityTransactionListProps = {
  transactions: LoyaltyTransaction[];
};

export function CommunityTransactionList({
  transactions,
}: CommunityTransactionListProps) {
  if (transactions.length === 0) {
    return (
      <PublicCard padding="md">
        <p className="text-sm public-text-soft">Todavía no tenés movimientos de puntos.</p>
      </PublicCard>
    );
  }

  return (
    <PublicCard padding="none" className="overflow-hidden">
      <ul className="divide-y divide-black/5">
        {transactions.map((tx) => (
          <li key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium public-text">
                {tx.description ?? TYPE_LABELS[tx.transaction_type] ?? tx.transaction_type}
              </p>
              <p className="text-xs public-text-muted">
                {new Date(tx.created_at).toLocaleDateString("es-AR")}
              </p>
            </div>
            <span
              className={
                tx.points >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"
              }
            >
              {tx.points >= 0 ? "+" : ""}
              {tx.points.toLocaleString("es-AR")}
            </span>
          </li>
        ))}
      </ul>
    </PublicCard>
  );
}
