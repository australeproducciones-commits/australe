import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import { CommunityHero } from "@/components/community/CommunityHero";
import { CommunityLevelProgress } from "@/components/community/CommunityLevelProgress";
import { CommunityPointsCard } from "@/components/community/CommunityPointsCard";
import { CommunityRedemptionList } from "@/components/community/CommunityRedemptionList";
import { CommunityRewardCard } from "@/components/community/CommunityRewardCard";
import { CommunityTransactionList } from "@/components/community/CommunityTransactionList";
import { CommunityUpcomingEvents } from "@/components/community/CommunityUpcomingEvents";
import {
  PageContainer,
  PublicCard,
  SectionHeading,
} from "@/components/ui/public";
import { PublicQueryError } from "@/components/ui/PublicQueryError";
import { getProfile } from "@/lib/auth/getProfile";
import {
  getActiveCommunityLevels,
  getAvailableCommunityRewards,
  getCommunityDashboard,
  getCommunitySettings,
} from "@/lib/community/loyalty/queries";
import type { CommunitySettings } from "@/lib/community/loyalty/types";
import { isActiveCommunityMember } from "@/lib/community/membership";
import { ROUTES } from "@/lib/constants/routes";
import { getCommunityPublishedEvents } from "@/lib/events/queries";
import type { Event } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseQueryError } from "@/lib/supabase/queryError";

export const metadata: Metadata = {
  title: "Comunidad",
};

const DEFAULT_COMMUNITY_SETTINGS: CommunitySettings = {
  id: 1,
  community_enabled: true,
  ticket_points_enabled: true,
  consumption_points_enabled: false,
  amount_per_point: 1000,
  welcome_points: 0,
  public_title: "Comunidad Australe",
  public_description:
    "Sumá puntos con tus compras y canjeá beneficios exclusivos.",
};

export default async function ComunidadPage() {
  try {
    return await ComunidadPageContent();
  } catch (error) {
    console.error("ComunidadPage:", error);
    return (
      <PageContainer>
        <PublicQueryError
          title="No pudimos cargar Comunidad"
          message={
            isSupabaseQueryError(error)
              ? error.userMessage
              : "Ocurrió un error al cargar la página. Intentá de nuevo en unos segundos."
          }
        />
      </PageContainer>
    );
  }
}

async function ComunidadPageContent() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (profile?.id) {
    const [dashboard, isMember] = await Promise.all([
      getCommunityDashboard(profile.id),
      isActiveCommunityMember(profile.id),
    ]);

    let communityEvents: Event[] = [];
    let communityEventsError: string | null = null;

    if (isMember) {
      try {
        communityEvents = await getCommunityPublishedEvents();
      } catch (error) {
        if (isSupabaseQueryError(error)) {
          communityEventsError = error.userMessage;
        } else {
          throw error;
        }
      }
    }

    const settings = dashboard?.settings ?? (await getCommunitySettings()) ?? DEFAULT_COMMUNITY_SETTINGS;
    const publicRewards = dashboard?.rewards ?? [];

    return (
      <ComunidadPageView
        settings={settings}
        profileId={profile.id}
        dashboard={dashboard}
        publicRewards={publicRewards}
        levels={[]}
        isMember={isMember}
        communityEvents={communityEvents}
        communityEventsError={communityEventsError}
      />
    );
  }

  const [settings, levels, publicRewards] = await Promise.all([
    getCommunitySettings(),
    getActiveCommunityLevels(),
    getAvailableCommunityRewards(),
  ]);

  return (
    <ComunidadPageView
      settings={settings ?? DEFAULT_COMMUNITY_SETTINGS}
      profileId={null}
      dashboard={null}
      publicRewards={publicRewards}
      levels={levels}
      isMember={false}
      communityEvents={[]}
      communityEventsError={null}
    />
  );
}

type ComunidadPageViewProps = {
  settings: CommunitySettings;
  profileId: string | null;
  dashboard: Awaited<ReturnType<typeof getCommunityDashboard>>;
  publicRewards: Awaited<ReturnType<typeof getAvailableCommunityRewards>>;
  levels: Awaited<ReturnType<typeof getActiveCommunityLevels>>;
  isMember: boolean;
  communityEvents: Event[];
  communityEventsError: string | null;
};

