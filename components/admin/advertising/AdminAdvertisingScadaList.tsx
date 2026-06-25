import Link from "next/link";
import { Suspense } from "react";
import { AdvertisingScadaCard } from "@/components/admin/advertising/AdvertisingScadaCard";
import { AdvertisingSummaryPanel } from "@/components/admin/advertising/AdvertisingSummaryPanel";
import { AdvertisingToolbar } from "@/components/admin/advertising/AdvertisingToolbar";
import { ROUTES } from "@/lib/constants/routes";
import {
  getAdvertisingDisplayStatus,
  type AdvertisingFilterStatus,
  type AdvertisingSort,
  type AdvertisingSummary,
} from "@/lib/site/advertising-display";
import type { AdvertisingCampaign } from "@/lib/site/types";

type AdminAdvertisingScadaListProps = {
  campaigns: AdvertisingCampaign[];
  summary: AdvertisingSummary;
  initialSearch: string;
  initialStatus: AdvertisingFilterStatus;
  initialSort: AdvertisingSort;
  hasFilters: boolean;
};

export function AdminAdvertisingScadaList({
  campaigns,
  summary,
  initialSearch,
  initialStatus,
  initialSort,
  hasFilters,
}: AdminAdvertisingScadaListProps) {
  return (
    <div className="admin-ad-scada-page">
      <header className="admin-ad-scada-page__header">
        <div>
          <p className="admin-ad-scada-page__kicker">Comunidad</p>
          <h2 className="admin-ad-scada-page__title">Publicidad</h2>
          <p className="admin-ad-scada-page__description">
            Gestión y seguimiento de campañas publicitarias.
          </p>
        </div>
        <Link
          href={`${ROUTES.adminComunidadPublicidad}/nueva`}
          className="admin-ad-scada-btn admin-ad-scada-btn--primary admin-ad-scada-page__cta"
        >
          Nueva publicidad
        </Link>
      </header>

      <Suspense fallback={<p className="admin-ad-scada-muted">Cargando filtros…</p>}>
        <AdvertisingToolbar
          initialSearch={initialSearch}
          initialStatus={initialStatus}
          initialSort={initialSort}
        />
      </Suspense>

      <AdvertisingSummaryPanel summary={summary} />

      {campaigns.length === 0 ? (
        <div className="admin-ad-scada-empty">
          {hasFilters ? (
            <>
              <p>No se encontraron publicidades con estos filtros.</p>
              <Link
                href={ROUTES.adminComunidadPublicidad}
                className="admin-ad-scada-btn admin-ad-scada-btn--primary"
              >
                Limpiar filtros
              </Link>
            </>
          ) : (
            <>
              <p>Todavía no hay publicidades creadas.</p>
              <p className="admin-ad-scada-muted">
                Creá la primera publicidad para comenzar.
              </p>
              <Link
                href={`${ROUTES.adminComunidadPublicidad}/nueva`}
                className="admin-ad-scada-btn admin-ad-scada-btn--primary"
              >
                Nueva publicidad
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="admin-ad-scada-grid">
          {campaigns.map((campaign) => (
            <AdvertisingScadaCard
              key={campaign.id}
              campaign={campaign}
              display={getAdvertisingDisplayStatus(campaign)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
