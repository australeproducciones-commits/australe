import type { LoyaltyTransaction } from "@/lib/community/loyalty/types";

const TYPE_LABELS: Record<string, string> = {
  earn: "Acreditación",
  redeem: "Canje",
  adjustment: "Ajuste",
  reversal: "Reverso",
  expiration: "Vencimiento",
};

type AdminCommunityTransactionsTableProps = {
  transactions: LoyaltyTransaction[];
};

export function AdminCommunityTransactionsTable({
  transactions,
}: AdminCommunityTransactionsTableProps) {
  if (transactions.length === 0) {
    return <p className="text-sm text-zinc-500">Sin movimientos registrados.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
          <tr>
            <th className="px-3 py-2">Fecha</th>
            <th className="px-3 py-2">Usuario</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Puntos</th>
            <th className="px-3 py-2">Saldo</th>
            <th className="px-3 py-2">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-t border-zinc-100 dark:border-zinc-800">
              <td className="px-3 py-2 whitespace-nowrap">
                {new Date(tx.created_at).toLocaleString("es-AR")}
              </td>
              <td className="px-3 py-2 font-mono text-xs">{tx.user_id.slice(0, 8)}…</td>
              <td className="px-3 py-2">{TYPE_LABELS[tx.transaction_type] ?? tx.transaction_type}</td>
              <td className="px-3 py-2">{tx.points.toLocaleString("es-AR")}</td>
              <td className="px-3 py-2">{tx.balance_after.toLocaleString("es-AR")}</td>
              <td className="px-3 py-2 text-xs text-zinc-500">
                {tx.description ?? `${tx.source_type}${tx.source_id ? ` · ${tx.source_id}` : ""}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