function ComunidadPageView({
  settings,
  profileId,
  dashboard,
  publicRewards,
  levels,
  isMember,
  communityEvents,
  communityEventsError,
}: ComunidadPageViewProps) {
  return (
    <PageContainer>
      <SectionHeading
        label="Comunidad"
        title={settings.public_title}
        subtitle={settings.public_description}
      />

      <CommunityHero settings={settings} isAuthenticated={Boolean(profileId)} />

      <section className="mt-8">
        <PublicCard padding="md" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="public-heading text-lg font-bold">Sorteos de Comunidad</h2>
            <p className="mt-1 text-sm public-text-muted">
              Participá en sorteos exclusivos con puntos, entradas o beneficios de miembro.
            </p>
          </div>
          <Link
            href={ROUTES.comunidadSorteos}
            className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-500"
          >
            Ver sorteos
          </Link>
        </PublicCard>
      </section>

      {profileId && dashboard ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <CommunityPointsCard
              balance={dashboard.account?.points_balance ?? 0}
              lifetimePoints={dashboard.account?.lifetime_points ?? 0}
            />
            <CommunityLevelProgress
              level={dashboard.level}
              nextLevel={dashboard.nextLevel}
              lifetimePoints={dashboard.account?.lifetime_points ?? 0}
            />
          </div>

          <section className="mt-10">
            <h2 className="public-heading text-xl font-bold">Últimos movimientos</h2>
            <div className="mt-4">
              <CommunityTransactionList transactions={dashboard.transactions} />
            </div>
          </section>

          <section className="mt-10">
            <h2 className="public-heading text-xl font-bold">Recompensas disponibles</h2>
            {publicRewards.length === 0 ? (
              <p className="mt-4 text-sm public-text-soft">
                No hay recompensas activas por ahora.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {publicRewards.map((reward) => (
                  <CommunityRewardCard
                    key={reward.id}
                    reward={reward}
                    userBalance={dashboard.account?.points_balance ?? 0}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="public-heading text-xl font-bold">Tus canjes</h2>
            <div className="mt-4">
              <CommunityRedemptionList redemptions={dashboard.redemptions} />
            </div>
          </section>

          <section className="mt-10">
            <h2 className="public-heading text-xl font-bold">Próximos eventos</h2>
            <div className="mt-4">
              <CommunityUpcomingEvents events={dashboard.upcomingEvents} />
            </div>
          </section>
        </>
      ) : profileId ? (
        <PublicCard padding="md" className="mt-8">
          <p className="text-sm public-text-muted">
            Tu cuenta está activa, pero no pudimos cargar el panel de puntos en este momento.
            Intentá recargar la página en unos segundos.
          </p>
        </PublicCard>
      ) : (
        <section className="mt-10">
          <h2 className="public-heading text-xl font-bold">Recompensas destacadas</h2>
          {publicRewards.length === 0 ? (
            <PublicCard padding="md" className="mt-4">
              <p className="text-sm public-text-soft">
                Próximamente vas a poder ver las recompensas disponibles.
              </p>
            </PublicCard>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {publicRewards.slice(0, 3).map((reward) => (
                <PublicCard key={reward.id} padding="md">
                  <p className="public-heading text-base font-bold">{reward.name}</p>
                  {reward.description ? (
                    <p className="mt-1 text-sm public-text-muted">{reward.description}</p>
                  ) : null}
                  <p className="mt-3 text-sm font-semibold">
                    {reward.points_cost.toLocaleString("es-AR")} pts
                  </p>
                </PublicCard>
              ))}
            </div>
          )}

          <PublicCard padding="md" className="mt-6">
            <p className="text-sm public-text-muted">
              Cada ${settings.amount_per_point.toLocaleString("es-AR")} en entradas confirmadas
              suma 1 punto a tu cuenta.
            </p>
            {levels.length > 0 ? (
              <ul className="mt-4 space-y-1 text-sm public-text-soft">
                {levels.map((level) => (
                  <li key={level.id}>
                    · {level.name}: desde {level.minimum_lifetime_points.toLocaleString("es-AR")} pts
                  </li>
                ))}
              </ul>
            ) : null}
          </PublicCard>
        </section>
      )}

      {isMember ? (
        <section className="mt-12">
          <h2 className="public-heading text-2xl font-bold">Eventos de la comunidad</h2>
          {communityEventsError ? (
            <PublicQueryError
              title="No pudimos cargar los eventos de la comunidad"
              message={communityEventsError}
            />
          ) : communityEvents.length === 0 ? (
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
      ) : profileId ? null : (
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
