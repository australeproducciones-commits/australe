"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ROUTES } from "@/lib/constants/routes";
import {
  deleteEventStreamAction,
  saveEventStreamAction,
} from "@/lib/streaming/admin-actions";
import { streamToFormInput } from "@/lib/streaming/utils";
import {
  STREAM_PROVIDER_LABELS,
  STREAM_STATUS_LABELS,
  type EventStream,
  type StreamActionResult,
} from "@/lib/streaming/types";
import { STREAM_PROVIDER, STREAM_STATUS } from "@/lib/streaming/types";

const inputClassName =
  "w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/30";

const labelClassName = "mb-2 block text-sm font-medium text-zinc-300";

type AdminStreamingFormProps = {
  eventId: string;
  eventSlug: string;
  stream?: EventStream | null;
};

const initialState: StreamActionResult = { ok: false };

export function AdminStreamingForm({
  eventId,
  eventSlug,
  stream,
}: AdminStreamingFormProps) {
  const boundAction = saveEventStreamAction.bind(null, eventId, eventSlug);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [deleting, setDeleting] = useState(false);
  const defaults = stream
    ? streamToFormInput(stream)
    : {
        title: "",
        subtitle: "",
        is_enabled: false,
        status: STREAM_STATUS.DRAFT,
        provider: STREAM_PROVIDER.YOUTUBE,
        stream_url: "",
        starts_at: "",
        ends_at: "",
        stream_banner_url: "",
        stream_banner_mobile_url: "",
        home_featured: false,
        home_order: 0,
        show_on_streaming_page: true,
        show_on_event_page: true,
        button_label: "",
      };

  async function handleDelete() {
    if (!stream?.id) {
      return;
    }
    if (
      !window.confirm(
        "¿Eliminar esta configuración de streaming? Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await deleteEventStreamAction(stream.id, eventSlug);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form action={formAction} className="space-y-8">
      {stream?.id ? <input type="hidden" name="stream_id" value={stream.id} /> : null}

      {state.message ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            state.ok
              ? "border-green-500/30 bg-green-500/10 text-green-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <Card padding="sm" className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white">Configuración general</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Definí título, estado, plataforma y URL de la transmisión.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm text-zinc-200">
          <input
            type="checkbox"
            name="is_enabled"
            defaultChecked={defaults.is_enabled}
            className="h-4 w-4 rounded border-zinc-600"
          />
          Habilitar streaming
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="title" className={labelClassName}>
              Título
            </label>
            <input
              id="title"
              name="title"
              className={inputClassName}
              defaultValue={defaults.title}
              placeholder="Título de la transmisión"
            />
          </div>
          <div>
            <label htmlFor="subtitle" className={labelClassName}>
              Subtítulo
            </label>
            <input
              id="subtitle"
              name="subtitle"
              className={inputClassName}
              defaultValue={defaults.subtitle}
              placeholder="Subtítulo opcional"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="status" className={labelClassName}>
              Estado
            </label>
            <select
              id="status"
              name="status"
              defaultValue={defaults.status}
              className={inputClassName}
            >
              {Object.entries(STREAM_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="provider" className={labelClassName}>
              Plataforma
            </label>
            <select
              id="provider"
              name="provider"
              defaultValue={defaults.provider}
              className={inputClassName}
            >
              {Object.entries(STREAM_PROVIDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="stream_url" className={labelClassName}>
            URL de transmisión
          </label>
          <input
            id="stream_url"
            name="stream_url"
            type="url"
            className={inputClassName}
            defaultValue={defaults.stream_url}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="starts_at" className={labelClassName}>
              Inicio
            </label>
            <input
              id="starts_at"
              name="starts_at"
              type="datetime-local"
              className={inputClassName}
              defaultValue={defaults.starts_at}
            />
          </div>
          <div>
            <label htmlFor="ends_at" className={labelClassName}>
              Finalización estimada
            </label>
            <input
              id="ends_at"
              name="ends_at"
              type="datetime-local"
              className={inputClassName}
              defaultValue={defaults.ends_at}
            />
          </div>
        </div>
      </Card>

      <Card padding="sm" className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white">Visibilidad</h2>
        </div>

        <div className="space-y-3 text-sm text-zinc-200">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="show_on_streaming_page"
              defaultChecked={defaults.show_on_streaming_page}
              className="h-4 w-4 rounded border-zinc-600"
            />
            Mostrar en /en-vivo
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="show_on_event_page"
              defaultChecked={defaults.show_on_event_page}
              className="h-4 w-4 rounded border-zinc-600"
            />
            Mostrar en la página del evento
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="home_featured"
              defaultChecked={defaults.home_featured}
              className="h-4 w-4 rounded border-zinc-600"
            />
            Destacar en la página de inicio
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="home_order" className={labelClassName}>
              Orden en inicio
            </label>
            <input
              id="home_order"
              name="home_order"
              type="number"
              className={inputClassName}
              defaultValue={defaults.home_order}
              min={0}
            />
          </div>
          <div>
            <label htmlFor="button_label" className={labelClassName}>
              Texto del botón
            </label>
            <input
              id="button_label"
              name="button_label"
              className={inputClassName}
              defaultValue={defaults.button_label}
              placeholder="Ver transmisión"
            />
          </div>
        </div>
      </Card>

      <Card padding="sm" className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white">Imágenes</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Banner horizontal: 2400 × 1000 px · proporción 12:5. Banner móvil: 1080 × 1350 px · proporción 4:5.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="stream_banner_url" className={labelClassName}>
              Banner horizontal (URL)
            </label>
            <input
              id="stream_banner_url"
              name="stream_banner_url"
              type="url"
              className={inputClassName}
              defaultValue={defaults.stream_banner_url}
            />
          </div>
          <div>
            <label htmlFor="stream_banner_mobile_url" className={labelClassName}>
              Banner móvil (URL, opcional)
            </label>
            <input
              id="stream_banner_mobile_url"
              name="stream_banner_mobile_url"
              type="url"
              className={inputClassName}
              defaultValue={defaults.stream_banner_mobile_url}
            />
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : stream ? "Guardar cambios" : "Crear transmisión"}
        </Button>
        {stream ? (
          <Button type="button" variant="outline" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Eliminando…" : "Eliminar"}
          </Button>
        ) : null}
        {stream && eventSlug ? (
          <Button href={ROUTES.eventoEnVivo(eventSlug)} variant="outline" target="_blank">
            Abrir página pública
          </Button>
        ) : null}
      </div>
    </form>
  );
}
