"use client";

import { useActionState, useState } from "react";
import { EventImageAdminPreview } from "@/components/events/EventImageAdminPreview";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  EVENT_STATUS_LABELS,
  EVENT_STATUS_VALUES,
  TICKET_SALE_MODE_LABELS,
  TICKET_SALE_MODE_VALUES,
} from "@/lib/constants/event-status";
import type { EventFormInput } from "@/lib/events/types";
import { slugifyName } from "@/lib/events/utils";
import { cn } from "@/lib/utils/cn";

const inputClassName =
  "w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none placeholder:text-zinc-500 focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/30";

type EventFormProps = {
  initialValues?: EventFormInput;
  action: (
    prevState: { success: boolean; error?: string },
    formData: FormData,
  ) => Promise<{ success: boolean; error?: string }>;
  submitLabel: string;
  autoSlug?: boolean;
};

const defaultValues: EventFormInput = {
  name: "",
  slug: "",
  description: "",
  main_image_url: "",
  thumbnail_url: "",
  flyer_url: "",
  banner_url: "",
  social_presale_price: "",
  social_regular_price: "",
  box_office_preview: "",
  event_date: "",
  start_time: "",
  end_time: "",
  location_name: "",
  address: "",
  capacity: "",
  status: "draft",
  is_featured: false,
  featured_ticket_label: "",
  featured_until: "",
  home_order: "0",
  external_ticket_url: "",
  ticket_sale_mode: "internal",
};

