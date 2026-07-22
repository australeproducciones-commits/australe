"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ROUTES } from "@/lib/constants/routes";
import { setAdvertisingCampaignActiveAction } from "@/lib/site/actions";
import {
  ADVERTISING_PLACEMENT_LABEL,
  formatAdvertisingCtr,
  formatAdvertisingDateTime,
  formatAdvertisingNumber,
  getAdvertisingDisplayStatus,
  type AdvertisingDisplayStatus,
} from "@/lib/site/advertising-display";
import type { AdvertisingCampaign } from "@/lib/site/types";

type AdvertisingCompactListProps = {
  campaigns: AdvertisingCampaign[];
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

export function AdvertisingCompactList({ campaigns }: AdvertisingCompactListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggleActive(campaign: AdvertisingCampaign, nextActive: boolean) {
    startTransition(async () => {
      await setAdvertisingCampaignActiveAction(campaign.id, nextActive);
      router.refresh();
    });
  }

  return (
    <div className="admin-ad-scada-list" role="list">
      {campaigns.map((campaign) => {
        const display = getAdvertisingDisplayStatus(campaign);
        const title = campaign.title?.trim() || campaign.internal_name;
        const editHref = `${ROUTES.adminComunidadPublicidad}/${campaign.id}/editar`;
        const canPause = campaign.is_active && display.kind !== "finished";
        const canActivate = !campaign.is_active && display.kind !== "finished";

        return (
          <article key={campaign.id} className="admin-ad-scada-list__row" role="listitem">
            <div>
              <p className="admin-ad-scada-list__name">{title}</p>
              <p className="admin-ad-scada-list__meta">{campaign.internal_name}</p>
            </div>
            <div>
              <span className={`admin-ad-scada-badge ${badgeClass(display.kind)}`}>
                {display.badgeLabel}
              </span>
            </div>
            <div>
              <p className="admin-ad-scada-list__meta">Ubicación</p>
              <p className="admin-ad-scada-list__name" style={{ fontSize: "0.82rem" }}>
                {ADVERTISING_PLACEMENT_LABEL}
              </p>
            </div>
            <div>
              <p className="admin-ad-scada-list__meta">Inicio</p>
              <p style={{ fontSize: "0.82rem" }}>
                {campaign.starts_at
                  ? formatAdvertisingDateTime(campaign.starts_at)
                  : "Sin definir"}
              </p>
            </div>
            <div>
              <p className="admin-ad-scada-list__meta">Fin</p>
              <p style={{ fontSize: "0.82rem" }}>
                {campaign.ends_at
                  ? formatAdvertisingDateTime(campaign.ends_at)
                  : "Sin fecha"}
              </p>
            </div>
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
            <div className="admin-ad-scada-card__actions">
              <Link href={editHref} className="admin-ad-scada-btn admin-ad-scada-btn--primary">
                Editar
              </Link>
              {canPause ? (
                <button
                  type="button"
                  className="admin-ad-scada-btn"
                  disabled={pending}
                  onClick={() => toggleActive(campaign, false)}
                >
                  Pausar
                </button>
              ) : null}
              {canActivate ? (
                <button
                  type="button"
                  className="admin-ad-scada-btn"
                  disabled={pending}
                  onClick={() => toggleActive(campaign, true)}
                >
                  Activar
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
