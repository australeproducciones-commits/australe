"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  deleteAdvertisingCampaignAction,
  saveAdvertisingCampaignAction,
} from "@/lib/site/actions";
import {
  ADVERTISING_PLACEMENT_LABEL,
  formatDestinationDomain,
  isValidAdvertisingDestination,
  truncateDestinationUrl,
} from "@/lib/site/advertising-display";
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

function priorityLabel(value: number): string {
  if (value >= 10) return "Alta";
  if (value >= 5) return "Normal";
  return "Baja";
}

export function AdminAdvertisingCampaignForm({
  campaign,
}: AdminAdvertisingCampaignFormProps) {
  const router = useRouter();
  const isEdit = Boolean(campaign);
  const [draft, setDraft] = useState<AdvertisingCampaignInput>(
    campaign ? toDraft(campaign) : emptyCampaign,
  );
  const [noEndDate, setNoEndDate] = useState(!campaign?.ends_at);
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const previewTitle = draft.title || "Participá por una entrada";
  const previewBody = draft.body || "Texto breve de la publicidad.";
  const destination = draft.destination_url?.trim() ?? "";

  const destinationPreview = useMemo(() => {
    if (!destination) return "Sin destino configurado";
    if (destination.startsWith("/")) {
      return `australeproducciones.com${destination}`;
    }
    return formatDestinationDomain(destination);
  }, [destination]);

  const checklist = {
    mainInfo: Boolean(draft.internal_name.trim() && draft.title?.trim()),
    image: Boolean(draft.image_url?.trim()) && !imagePreviewError,
    destination: Boolean(destination) && isValidAdvertisingDestination(destination),
    dates:
      Boolean(draft.starts_at) &&
      (noEndDate || Boolean(draft.ends_at)) &&
      (!draft.starts_at ||
        !draft.ends_at ||
        new Date(draft.starts_at) < new Date(draft.ends_at)),
    status: true,
  };

  const canSubmit =
    checklist.mainInfo &&
    checklist.destination &&
    checklist.dates &&
    !loading;

  function updateDraft<K extends keyof AdvertisingCampaignInput>(
    key: K,
    value: AdvertisingCampaignInput[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (key === "image_url") {
      setImagePreviewError(false);
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    if (!draft.internal_name.trim()) {
      setMessage("El nombre interno es obligatorio.");
      return;
    }

    if (!destination || !isValidAdvertisingDestination(destination)) {
      setMessage("Indicá un destino válido (ruta interna o URL https).");
      return;
    }

    if (
      draft.starts_at &&
      draft.ends_at &&
      !noEndDate &&
      new Date(draft.starts_at) >= new Date(draft.ends_at)
    ) {
      setMessage("La fecha de finalización debe ser posterior al inicio.");
      return;
    }

    setLoading(true);
    const result = await saveAdvertisingCampaignAction(
      {
        ...draft,
        starts_at: draft.starts_at || null,
        ends_at: noEndDate ? null : draft.ends_at || null,
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
    if (!campaign) return;
    if (!window.confirm("¿Eliminar esta publicidad?")) return;
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
        <header>
          <p className="admin-ad-scada-page__kicker">Comunidad · Publicidad</p>
          <h1 className="admin-ad-scada-form__title">
            {isEdit ? "Editar publicidad" : "Nueva publicidad"}
          </h1>
          <p className="admin-ad-scada-muted">
            Configurá el contenido, la programación y el destino de la campaña.
          </p>
        </header>

        <section className="admin-ad-scada-form-section">
          <div>
            <h2 className="admin-ad-scada-form-section__title">Información de la campaña</h2>
            <p className="admin-ad-scada-form-section__description">
              El nombre interno se usa en el panel. El título y la descripción se muestran al usuario.
            </p>
          </div>
          <Field
            id="internal_name"
            label="Nombre de la publicidad"
            required
            help="Este nombre será visible únicamente dentro del panel administrativo."
            placeholder="Ej.: Concurso entradas Divididos"
          >
            <input
              id="internal_name"
              className="admin-ad-scada-input"
              value={draft.internal_name}
              onChange={(e) => updateDraft("internal_name", e.target.value)}
              required
            />
          </Field>
          <Field
            id="title"
            label="Título público"
            required
            help="Mensaje principal que verá el usuario."
            placeholder="Ej.: Participá por una entrada"
          >
            <input
              id="title"
              className="admin-ad-scada-input"
              value={draft.title ?? ""}
              onChange={(e) => updateDraft("title", e.target.value)}
            />
          </Field>
          <Field
            id="body"
            label="Descripción"
            optional
            help="Contá brevemente qué se promociona y por qué debería interesarle al usuario."
            placeholder="Contá brevemente qué se promociona…"
          >
            <textarea
              id="body"
              className="admin-ad-scada-textarea"
              rows={3}
              value={draft.body ?? ""}
              onChange={(e) => updateDraft("body", e.target.value)}
            />
          </Field>
          <Field
            id="button_label"
            label="Texto del botón"
            optional
            help="Etiqueta del botón principal del pop-up."
            placeholder="Ej.: Ver más"
          >
            <input
              id="button_label"
              className="admin-ad-scada-input"
              value={draft.button_label ?? ""}
              onChange={(e) => updateDraft("button_label", e.target.value)}
            />
          </Field>
        </section>

        <section className="admin-ad-scada-form-section">
          <div>
            <h2 className="admin-ad-scada-form-section__title">Imagen publicitaria</h2>
            <p className="admin-ad-scada-form-section__description">
              Usá una imagen clara y legible, preferentemente horizontal.
            </p>
          </div>
          <Field
            id="image_url"
            label="URL de imagen"
            optional
            help="Recomendado para pop-up: 1600 × 900 px · proporción 16:9. WebP o JPG entre 200 y 800 KB."
          >
            <input
              id="image_url"
              className="admin-ad-scada-input"
              value={draft.image_url ?? ""}
              onChange={(e) => updateDraft("image_url", e.target.value)}
              placeholder="https://..."
            />
          </Field>
          <div className="admin-ad-scada-preview__card">
            {draft.image_url?.trim() && !imagePreviewError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.image_url}
                alt="Vista previa"
                className="admin-ad-scada-preview__image"
                onError={() => setImagePreviewError(true)}
              />
            ) : (
              <div className="admin-ad-scada-preview__fallback">
                {imagePreviewError
                  ? "No se pudo cargar la imagen"
                  : "Sin imagen seleccionada"}
              </div>
            )}
          </div>
        </section>

        <section className="admin-ad-scada-form-section">
          <div>
            <h2 className="admin-ad-scada-form-section__title">Ubicación de la publicidad</h2>
            <p className="admin-ad-scada-form-section__description">
              {ADVERTISING_PLACEMENT_LABEL}
            </p>
          </div>
          <p className="admin-ad-scada-field__hint">
            Ubicación aproximada: Comunidad → ingreso principal → ventana emergente
          </p>
        </section>

        <section className="admin-ad-scada-form-section">
          <div>
            <h2 className="admin-ad-scada-form-section__title">Acción al hacer clic</h2>
            <p className="admin-ad-scada-form-section__description">
              Indicá adónde será enviado el usuario cuando haga clic.
            </p>
          </div>
          <Field
            id="destination_url"
            label="URL o ruta de destino"
            required
            help="Ejemplos válidos: /eventos/divididos o https://sitio-externo.com"
          >
            <input
              id="destination_url"
              className="admin-ad-scada-input"
              value={draft.destination_url ?? ""}
              onChange={(e) => updateDraft("destination_url", e.target.value)}
              placeholder="/eventos/divididos"
            />
          </Field>
          <p className="admin-ad-scada-field__hint">
            El usuario será dirigido a: {destinationPreview}
            {destination ? ` (${truncateDestinationUrl(destination)})` : ""}
          </p>
          <label className="admin-ad-scada-check">
            <span>Abrir enlace en nueva pestaña</span>
            <input
              type="checkbox"
              checked={draft.open_in_new_tab}
              onChange={(e) => updateDraft("open_in_new_tab", e.target.checked)}
            />
          </label>
        </section>

        <section className="admin-ad-scada-form-section">
          <div>
            <h2 className="admin-ad-scada-form-section__title">Programación</h2>
            <p className="admin-ad-scada-form-section__description">
              Hora de Argentina
            </p>
          </div>
          <div className="admin-ad-scada-form__grid">
            <Field
              id="starts_at"
              label="Fecha y hora de inicio"
              optional
              help="Momento desde el cual la publicidad podrá mostrarse."
            >
              <input
                id="starts_at"
                type="datetime-local"
                className="admin-ad-scada-input"
                value={draft.starts_at ?? ""}
                onChange={(e) => updateDraft("starts_at", e.target.value)}
              />
            </Field>
            <Field
              id="ends_at"
              label="Fecha y hora de finalización"
              optional
              help="Después de esta fecha la campaña dejará de mostrarse."
            >
              <input
                id="ends_at"
                type="datetime-local"
                className="admin-ad-scada-input"
                value={draft.ends_at ?? ""}
                onChange={(e) => updateDraft("ends_at", e.target.value)}
                disabled={noEndDate}
              />
            </Field>
          </div>
          <label className="admin-ad-scada-switch-row">
            <span>
              <strong>Sin fecha de finalización</strong>
              <p className="admin-ad-scada-field__hint">
                La campaña permanecerá vigente hasta que la pausés manualmente.
              </p>
            </span>
            <input
              type="checkbox"
              checked={noEndDate}
              onChange={(e) => setNoEndDate(e.target.checked)}
            />
          </label>
          <label className="admin-ad-scada-switch-row">
            <span>
              <strong>Estado inicial: activa</strong>
              <p className="admin-ad-scada-field__hint">
                Si está desactivada, la campaña quedará en borrador/pausada.
              </p>
            </span>
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) => updateDraft("is_active", e.target.checked)}
            />
          </label>
        </section>

        <section className="admin-ad-scada-form-section">
          <div>
            <h2 className="admin-ad-scada-form-section__title">Prioridad y frecuencia</h2>
          </div>
          <Field
            id="priority"
            label="Prioridad de aparición"
            help="Las campañas con mayor prioridad pueden mostrarse antes que otras activas."
          >
            <input
              id="priority"
              type="number"
              min={0}
              max={100}
              className="admin-ad-scada-input"
              value={draft.priority}
              onChange={(e) =>
                updateDraft("priority", Number(e.target.value) || 0)
              }
            />
            <p className="admin-ad-scada-field__hint">
              Nivel actual: {priorityLabel(draft.priority)} ({draft.priority})
            </p>
          </Field>
          <Field id="frequency" label="Frecuencia">
            <select
              id="frequency"
              className="admin-ad-scada-select"
              value={draft.frequency}
              onChange={(e) =>
                updateDraft("frequency", e.target.value as AdvertisingFrequency)
              }
            >
              {ADVERTISING_FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                  {option.recommended ? " (recomendado)" : ""}
                </option>
              ))}
            </select>
          </Field>
        </section>

        {message ? <p className="admin-ad-scada-error">{message}</p> : null}

        <div className="admin-ad-scada-form__actions">
          <button
            type="submit"
            disabled={!canSubmit}
            className="admin-ad-scada-btn admin-ad-scada-btn--primary"
          >
            {loading
              ? "Guardando…"
              : isEdit
                ? "Guardar cambios"
                : "Crear publicidad"}
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

      <aside className="admin-ad-scada-form-summary" aria-label="Resumen de campaña">
        <h2 className="admin-ad-scada-form-section__title">Resumen de campaña</h2>
        <dl className="admin-ad-scada-meta">
          <SummaryRow label="Nombre" value={draft.internal_name || "Sin definir"} />
          <SummaryRow label="Ubicación" value={ADVERTISING_PLACEMENT_LABEL} />
          <SummaryRow
            label="Estado"
            value={draft.is_active ? "Activa" : "Pausada / borrador"}
          />
          <SummaryRow
            label="Inicio"
            value={draft.starts_at ? draft.starts_at.replace("T", " · ") : "Sin definir"}
          />
          <SummaryRow
            label="Finalización"
            value={
              noEndDate
                ? "Sin fecha de finalización"
                : draft.ends_at
                  ? draft.ends_at.replace("T", " · ")
                  : "Sin definir"
            }
          />
          <SummaryRow label="Destino" value={destinationPreview} />
          <SummaryRow label="Prioridad" value={priorityLabel(draft.priority)} />
        </dl>
        <ul className="admin-ad-scada-checklist">
          <ChecklistItem done={checklist.mainInfo} label="Información principal completa" />
          <ChecklistItem done={checklist.image} label="Imagen válida" />
          <ChecklistItem done={checklist.destination} label="Destino configurado" />
          <ChecklistItem done={checklist.dates} label="Fechas válidas" />
          <ChecklistItem done={checklist.status} label="Estado definido" />
        </ul>
        <p className="admin-ad-scada-field__hint">
          {draft.is_active
            ? "La campaña se guardará como activa si cumple los requisitos."
            : "La campaña se guardará como borrador o pausada."}
        </p>
        <div className="admin-ad-scada-preview__card">
          <div className="admin-ad-scada-preview__content">
            <h3 className="admin-ad-scada-preview__heading">{previewTitle}</h3>
            <p className="admin-ad-scada-preview__body">{previewBody}</p>
            {draft.button_label ? (
              <div className="admin-ad-scada-preview__actions">
                <span className="admin-ad-scada-preview__button">{draft.button_label}</span>
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({
  id,
  label,
  help,
  optional,
  required,
  placeholder,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  optional?: boolean;
  required?: boolean;
  placeholder?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="admin-ad-scada-field" htmlFor={id}>
      <span className="admin-ad-scada-field__label">
        {label}
        {required ? " *" : optional ? " (opcional)" : ""}
      </span>
      {children}
      {help ? <span className="admin-ad-scada-field__hint">{help}</span> : null}
      {placeholder ? null : null}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-ad-scada-meta__block">
      <dt className="admin-ad-scada-meta__label">{label}</dt>
      <dd className="admin-ad-scada-meta__value">{value}</dd>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li className={`admin-ad-scada-checklist__item${done ? " is-done" : ""}`}>
      <span aria-hidden>{done ? "✓" : "○"}</span>
      {label}
    </li>
  );
}
