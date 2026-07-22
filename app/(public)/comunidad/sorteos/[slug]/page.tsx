import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GiveawayCountdown } from "@/components/community/GiveawayCountdown";
import { GiveawayParticipatePanel } from "@/components/community/GiveawayParticipatePanel";
import { GiveawayWinnersList } from "@/components/community/GiveawayWinnersList";
import {
  PageContainer,
  PublicCard,
  PublicButton,
  SectionHeading,
  StatusBadge,
} from "@/components/ui/public";
import { getProfile } from "@/lib/auth/getProfile";
import {
  getGiveawayBySlug,
  getGiveawayEligibility,
  getPublicCommunityGiveawayResults,
  getUserGiveawayParticipation,
} from "@/lib/community/giveaways/queries";
import { entryTypeLabel, getGiveawayVisualStatus } from "@/lib/community/giveaways/utils";
import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const giveaway = await getGiveawayBySlug(slug);
  return {
    title: giveaway ? `${giveaway.name} · Sorteos` : "Sorteo",
    description: giveaway?.short_description ?? giveaway?.prize_description,
  };
}

export default async function ComunidadSorteoDetallePage({ params }: PageProps) {
  const { slug } = await params;
  const giveaway = await getGiveawayBySlug(slug);

  if (!giveaway || !giveaway.is_public) {
    notFound();
  }

  const supabase = await createClient();
  const profile = await getProfile(supabase);

  const [eligibility, participation, publicResults] = await Promise.all([
    getGiveawayEligibility(giveaway, profile?.id),
    getUserGiveawayParticipation(giveaway.id, profile?.id),
    giveaway.status === "drawn"
      ? getPublicCommunityGiveawayResults(slug)
      : Promise.resolve(null),
  ]);

  const winners = publicResults?.winners ?? [];
  const stats = {
    participant_count: publicResults?.participant_count ?? 0,
    total_chances: publicResults?.total_chances ?? 0,
    verification_code: publicResults?.verification_code ?? null,
  };

  const visualStatus = getGiveawayVisualStatus(giveaway, {
    user_chances: participation?.total_chances ?? 0,
    is_winner: participation?.is_winner ?? false,
    is_alternate: participation?.is_alternate ?? false,
    winner_claimed: participation?.winner_record?.status === "claimed",
  });

  return (
    <PageContainer>
      <div className="mb-6">
        <Link href={ROUTES.comunidadSorteos}>
          <PublicButton variant="outline" type="button">
            ← Todos los sorteos
          </PublicButton>
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
        <div>
          <SectionHeading
            label="Sorteo"
            title={giveaway.name}
            subtitle={giveaway.short_description ?? giveaway.prize_description}
          />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge tone="community">{visualStatus}</StatusBadge>
            <StatusBadge tone="neutral">{entryTypeLabel(giveaway.entry_type)}</StatusBadge>
          </div>

          {giveaway.image_url ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={giveaway.image_url}
                alt=""
                className="aspect-[16/9] w-full object-cover"
              />
            </div>
          ) : null}

          <PublicCard padding="md" className="mt-6">
            <h2 className="public-heading text-lg font-bold">Premio</h2>
            <p className="mt-2 text-sm public-text">{giveaway.prize_description}</p>
            {giveaway.description ? (
              <>
                <h3 className="public-heading mt-6 text-base font-bold">Detalle</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm public-text-muted">
                  {giveaway.description}
                </p>
              </>
            ) : null}
            {giveaway.terms_and_conditions ? (
              <>
                <h3 className="public-heading mt-6 text-base font-bold">
                  Bases y condiciones
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm public-text-muted">
                  {giveaway.terms_and_conditions}
                </p>
              </>
            ) : null}
          </PublicCard>

          {giveaway.status === "drawn" ? (
            <div className="mt-6 space-y-4">
              <PublicCard padding="md">
                <h3 className="public-heading text-base font-bold">Transparencia</h3>
                <ul className="mt-3 space-y-1 text-sm public-text-muted">
                  <li>
                    Cierre:{" "}
                    {giveaway.closes_at
                      ? new Date(giveaway.closes_at).toLocaleString("es-AR")
                      : "—"}
                  </li>
                  <li>
                    Ejecución:{" "}
                    {giveaway.drawn_at
                      ? new Date(giveaway.drawn_at).toLocaleString("es-AR")
                      : "—"}
                  </li>
                  <li>Participantes: {stats.participant_count}</li>
                  <li>Total chances: {stats.total_chances}</li>
                  <li>Ganadores: {giveaway.winner_count}</li>
                </ul>
              </PublicCard>
              <GiveawayWinnersList
                winners={winners}
                verificationCode={stats.verification_code}
              />
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          {giveaway.closes_at && giveaway.status === "active" ? (
            <GiveawayCountdown targetIso={giveaway.closes_at} />
          ) : null}

          <GiveawayParticipatePanel
            giveaway={giveaway}
            eligibility={eligibility}
            participation={participation}
            isAuthenticated={Boolean(profile?.id)}
          />
        </aside>
      </div>
    </PageContainer>
  );
}
