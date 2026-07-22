"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { ROUTES } from "@/lib/constants/routes";
import {
  ADVERTISING_FILTER_STATUS,
  ADVERTISING_SORT,
  type AdvertisingFilterStatus,
  type AdvertisingSort,
  type AdvertisingSummary,
} from "@/lib/site/advertising-display";

type AdvertisingToolbarProps = {
  initialSearch: string;
  initialStatus: AdvertisingFilterStatus;
  initialSort: AdvertisingSort;
  summary: AdvertisingSummary;
  viewMode: "cards" | "list";
  onViewModeChange: (mode: "cards" | "list") => void;
};

const STATUS_TABS: Array<{
  id: AdvertisingFilterStatus;
  label: string;
  countKey: keyof Pick<
    AdvertisingSummary,
    "total" | "active" | "scheduled" | "paused" | "finished"
  >;
}> = [
  { id: ADVERTISING_FILTER_STATUS.ALL, label: "Todas", countKey: "total" },
  { id: ADVERTISING_FILTER_STATUS.ACTIVE, label: "Activas", countKey: "active" },
  {
    id: ADVERTISING_FILTER_STATUS.SCHEDULED,
    label: "Programadas",
    countKey: "scheduled",
  },
  { id: ADVERTISING_FILTER_STATUS.PAUSED, label: "Pausadas", countKey: "paused" },
  {
    id: ADVERTISING_FILTER_STATUS.FINISHED,
    label: "Finalizadas",
    countKey: "finished",
  },
];

export function AdvertisingToolbar({
  initialSearch,
  initialStatus,
  initialSort,
  summary,
  viewMode,
  onViewModeChange,
}: AdvertisingToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [, startTransition] = useTransition();

  const pushParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (
          !value ||
          (key === "status" && value === ADVERTISING_FILTER_STATUS.ALL) ||
          (key === "sort" && value === ADVERTISING_SORT.RECENT)
        ) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      params.delete("page");
      const qs = params.toString();
      startTransition(() => {
        router.push(
          qs
            ? `${ROUTES.adminComunidadPublicidad}?${qs}`
            : ROUTES.adminComunidadPublicidad,
        );
      });
    },
    [router, searchParams],
  );

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    pushParams({ search: search.trim() || undefined });
  }

  const hasActiveFilters =
    Boolean(initialSearch) || initialStatus !== ADVERTISING_FILTER_STATUS.ALL;

  return (
    <div className="admin-ad-scada-toolbar">
      <nav aria-label="Filtrar por estado" className="admin-ad-scada-tabs">
        {STATUS_TABS.map((tab) => {
          const active = initialStatus === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => pushParams({ status: tab.id })}
              className={active ? "is-active" : undefined}
              aria-current={active ? "true" : undefined}
            >
              {tab.label}
              <span className="admin-ad-scada-tabs__count">{summary[tab.countKey]}</span>
            </button>
          );
        })}
      </nav>

      <form onSubmit={handleSearchSubmit} className="admin-ad-scada-filters">
        <label className="admin-ad-scada-field admin-ad-scada-field--grow">
          <span className="admin-ad-scada-field__label">Buscar publicidad</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, destino o campaña…"
            className="admin-ad-scada-input"
          />
        </label>
        <label className="admin-ad-scada-field">
          <span className="admin-ad-scada-field__label">Ordenar por</span>
          <select
            value={initialSort}
            onChange={(event) =>
              pushParams({ sort: event.target.value as AdvertisingSort })
            }
            className="admin-ad-scada-select"
          >
            <option value={ADVERTISING_SORT.RECENT}>Más recientes</option>
            <option value={ADVERTISING_SORT.OLDEST}>Más antiguas</option>
            <option value={ADVERTISING_SORT.VIEWS}>Más vistas</option>
            <option value={ADVERTISING_SORT.CLICKS}>Más clics</option>
            <option value={ADVERTISING_SORT.CTR}>Mayor CTR</option>
            <option value={ADVERTISING_SORT.ENDS}>Próximas a finalizar</option>
            <option value={ADVERTISING_SORT.STARTS}>Próximas a comenzar</option>
          </select>
        </label>
        <button type="submit" className="admin-ad-scada-btn">
          Buscar
        </button>
        {hasActiveFilters ? (
          <Link
            href={ROUTES.adminComunidadPublicidad}
            className="admin-ad-scada-btn admin-ad-scada-btn--ghost"
          >
            Limpiar filtros
          </Link>
        ) : null}
        <div
          className="admin-ad-scada-view-toggle"
          role="group"
          aria-label="Vista de campañas"
        >
          <button
            type="button"
            className={viewMode === "cards" ? "is-active" : undefined}
            onClick={() => onViewModeChange("cards")}
          >
            Tarjetas
          </button>
          <button
            type="button"
            className={viewMode === "list" ? "is-active" : undefined}
            onClick={() => onViewModeChange("list")}
          >
            Lista
          </button>
        </div>
      </form>
    </div>
  );
}
