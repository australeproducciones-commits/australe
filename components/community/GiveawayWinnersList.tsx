import { PublicCard } from "@/components/ui/public";
import type { PublicGiveawayResultRow } from "@/lib/community/giveaways/types";

type GiveawayWinnersListProps = {
  winners: PublicGiveawayResultRow[];
  verificationCode?: string | null;
};

export function GiveawayWinnersList({
  winners,
  verificationCode,
}: GiveawayWinnersListProps) {
  const mainWinners = winners.filter((w) => w.winner_type === "winner");
  const alternates = winners.filter((w) => w.winner_type === "alternate");

  if (winners.length === 0) {
    return (
      <PublicCard padding="md">
        <p className="text-sm public-text-muted">Aún no hay resultados publicados.</p>
      </PublicCard>
    );
  }

  return (
    <div className="space-y-4">
      {verificationCode ? (
        <PublicCard padding="md">
          <p className="text-xs uppercase tracking-wide text-purple-300/80">
            Código de verificación
          </p>
          <p className="mt-1 font-mono text-lg font-semibold">{verificationCode}</p>
        </PublicCard>
      ) : null}

      <PublicCard padding="md">
        <h3 className="public-heading text-base font-bold">Ganadores</h3>
        <ul className="mt-3 space-y-2">
          {mainWinners.map((w) => (
            <li
              key={`winner-${w.position}`}
              className="flex items-center justify-between text-sm"
            >
              <span>{w.display_name ?? `Miembro #${w.position}`}</span>
              <span className="public-text-soft">#{w.position}</span>
            </li>
          ))}
        </ul>
      </PublicCard>

      {alternates.length > 0 ? (
        <PublicCard padding="md">
          <h3 className="public-heading text-base font-bold">Suplentes</h3>
          <ul className="mt-3 space-y-2">
            {alternates.map((w) => (
              <li
                key={`alternate-${w.position}`}
                className="flex items-center justify-between text-sm"
              >
                <span>{w.display_name ?? `Suplente #${w.position}`}</span>
                <span className="public-text-soft">#{w.position}</span>
              </li>
            ))}
          </ul>
        </PublicCard>
      ) : null}
    </div>
  );
}
