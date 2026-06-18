import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import {
  PageContainer,
  PublicButton,
  PublicCard,
  SectionHeading,
} from "@/components/ui/public";
import { getProfile } from "@/lib/auth/getProfile";
import { isActiveCommunityMember } from "@/lib/community/membership";
import { ROUTES } from "@/lib/constants/routes";
import { getCommunityPublishedEvents } from "@/lib/events/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Comunidad",
};

export default async function ComunidadPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const isMember = await isActiveCommunityMember(profile?.id ?? null);
  const communityEvents = isMember ? await getCommunityPublishedEvents() : [];

  return (
    <PageContainer>
      <SectionHeading
        label="Comunidad"
        title="Comunidad Australe"
        subtitle="Beneficios y eventos exclusivos para miembros activos de la comunidad."
      />

      <PublicCard padding="lg" className="mt-8">
        <p className="text-sm public-text-muted">
          El registro de nuevos miembros se gestiona desde el equipo de Australe
          Producciones. Si ya tenés cuenta vinculada, iniciá sesión para acceder a
          eventos exclusivos.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <PublicButton href={ROUTES.login}>Ingresar</PublicButton>
          <PublicButton href={ROUTES.eventos} variant="outline">
            Ver eventos públicos
          </PublicButton>
        </div>
      </PublicCard>

      {isMember ? (
        <section className="mt-12">
          <h2 className="public-heading text-2xl font-bold">
            Eventos de la comunidad
          </h2>
          {communityEvents.length === 0 ? (
            <p className="mt-4 text-sm public-text-soft">
              No hay eventos exclusivos publicados por ahora.
            </p>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {communityEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <p className="mt-8 text-sm public-text-soft">
          Los eventos exclusivos solo se muestran a miembros con membresía activa.{" "}
          <Link href={ROUTES.login} className="public-link font-semibold">
            Iniciá sesión
          </Link>{" "}
          si ya formás parte.
        </p>
      )}
    </PageContainer>
  );
}
