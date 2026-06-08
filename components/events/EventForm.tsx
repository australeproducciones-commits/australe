"use client";

import { useActionState, useState } from "react";
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
  flyer_url: "",
  banner_url: "",
  event_date: "",
  start_time: "",
  end_time: "",
  location_name: "",
  address: "",
  capacity: "",
  status: "draft",
  is_featured: false,
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

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Flyer URL">
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

          <Field label="Banner URL">
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
        </div>

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

        <Field label="Link externo de entradas">
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

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
          <input
            name="is_featured"
            type="checkbox"
            checked={values.is_featured}
            onChange={(e) => updateField("is_featured", e.target.checked)}
            disabled={pending}
            className="h-5 w-5 rounded border-white/20 bg-zinc-900"
          />
          <span className="text-sm text-zinc-300">Marcar como evento destacado</span>
        </label>

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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-400">{label}</span>
      {children}
    </label>
  );
}
