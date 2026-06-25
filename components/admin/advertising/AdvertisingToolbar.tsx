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
} from "@/lib/site/advertising-display";

type AdvertisingToolbarProps = {
  initialSearch: string;
  initialStatus: AdvertisingFilterStatus;
  initialSort: AdvertisingSort;
};

const STATUS_TABS: Array<{ id: AdvertisingFilterStatus; label: string }> = [
  { id: ADVERTISING_FILTER_STATUS.ALL, label: "Todas" },
  { id: ADVERTISING_FILTER_STATUS.ACTIVE, label: "Activas" },
  { id: ADVERTISING_FILTER_STATUS.SCHEDULED, label: "Programadas" },
  { id: ADVERTISING_FILTER_STATUS.PAUSED, label: "Pausadas" },
  { id: ADVERTISING_FILTER_STATUS.FINISHED, label: "Finalizadas" },
];

export function AdvertisingToolbar({
  initialSearch,
  initialStatus,
  initialSort,
}: AdvertisingToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [, startTransition] = useTransition();

  const pushParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      const resetsPage = "status" in updates || "sort" in updates || "search" in updates;
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
      if (resetsPage) {
        params.delete("page");
      }
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

  return (
    <div className="admin-ad-scada-toolbar space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              </button>
            );
          })}
        </nav>
        <Link
          href={`${ROUTES.adminComunidadPublicidad}/nueva`}
          className="admin-ad-scada-btn admin-ad-scada-btn--primary w-full sm:w-auto"
        >
          Nueva publicidad
        </Link>
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="admin-ad-scada-filters"
      >
        <label className="admin-ad-scada-field admin-ad-scada-field--grow">
          <span className="sr-only">Buscar publicidad</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar publicidad…"
            className="admin-ad-scada-input"
          />
        </label>
        <label className="admin-ad-scada-field">
          <span className="admin-ad-scada-field__label">Ordenar</span>
          <select
            value={initialSort}
            onChange={(event) =>
              pushParams({ sort: event.target.value as AdvertisingSort })
            }
            className="admin-ad-scada-select"
          >
            <option value={ADVERTISING_SORT.RECENT}>Más recientes</option>
            <option value={ADVERTISING_SORT.STARTS}>Próximas a comenzar</option>
            <option value={ADVERTISING_SORT.ENDS}>Próximas a finalizar</option>
            <option value={ADVERTISING_SORT.VIEWS}>Más vistas</option>
            <option value={ADVERTISING_SORT.CLICKS}>Más clics</option>
          </select>
        </label>
        <button type="submit" className="admin-ad-scada-btn">
          Buscar
        </button>
        {(initialSearch || initialStatus !== ADVERTISING_FILTER_STATUS.ALL) && (
          <Link
            href={ROUTES.adminComunidadPublicidad}
            className="admin-ad-scada-btn admin-ad-scada-btn--ghost"
          >
            Limpiar
          </Link>
        )}
      </form>
    </div>
  );
}
