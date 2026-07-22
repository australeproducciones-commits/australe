"use client";

import Link from "next/link";
import { useState } from "react";
import { AdvertisingCompactList } from "@/components/admin/advertising/AdvertisingCompactList";
import { AdvertisingScadaCard } from "@/components/admin/advertising/AdvertisingScadaCard";
import { AdvertisingSummaryPanel } from "@/components/admin/advertising/AdvertisingSummaryPanel";
import { AdvertisingSystemStatusBar } from "@/components/admin/advertising/AdvertisingSystemStatusBar";
import { AdvertisingToolbar } from "@/components/admin/advertising/AdvertisingToolbar";
import { ROUTES } from "@/lib/constants/routes";
import {
  getAdvertisingDisplayStatus,
  type AdvertisingFilterStatus,
  type AdvertisingOperationalStats,
  type AdvertisingSort,
  type AdvertisingSummary,
} from "@/lib/site/advertising-display";
import type { AdvertisingCampaign } from "@/lib/site/types";

type AdminAdvertisingScadaListProps = {
  campaigns: AdvertisingCampaign[];
  summary: AdvertisingSummary;
  operationalStats: AdvertisingOperationalStats;
  initialSearch: string;
  initialStatus: AdvertisingFilterStatus;
  initialSort: AdvertisingSort;
  hasFilters: boolean;
};

type ViewMode = "cards" | "list";

export function AdminAdvertisingScadaList({
  campaigns,
  summary,
  operationalStats,
  initialSearch,
  initialStatus,
  initialSort,
  hasFilters,
}: AdminAdvertisingScadaListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const statusDotClass = `admin-ad-scada-page__status-dot admin-ad-scada-page__status-dot--${operationalStats.systemTone}`;

  return (
    <div className="admin-ad-scada-page">
      <header className="admin-ad-scada-page__header">
        <div>
          <p className="admin-ad-scada-page__kicker">Comunidad · Publicidad</p>
          <h1 className="admin-ad-scada-page__title">Publicidad</h1>
          <p className="admin-ad-scada-page__description">
            Gestioná las campañas publicitarias que se muestran dentro de Comunidad.
          </p>
          <p className="admin-ad-scada-page__status">
            <span className={statusDotClass} aria-hidden />
            {operationalStats.systemLabel}
          </p>
        </div>
        <Link
          href={`${ROUTES.adminComunidadPublicidad}/nueva`}
          className="admin-ad-scada-btn admin-ad-scada-btn--primary admin-ad-scada-page__cta"
        >
          <span aria-hidden>＋</span> Nueva publicidad
        </Link>
      </header>

      <AdvertisingToolbar
        initialSearch={initialSearch}
        initialStatus={initialStatus}
        initialSort={initialSort}
        summary={summary}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <AdvertisingSystemStatusBar stats={operationalStats} />

      <AdvertisingSummaryPanel summary={summary} />

      {campaigns.length === 0 ? (
        <div className="admin-ad-scada-empty">
          {hasFilters ? (
            <>
              <p className="admin-ad-scada-empty__title">
                No encontramos campañas con este estado
              </p>
              <p className="admin-ad-scada-muted">
                Probá con otro filtro o limpiá la búsqueda.
              </p>
              <Link
                href={ROUTES.adminComunidadPublicidad}
                className="admin-ad-scada-btn admin-ad-scada-btn--primary"
              >
                Limpiar filtros
              </Link>
            </>
          ) : (
            <>
              <p className="admin-ad-scada-empty__title">
                Todavía no hay publicidades
              </p>
              <p className="admin-ad-scada-muted">
                Creá la primera campaña para promocionar eventos, beneficios o
                empresas dentro de Comunidad.
              </p>
              <Link
                href={`${ROUTES.adminComunidadPublicidad}/nueva`}
                className="admin-ad-scada-btn admin-ad-scada-btn--primary"
              >
                Crear publicidad
              </Link>
            </>
          )}
        </div>
      ) : viewMode === "list" ? (
        <AdvertisingCompactList campaigns={campaigns} />
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
