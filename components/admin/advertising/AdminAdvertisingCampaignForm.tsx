"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteAdvertisingCampaignAction,
  saveAdvertisingCampaignAction,
} from "@/lib/site/actions";
import {
  ADVERTISING_FREQUENCY_OPTIONS,
  DEFAULT_ADVERTISING_FREQUENCY,
  type AdvertisingCampaign,
  type AdvertisingCampaignInput,
  type AdvertisingFrequency,
} from "@/lib/site/types";
import { ROUTES } from "@/lib/constants/routes";

type AdminAdvertisingCampaignFormProps = {
  campaign?: AdvertisingCampaign;
};

const emptyCampaign: AdvertisingCampaignInput = {
  internal_name: "",
  title: "",
  body: "",
  image_url: "",
  button_label: "",
  destination_url: "",
  is_active: false,
  starts_at: "",
  ends_at: "",
  priority: 0,
  frequency: DEFAULT_ADVERTISING_FREQUENCY,
  open_in_new_tab: true,
};

function toDraft(campaign: AdvertisingCampaign): AdvertisingCampaignInput {
  return {
    internal_name: campaign.internal_name,
    title: campaign.title ?? "",
    body: campaign.body ?? "",
    image_url: campaign.image_url ?? "",
    button_label: campaign.button_label ?? "",
    destination_url: campaign.destination_url ?? "",
    is_active: campaign.is_active,
    starts_at: campaign.starts_at?.slice(0, 16) ?? "",
    ends_at: campaign.ends_at?.slice(0, 16) ?? "",
    priority: campaign.priority,
    frequency: campaign.frequency,
    open_in_new_tab: campaign.open_in_new_tab,
  };
}

export function AdminAdvertisingCampaignForm({
  campaign,
}: AdminAdvertisingCampaignFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<AdvertisingCampaignInput>(
    campaign ? toDraft(campaign) : emptyCampaign,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const previewTitle = draft.title || "Título de la campaña";
  const previewBody = draft.body || "Texto breve de la publicidad.";

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await saveAdvertisingCampaignAction(
      {
        ...draft,
        starts_at: draft.starts_at || null,
        ends_at: draft.ends_at || null,
      },
      campaign?.id,
    );

    setLoading(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    router.push(ROUTES.adminComunidadPublicidad);
    router.refresh();
  }

  async function handleDelete() {
    if (!campaign) {
      return;
    }
    if (!window.confirm("¿Eliminar esta publicidad?")) {
      return;
    }
    const result = await deleteAdvertisingCampaignAction(campaign.id);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    router.push(ROUTES.adminComunidadPublicidad);
    router.refresh();
  }

  return (
    <div className="admin-ad-scada-form-layout">
      <form onSubmit={(event) => void handleSave(event)} className="admin-ad-scada-form">
        <h2 className="admin-ad-scada-form__title">
          {campaign ? "Editar publicidad" : "Nueva publicidad"}
        </h2>
        {(
          [
            ["internal_name", "Nombre interno", true],
            ["title", "Título público", false],
            ["body", "Texto", false],
            ["image_url", "URL de imagen", false],
            ["button_label", "Texto del botón", false],
            ["destination_url", "Enlace del botón", false],
          ] as const
        ).map(([key, label, required]) => (
          <div key={key}>
            <label className="admin-ad-scada-field__label" htmlFor={key}>
              {label}
            </label>
            <input
              id={key}
              className="admin-ad-scada-input"
              value={draft[key] ?? ""}
              onChange={(event) =>
                setDraft((current) => ({ ...current, [key]: event.target.value }))
              }
              required={required}
            />
          </div>
        ))}
        <div className="admin-ad-scada-form__grid">
          <div>
            <label className="admin-ad-scada-field__label" htmlFor="starts_at">
              Inicio
            </label>
            <input
              id="starts_at"
              type="datetime-local"
              className="admin-ad-scada-input"
              value={draft.starts_at ?? ""}
              onChange={(event) =>
                setDraft((current) => ({ ...current, starts_at: event.target.value }))
              }
            />
          </div>
          <div>
            <label className="admin-ad-scada-field__label" htmlFor="ends_at">
              Fin
            </label>
            <input
              id="ends_at"
              type="datetime-local"
              className="admin-ad-scada-input"
              value={draft.ends_at ?? ""}
              onChange={(event) =>
                setDraft((current) => ({ ...current, ends_at: event.target.value }))
              }
            />
          </div>
        </div>
        <div>
          <label className="admin-ad-scada-field__label" htmlFor="priority">
            Prioridad
          </label>
          <input
            id="priority"
            type="number"
            className="admin-ad-scada-input"
            value={draft.priority}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                priority: Number(event.target.value) || 0,
              }))
            }
          />
        </div>
        <div>
          <label className="admin-ad-scada-field__label" htmlFor="frequency">
            Frecuencia
          </label>
          <select
            id="frequency"
            className="admin-ad-scada-select"
            value={draft.frequency}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                frequency: event.target.value as AdvertisingFrequency,
              }))
            }
          >
            {ADVERTISING_FREQUENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
                {option.recommended ? " (recomendado)" : ""}
              </option>
            ))}
          </select>
        </div>
        <label className="admin-ad-scada-check">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(event) =>
              setDraft((current) => ({ ...current, is_active: event.target.checked }))
            }
          />
          Activa
        </label>
        <label className="admin-ad-scada-check">
          <input
            type="checkbox"
            checked={draft.open_in_new_tab}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                open_in_new_tab: event.target.checked,
              }))
            }
          />
          Abrir enlace en nueva pestaña
        </label>
        {message ? <p className="admin-ad-scada-error">{message}</p> : null}
        <div className="admin-ad-scada-form__actions">
          <button
            type="submit"
            disabled={loading}
            className="admin-ad-scada-btn admin-ad-scada-btn--primary"
          >
            {loading ? "Guardando…" : "Guardar"}
          </button>
          <Link href={ROUTES.adminComunidadPublicidad} className="admin-ad-scada-btn">
            Cancelar
          </Link>
          {campaign ? (
            <button
              type="button"
              className="admin-ad-scada-btn admin-ad-scada-btn--danger"
              onClick={() => void handleDelete()}
            >
              Eliminar
            </button>
          ) : null}
        </div>
      </form>

      <aside className="admin-ad-scada-preview" aria-label="Vista previa">
        <h2 className="admin-ad-scada-form__title">Vista previa</h2>
        <div className="admin-ad-scada-preview__card">
          {draft.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.image_url}
              alt=""
              className="admin-ad-scada-preview__image"
            />
          ) : (
            <div className="admin-ad-scada-preview__fallback">Sin imagen</div>
          )}
          <h3 className="admin-ad-scada-preview__heading">{previewTitle}</h3>
          <p className="admin-ad-scada-preview__body">{previewBody}</p>
          {draft.destination_url && draft.button_label ? (
            <span className="admin-ad-scada-preview__button">{draft.button_label}</span>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
