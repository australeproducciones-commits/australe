"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ROUTES } from "@/lib/constants/routes";
import {
  deleteAdvertisingCampaignAction,
  setAdvertisingCampaignActiveAction,
} from "@/lib/site/actions";
import type { AdvertisingCampaign } from "@/lib/site/types";
import {
  ADVERTISING_PLACEMENT_LABEL,
  formatAdvertisingCtr,
  formatAdvertisingDateTime,
  formatAdvertisingNumber,
  formatDestinationDomain,
  getAdvertisingAlerts,
  getDestinationTypeLabel,
  truncateDestinationUrl,
  type AdvertisingDisplayStatus,
} from "@/lib/site/advertising-display";

type AdvertisingScadaCardProps = {
  campaign: AdvertisingCampaign;
  display: AdvertisingDisplayStatus;
};

function badgeClass(kind: AdvertisingDisplayStatus["kind"]): string {
  switch (kind) {
    case "active":
      return "admin-ad-scada-badge--active";
    case "scheduled":
      return "admin-ad-scada-badge--scheduled";
    case "paused":
      return "admin-ad-scada-badge--paused";
    case "finished":
      return "admin-ad-scada-badge--finished";
    case "incomplete":
      return "admin-ad-scada-badge--incomplete";
    default:
      return "";
  }
}

