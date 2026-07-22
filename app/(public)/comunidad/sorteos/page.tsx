import type { Metadata } from "next";
import Link from "next/link";
import { GiveawayCard } from "@/components/community/GiveawayCard";
import {
  PageContainer,
  PublicCard,
  PublicButton,
  SectionHeading,
} from "@/components/ui/public";
import { getPublicGiveaways } from "@/lib/community/giveaways/queries";
import { groupGiveawaysBySection } from "@/lib/community/giveaways/utils";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Sorteos · Comunidad",
  description: "Sorteos exclusivos para miembros de Comunidad Australe.",
};

export default async function ComunidadSorteosPage() {
  const giveaways = await getPublicGiveaways();
  const { active, upcoming, finished } = groupGiveawaysBySection(giveaways);

  return (
    <PageContainer>
      <SectionHeading
        label="Comunidad"
        title="Sorteos"
        subtitle="Participá en sorteos exclusivos con puntos, entradas o beneficios de miembro."
      />

      <div className="mt-6">
        <Link href={ROUTES.comunidad}>
          <PublicButton variant="outline" type="button">
            ← Volver a Comunidad
          </PublicButton>
        </Link>
      </div>

      {giveaways.length === 0 ? (
        <PublicCard padding="md" className="mt-8">
          <p className="text-sm public-text-muted">
            No hay sorteos publicados por el momento. Volvé pronto.
          </p>
        </PublicCard>
      ) : (
        <div className="mt-8 space-y-10">
          {active.length > 0 ? (
            <section>
              <h2 className="public-heading mb-4 text-xl font-bold">Activos</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((g) => (
                  <GiveawayCard key={g.id} giveaway={g} />
                ))}
              </div>
            </section>
          ) : null}

          {upcoming.length > 0 ? (
            <section>
              <h2 className="public-heading mb-4 text-xl font-bold">Próximamente</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((g) => (
                  <GiveawayCard key={g.id} giveaway={g} />
                ))}
              </div>
            </section>
          ) : null}

          {finished.length > 0 ? (
            <section>
              <h2 className="public-heading mb-4 text-xl font-bold">Finalizados</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {finished.map((g) => (
                  <GiveawayCard key={g.id} giveaway={g} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}
