import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventSalesQrPriceList } from "@/components/events/EventSalesQrPriceList";
import {
  PageContainer,
  PublicButton,
  PublicCard,
  SectionHeading,
} from "@/components/ui/public";
import { PublicQueryError } from "@/components/ui/PublicQueryError";
import { getProfile } from "@/lib/auth/getProfile";
import { isActiveCommunityMember } from "@/lib/community/membership";
import { ROUTES } from "@/lib/constants/routes";
import { resolveEventPublicAccess } from "@/lib/events/access";
import { CommunityEventGate } from "@/components/events/CommunityEventGate";
import { getPublishedEventBySlug } from "@/lib/events/queries";
import { formatEventDateTime } from "@/lib/events/utils";
import {
  getEventKioskCatalogForQr,
  getEventKioskSettingsPublic,
} from "@/lib/kiosk/queries";
import { isSupabaseQueryError } from "@/lib/supabase/queryError";
import { createClient } from "@/lib/supabase/server";

type ListaPreciosPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ListaPreciosPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const event = await getPublishedEventBySlug(slug);
    return {
      title: event
        ? `Lista de precios · ${event.name}`
        : `Lista de precios: ${slug}`,
    };
  } catch (error) {
    if (isSupabaseQueryError(error)) {
      return { title: "Lista de precios" };
    }
    throw error;
  }
}

export default async function ListaPreciosPage({
  params,
}: ListaPreciosPageProps) {
  const { slug } = await params;
  let event = null;

  try {
    event = await getPublishedEventBySlug(slug);
  } catch (error) {
    if (isSupabaseQueryError(error)) {
      return (
        <PageContainer size="sm">
          <PublicQueryError message={error.userMessage} />
        </PageContainer>
      );
    }
    throw error;
  }

  if (!event) {
    notFound();
  }

  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const access = await resolveEventPublicAccess(event, profile?.id ?? null);

  if (access === "not_found") {
    notFound();
  }

  if (access === "community_gate") {
    return <CommunityEventGate />;
  }

  const [settings, products, isCommunityMember] = await Promise.all([
    getEventKioskSettingsPublic(event.id),
    getEventKioskCatalogForQr(event.id),
    isActiveCommunityMember(profile?.id),
  ]);

  const showPriceList = settings?.show_price_list ?? true;
  const dateTimeLabel = formatEventDateTime(
    event.event_date,
    event.start_time,
    event.end_time,
  );

  return (
    <PageContainer size="sm">
      <PublicButton
        href={ROUTES.evento(slug)}
        variant="ghost"
        size="sm"
        className="mb-6"
      >
        ← Volver al evento
      </PublicButton>

      <SectionHeading
        label="Consumiciones"
        title="Lista de precios"
        subtitle={`${event.name} · ${dateTimeLabel}`}
        className="mb-8"
      />

      {!showPriceList ? (
        <PublicCard padding="lg" className="text-center">
          <p className="text-sm public-text-muted">
            La lista de precios de consumisiones no está publicada para este
            evento.
          </p>
          <PublicButton
            href={ROUTES.evento(slug)}
            variant="outline"
            className="mt-6"
          >
            Volver al evento
          </PublicButton>
        </PublicCard>
      ) : (
        <EventSalesQrPriceList
          products={products}
          isCommunityMember={isCommunityMember}
          showHeading={false}
        />
      )}
    </PageContainer>
  );
}