export function AdvertisingScadaCard({
  campaign,
  display,
}: AdvertisingScadaCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const alerts = getAdvertisingAlerts(campaign, display);
  const destination = campaign.destination_url?.trim() ?? "";
  const destinationType = getDestinationTypeLabel(destination);
  const destinationDomain = formatDestinationDomain(destination);
  const destinationPreview = truncateDestinationUrl(destination);
  const title = campaign.title?.trim() || campaign.internal_name;
  const editHref = `${ROUTES.adminComunidadPublicidad}/${campaign.id}/editar`;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function refresh() {
    router.refresh();
  }

  function handleToggleActive(nextActive: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setAdvertisingCampaignActiveAction(
        campaign.id,
        nextActive,
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMenuOpen(false);
      refresh();
    });
  }

  function handleDelete() {
    if (!window.confirm("¿Eliminar esta publicidad? Esta acción no se puede deshacer.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteAdvertisingCampaignAction(campaign.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMenuOpen(false);
      refresh();
    });
  }

  const canPause =
    campaign.is_active &&
    display.kind !== "finished";
  const canActivate =
    !campaign.is_active && display.kind !== "finished";

  return (
    <article className="admin-ad-scada-card">
      <div className="admin-ad-scada-card__media">
        {campaign.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={campaign.image_url}
            alt={title}
            className="admin-ad-scada-card__image"
          />
        ) : (
          <div className="admin-ad-scada-card__fallback" aria-hidden>
            <span>Sin imagen</span>
          </div>
        )}
        <span className={`admin-ad-scada-badge ${badgeClass(display.kind)}`}>
          <span className="admin-ad-scada-badge__dot" aria-hidden>
            {display.scheduleIndicator}
          </span>
          {display.badgeLabel}
        </span>
      </div>

      <div className="admin-ad-scada-card__body">
        <header className="admin-ad-scada-card__header">
          <div className="min-w-0 flex-1">
            <p className="admin-ad-scada-card__kicker">{campaign.internal_name}</p>
            <h3 className="admin-ad-scada-card__title">{title}</h3>
            <p className="admin-ad-scada-card__placement">
              {ADVERTISING_PLACEMENT_LABEL} · {destinationType}
            </p>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="admin-ad-scada-icon-btn"
              aria-label="Más acciones"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              disabled={pending}
            >
              ⋮
            </button>
            {menuOpen ? (
              <div className="admin-ad-scada-menu" role="menu">
                <Link href={editHref} className="admin-ad-scada-menu__item" role="menuitem">
                  Editar
                </Link>
                {canActivate ? (
                  <button
                    type="button"
                    className="admin-ad-scada-menu__item"
                    role="menuitem"
                    disabled={pending}
                    onClick={() => handleToggleActive(true)}
                  >
                    Activar
                  </button>
                ) : null}
                {canPause ? (
                  <button
                    type="button"
                    className="admin-ad-scada-menu__item"
                    role="menuitem"
                    disabled={pending}
                    onClick={() => handleToggleActive(false)}
                  >
                    Pausar
                  </button>
                ) : null}
                {destination ? (
                  <a
                    href={destination}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-ad-scada-menu__item"
                    role="menuitem"
                  >
                    Abrir destino
                  </a>
                ) : null}
                <button
                  type="button"
                  className="admin-ad-scada-menu__item admin-ad-scada-menu__item--danger"
                  role="menuitem"
                  disabled={pending}
                  onClick={handleDelete}
                >
                  Eliminar
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <div className="admin-ad-scada-schedule">
          <p className="admin-ad-scada-schedule__title">
            <span aria-hidden>{display.scheduleIndicator}</span>{" "}
            {display.scheduleTitle}
          </p>
          {display.schedulePrefix ? (
            <p className="admin-ad-scada-schedule__prefix">{display.schedulePrefix}</p>
          ) : null}
          <p className="admin-ad-scada-schedule__detail">{display.scheduleDetail}</p>
        </div>

        <div className="admin-ad-scada-meta">
          <div className="admin-ad-scada-meta__block">
            <p className="admin-ad-scada-meta__label">Ubicación</p>
            <p className="admin-ad-scada-meta__value">{ADVERTISING_PLACEMENT_LABEL}</p>
          </div>
          <div className="admin-ad-scada-meta__block">
            <p className="admin-ad-scada-meta__label">Inicio</p>
            <p className="admin-ad-scada-meta__value">
              {campaign.starts_at
                ? formatAdvertisingDateTime(campaign.starts_at)
                : "Sin definir"}
            </p>
          </div>
          <div className="admin-ad-scada-meta__block">
            <p className="admin-ad-scada-meta__label">Finalización</p>
            <p className="admin-ad-scada-meta__value">
              {campaign.ends_at
                ? formatAdvertisingDateTime(campaign.ends_at)
                : "Sin fecha definida"}
            </p>
          </div>
          {destination ? (
            <div className="admin-ad-scada-meta__block">
              <p className="admin-ad-scada-meta__label">Destino de la campaña</p>
              <p className="admin-ad-scada-meta__value">{destinationType}</p>
              <p className="admin-ad-scada-destination__url" title={destination}>
                {destinationDomain} · {destinationPreview}
              </p>
              <div className="admin-ad-scada-destination">
                <a
                  href={destination}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-ad-scada-btn admin-ad-scada-btn--ghost"
                >
                  Abrir enlace
                </a>
                <button
                  type="button"
                  className="admin-ad-scada-btn admin-ad-scada-btn--ghost"
                  onClick={() => void navigator.clipboard.writeText(destination)}
                >
                  Copiar URL
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="admin-ad-scada-metrics" aria-label="Métricas de la campaña">
          <div>
            <p className="admin-ad-scada-metrics__label">Vistas</p>
            <p className="admin-ad-scada-metrics__value">
              {formatAdvertisingNumber(campaign.view_count)}
            </p>
          </div>
          <div>
            <p className="admin-ad-scada-metrics__label">Clics</p>
            <p className="admin-ad-scada-metrics__value">
              {formatAdvertisingNumber(campaign.click_count)}
            </p>
          </div>
          <div>
            <p className="admin-ad-scada-metrics__label">CTR</p>
            <p className="admin-ad-scada-metrics__value">
              {formatAdvertisingCtr(campaign.view_count, campaign.click_count)}
            </p>
          </div>
        </div>

        {alerts.length > 0 ? (
          <ul className="admin-ad-scada-alerts">
            {alerts.map((alert) => (
              <li key={alert}>⚠ {alert}</li>
            ))}
          </ul>
        ) : null}

        {error ? <p className="admin-ad-scada-error">{error}</p> : null}

        <div className="admin-ad-scada-card__actions">
          <Link
            href={editHref}
            className="admin-ad-scada-btn admin-ad-scada-btn--primary"
          >
            Editar
          </Link>
          {canPause ? (
            <button
              type="button"
              className="admin-ad-scada-btn"
              disabled={pending}
              onClick={() => handleToggleActive(false)}
            >
              {pending ? "Procesando…" : "Pausar"}
            </button>
          ) : null}
          {canActivate ? (
            <button
              type="button"
              className="admin-ad-scada-btn"
              disabled={pending}
              onClick={() => handleToggleActive(true)}
            >
              {pending ? "Procesando…" : "Activar"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