export function EventForm({
  initialValues,
  action,
  submitLabel,
  autoSlug = false,
}: EventFormProps) {
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  });
  const [values, setValues] = useState(initialValues ?? defaultValues);
  const [slugTouched, setSlugTouched] = useState(!autoSlug);

  function updateField<K extends keyof EventFormInput>(
    key: K,
    value: EventFormInput[K],
  ) {
    setValues((prev) => {
      const next = { ...prev, [key]: value };

      if (autoSlug && key === "name" && !slugTouched) {
        next.slug = slugifyName(String(value));
      }

      return next;
    });
  }

  return (
    <Card padding="lg">
      <form action={formAction} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nombre *">
            <input
              name="name"
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
              className={inputClassName}
              required
              disabled={pending}
            />
          </Field>

          <Field label="Slug *">
            <input
              name="slug"
              value={values.slug}
              onChange={(e) => {
                setSlugTouched(true);
                updateField("slug", e.target.value.toLowerCase());
              }}
              className={inputClassName}
              placeholder="noche-australe"
              required
              disabled={pending}
            />
          </Field>
        </div>

        <Field label="Descripción">
          <textarea
            name="description"
            value={values.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={4}
            className={cn(inputClassName, "resize-y")}
            disabled={pending}
          />
        </Field>

        <Field
          label="Imagen principal del evento"
          hint="Recomendado: imagen cuadrada o amplia, ideal 2400×2400 px."
        >
          <input
            name="main_image_url"
            type="url"
            value={values.main_image_url}
            onChange={(e) => updateField("main_image_url", e.target.value)}
            className={inputClassName}
            placeholder="https://..."
            disabled={pending}
          />
        </Field>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-4 text-sm font-medium text-zinc-300">
            Vista previa de recortes
          </p>
          <EventImageAdminPreview imageUrl={values.main_image_url} />
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Punto Social anticipado">
            <input
              name="social_presale_price"
              type="number"
              min={0}
              step="0.01"
              value={values.social_presale_price}
              onChange={(e) =>
                updateField("social_presale_price", e.target.value)
              }
              className={inputClassName}
              placeholder="Ej. 15000"
              disabled={pending}
            />
          </Field>
          <Field label="Punto Social normal">
            <input
              name="social_regular_price"
              type="number"
              min={0}
              step="0.01"
              value={values.social_regular_price}
              onChange={(e) =>
                updateField("social_regular_price", e.target.value)
              }
              className={inputClassName}
              placeholder="Ej. 18000"
              disabled={pending}
            />
          </Field>
          <Field label="Vista previa de mostrador">
            <input
              name="box_office_preview"
              value={values.box_office_preview}
              onChange={(e) =>
                updateField("box_office_preview", e.target.value)
              }
              className={inputClassName}
              placeholder="Ej. Desde $20.000 en puerta"
              disabled={pending}
            />
          </Field>
        </div>

        <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <summary className="cursor-pointer text-sm font-medium text-zinc-300">
            Carga avanzada (flyer / banner / miniatura)
          </summary>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            <Field label="Flyer URL (opcional)">
              <input
                name="flyer_url"
                type="url"
                value={values.flyer_url}
                onChange={(e) => updateField("flyer_url", e.target.value)}
                className={inputClassName}
                placeholder="https://..."
                disabled={pending}
              />
            </Field>
            <Field label="Banner URL (opcional)">
              <input
                name="banner_url"
                type="url"
                value={values.banner_url}
                onChange={(e) => updateField("banner_url", e.target.value)}
                className={inputClassName}
                placeholder="https://..."
                disabled={pending}
              />
            </Field>
            <Field label="Miniatura URL (opcional)">
              <input
                name="thumbnail_url"
                type="url"
                value={values.thumbnail_url}
                onChange={(e) => updateField("thumbnail_url", e.target.value)}
                className={inputClassName}
                placeholder="https://..."
                disabled={pending}
              />
            </Field>
          </div>
        </details>

        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Fecha *">
            <input
              name="event_date"
              type="date"
              value={values.event_date}
              onChange={(e) => updateField("event_date", e.target.value)}
              className={inputClassName}
              required
              disabled={pending}
            />
          </Field>

          <Field label="Hora inicio">
            <input
              name="start_time"
              type="time"
              value={values.start_time}
              onChange={(e) => updateField("start_time", e.target.value)}
              className={inputClassName}
              disabled={pending}
            />
          </Field>

          <Field label="Hora fin">
            <input
              name="end_time"
              type="time"
              value={values.end_time}
              onChange={(e) => updateField("end_time", e.target.value)}
              className={inputClassName}
              disabled={pending}
            />
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Lugar">
            <input
              name="location_name"
              value={values.location_name}
              onChange={(e) => updateField("location_name", e.target.value)}
              className={inputClassName}
              disabled={pending}
            />
          </Field>

          <Field label="Dirección">
            <input
              name="address"
              value={values.address}
              onChange={(e) => updateField("address", e.target.value)}
              className={inputClassName}
              disabled={pending}
            />
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Capacidad">
            <input
              name="capacity"
              type="number"
              min={0}
              value={values.capacity}
              onChange={(e) => updateField("capacity", e.target.value)}
              className={inputClassName}
              disabled={pending}
            />
          </Field>

          <Field label="Estado">
            <select
              name="status"
              value={values.status}
              onChange={(e) =>
                updateField("status", e.target.value as EventFormInput["status"])
              }
              className={inputClassName}
              disabled={pending}
            >
              {EVENT_STATUS_VALUES.map((status) => (
                <option key={status} value={status} className="bg-zinc-900">
                  {EVENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Modo de venta">
            <select
              name="ticket_sale_mode"
              value={values.ticket_sale_mode}
              onChange={(e) =>
                updateField(
                  "ticket_sale_mode",
                  e.target.value as EventFormInput["ticket_sale_mode"],
                )
              }
              className={inputClassName}
              disabled={pending}
            >
              {TICKET_SALE_MODE_VALUES.map((mode) => (
                <option key={mode} value={mode} className="bg-zinc-900">
                  {TICKET_SALE_MODE_LABELS[mode]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Link externo de venta">
          <input
            name="external_ticket_url"
            type="url"
            value={values.external_ticket_url}
            onChange={(e) => updateField("external_ticket_url", e.target.value)}
            className={inputClassName}
            placeholder="https://..."
            disabled={pending}
          />
        </Field>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <label className="flex items-center gap-3">
            <input
              name="is_featured"
              type="checkbox"
              checked={values.is_featured}
              onChange={(e) => updateField("is_featured", e.target.checked)}
              disabled={pending}
              className="h-5 w-5 rounded border-white/20 bg-zinc-900"
            />
            <span className="text-sm text-zinc-300">
              Destacar en página principal
            </span>
          </label>

          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Ticket destacado">
              <input
                name="featured_ticket_label"
                value={values.featured_ticket_label}
                onChange={(e) =>
                  updateField("featured_ticket_label", e.target.value)
                }
                className={inputClassName}
                placeholder="Ej. Preventa abierta"
                disabled={pending}
              />
            </Field>
            <Field label="Destacar hasta">
              <input
                name="featured_until"
                type="datetime-local"
                value={values.featured_until}
                onChange={(e) => updateField("featured_until", e.target.value)}
                className={inputClassName}
                disabled={pending}
              />
            </Field>
            <Field label="Orden en home">
              <input
                name="home_order"
                type="number"
                min={0}
                value={values.home_order}
                onChange={(e) => updateField("home_order", e.target.value)}
                className={inputClassName}
                disabled={pending}
              />
            </Field>
          </div>
        </div>

        {state.error ? (
          <p className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            Evento guardado correctamente.
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Guardando..." : submitLabel}
        </Button>
      </form>
    </Card>
  );
}

function Field({
  label,
  hint,
  help,
  children,
}: {
  label: string;
  hint?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-300">{label}</span>
      {hint ? (
        <span className="mb-2 block text-xs leading-5 text-purple-300/80">
          {hint}
        </span>
      ) : null}
      {children}
      {help ? (
        <span className="mt-2 block text-xs leading-5 text-zinc-500">{help}</span>
      ) : null}
    </label>
  );
}
