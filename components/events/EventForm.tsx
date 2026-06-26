"use client";

import { useActionState, useMemo, useState } from "react";
import {
  deriveInitialDurationParts,
  EventFormScheduleFields,
  FormSection,
} from "@/components/events/EventFormScheduleFields";
import { EventImageAdminPreview } from "@/components/events/EventImageAdminPreview";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  EVENT_CONTENT_KIND,
  EVENT_CONTENT_KIND_LABELS,
  EVENT_CONTENT_KIND_VALUES,
} from "@/lib/constants/event-content-kind";
import {
  EVENT_AUDIENCE_LABELS,
  EVENT_AUDIENCE_VALUES,
} from "@/lib/constants/event-audience";
import {
  EVENT_STATUS,
  EVENT_STATUS_LABELS,
  EVENT_STATUS_VALUES,
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
  activeTicketTypeCount?: number;
};

const defaultValues: EventFormInput = {
  content_kind: EVENT_CONTENT_KIND.EVENT,
  name: "",
  slug: "",
  description: "",
  main_image_url: "",
  thumbnail_url: "",
  flyer_url: "",
  banner_url: "",
  event_date: "",
  event_end_date: "",
  start_time: "",
  end_time: "",
  location_name: "",
  address: "",
  capacity: "",
  status: "draft",
  audience: "public",
  is_featured: false,
  featured_ticket_label: "",
  featured_until: "",
  home_order: "0",
  external_ticket_url: "",
  ticket_sale_mode: "internal",
  sale_web_enabled: true,
  external_sale_enabled: false,
  sale_whatsapp_enabled: false,
  reservation_enabled: true,
  whatsapp_sale_number: "",
  whatsapp_sale_message: "",
  qr_sell_tickets: false,
  qr_products_enabled: false,
  qr_show_price_list: false,
  qr_sell_products: false,
};

export function EventForm({
  initialValues,
  action,
  submitLabel,
  autoSlug = false,
  activeTicketTypeCount,
}: EventFormProps) {
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  });
  const [values, setValues] = useState(initialValues ?? defaultValues);
  const [slugTouched, setSlugTouched] = useState(!autoSlug);

  const initialDuration = useMemo(
    () =>
      deriveInitialDurationParts(
        initialValues?.start_time ?? "",
        initialValues?.end_time ?? "",
      ),
    [initialValues?.end_time, initialValues?.start_time],
  );

  const [durationHours, setDurationHours] = useState(initialDuration.hours);
  const [durationMinutes, setDurationMinutes] = useState(
    initialDuration.minutes,
  );

  const isPromotion = values.content_kind === EVENT_CONTENT_KIND.PROMOTION;

  const needsTicketTypesWarning =
    !isPromotion &&
    (values.sale_web_enabled || values.reservation_enabled) &&
    (values.status === EVENT_STATUS.PUBLISHED ||
      values.status === EVENT_STATUS.SOLD_OUT) &&
    activeTicketTypeCount === 0;

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

  function updateImageField<
    K extends "main_image_url" | "banner_url" | "flyer_url" | "thumbnail_url",
  >(key: K, value: string) {
    updateField(key, value);
  }

  return (
    <Card padding="lg">
      <form action={formAction} className="space-y-8">
        <FormSection
          title="Información principal"
          description="Datos básicos del evento y visibilidad."
        >
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

          <Field label="Tipo de contenido *">
            <select
              name="content_kind"
              value={values.content_kind}
              onChange={(e) =>
                updateField(
                  "content_kind",
                  e.target.value as EventFormInput["content_kind"],
                )
              }
              className={inputClassName}
              disabled={pending}
            >
              {EVENT_CONTENT_KIND_VALUES.map((kind) => (
                <option key={kind} value={kind} className="bg-zinc-900">
                  {EVENT_CONTENT_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-zinc-500">
              Evento: cartelera, entradas y galería. Promoción: solo hero destacado
              sin fecha obligatoria.
            </p>
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Visibilidad del evento">
              <select
                name="audience"
                value={values.audience}
                onChange={(e) =>
                  updateField(
                    "audience",
                    e.target.value as EventFormInput["audience"],
                  )
                }
                className={inputClassName}
                disabled={pending}
              >
                {EVENT_AUDIENCE_VALUES.map((audience) => (
                  <option key={audience} value={audience} className="bg-zinc-900">
                    {EVENT_AUDIENCE_LABELS[audience]}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-zinc-500">
                Público: visible para todos. Solo comunidad: requiere membresía
                activa. Borrador u Oculto: no accesible por URL pública.
              </p>
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
          </div>
        </FormSection>

        <FormSection
          title={isPromotion ? "Fecha y vigencia (opcional)" : "Fecha y horario"}
          description="Horarios en zona horaria de Mendoza (UTC-3)."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={isPromotion ? "Fecha (opcional)" : "Fecha inicial *"}>
              <input
                name="event_date"
                type="date"
                value={values.event_date}
                onChange={(e) => updateField("event_date", e.target.value)}
                className={inputClassName}
                required={!isPromotion}
                disabled={pending}
              />
            </Field>

            {!isPromotion ? (
              <Field label="Fecha final (opcional)">
                <input
                  name="event_end_date"
                  type="date"
                  value={values.event_end_date}
                  onChange={(e) => updateField("event_end_date", e.target.value)}
                  className={inputClassName}
                  min={values.event_date || undefined}
                  disabled={pending}
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Dejá vacío para eventos de un solo día.
                </p>
              </Field>
            ) : null}
          </div>

          <EventFormScheduleFields
            values={values}
            durationHours={durationHours}
            durationMinutes={durationMinutes}
            disabled={pending}
            inputClassName={inputClassName}
            onStartTimeChange={(value) => updateField("start_time", value)}
            onEndTimeChange={(value) => updateField("end_time", value)}
            onDurationChange={(hours, minutes) => {
              setDurationHours(hours);
              setDurationMinutes(minutes);
            }}
          />

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
        </FormSection>

        {!isPromotion ? (
        <FormSection
          title="Venta"
          description="Activá uno o más canales. Los precios se configuran en tipos de entrada."
        >
          <div className="space-y-3">
            <SaleChannelCard
              name="sale_web_enabled"
              title="Venta desde la web"
              description="Compra y pago mediante la plataforma."
              checked={values.sale_web_enabled}
              disabled={pending}
              onChange={(checked) => updateField("sale_web_enabled", checked)}
            />
            <SaleChannelCard
              name="reservation_enabled"
              title="Reserva desde la web"
              description="El cliente reserva y el administrador confirma el pago."
              checked={values.reservation_enabled}
              disabled={pending}
              onChange={(checked) => updateField("reservation_enabled", checked)}
            />
            <SaleChannelCard
              name="sale_whatsapp_enabled"
              title="Venta por WhatsApp"
              description="La consulta se envía al número configurado."
              checked={values.sale_whatsapp_enabled}
              disabled={pending}
              onChange={(checked) =>
                updateField("sale_whatsapp_enabled", checked)
              }
            />
            <SaleChannelCard
              name="external_sale_enabled"
              title="Link externo"
              description="Envía al comprador a otra plataforma."
              checked={values.external_sale_enabled}
              disabled={pending}
              onChange={(checked) =>
                updateField("external_sale_enabled", checked)
              }
            />
          </div>

          {values.external_sale_enabled ? (
            <Field label="URL externa de venta">
              <input
                name="external_ticket_url"
                type="url"
                value={values.external_ticket_url}
                onChange={(e) =>
                  updateField("external_ticket_url", e.target.value)
                }
                className={inputClassName}
                placeholder="https://plataformaexterna.com/evento/entradas"
                disabled={pending}
                required={
                  values.status === "published" ||
                  values.status === "sold_out"
                }
              />
            </Field>
          ) : null}

          {values.sale_whatsapp_enabled ? (
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Número de WhatsApp">
                <input
                  name="whatsapp_sale_number"
                  type="tel"
                  value={values.whatsapp_sale_number}
                  onChange={(e) =>
                    updateField("whatsapp_sale_number", e.target.value)
                  }
                  className={inputClassName}
                  placeholder="+5492615551234"
                  disabled={pending}
                  required={
                    values.status === "published" ||
                    values.status === "sold_out"
                  }
                />
              </Field>
              <Field label="Mensaje inicial">
                <textarea
                  name="whatsapp_sale_message"
                  value={values.whatsapp_sale_message}
                  onChange={(e) =>
                    updateField("whatsapp_sale_message", e.target.value)
                  }
                  className={cn(inputClassName, "min-h-[120px] resize-y")}
                  placeholder="Hola, quiero consultar entradas para..."
                  disabled={pending}
                />
              </Field>
            </div>
          ) : null}

          {needsTicketTypesWarning ? (
            <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Activaste venta o reserva web pero este evento no tiene tipos de
              entrada activos. Configuralos en Tipos de entradas antes de
              publicar.
            </p>
          ) : null}

          {(values.sale_web_enabled || values.reservation_enabled) &&
          values.status === EVENT_STATUS.DRAFT ? (
            <p className="text-xs text-zinc-500">
              Recordá crear tipos de entrada activos antes de publicar con venta
              o reserva web.
            </p>
          ) : null}
        </FormSection>
        ) : null}

        <FormSection
          title={isPromotion ? "Banners de la promoción" : "Imagen del evento"}
          description="El banner principal se reutiliza en todo el sitio público."
        >
          <EventImageAdminPreview
            values={values}
            onChange={updateImageField}
            disabled={pending}
            inputClassName={inputClassName}
          />
        </FormSection>

        <FormSection
          title="Configuración adicional"
          description={
            isPromotion
              ? "Destacado en home, botón y vigencia."
              : "Capacidad, destacado en home y QR de ventas."
          }
        >
          {!isPromotion ? (
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
          ) : null}

          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
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
              <Field label={isPromotion ? "Texto del botón" : "Ticket destacado"}>
                <input
                  name="featured_ticket_label"
                  value={values.featured_ticket_label}
                  onChange={(e) =>
                    updateField("featured_ticket_label", e.target.value)
                  }
                  className={inputClassName}
                  placeholder={isPromotion ? "Ver más" : "Ej. Preventa abierta"}
                  disabled={pending}
                />
              </Field>
              <Field label="Destacar hasta">
                <input
                  name="featured_until"
                  type="datetime-local"
                  value={values.featured_until}
                  onChange={(e) =>
                    updateField("featured_until", e.target.value)
                  }
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

            {isPromotion ? (
              <Field label="URL de destino">
                <input
                  name="external_ticket_url"
                  type="url"
                  value={values.external_ticket_url}
                  onChange={(e) =>
                    updateField("external_ticket_url", e.target.value)
                  }
                  className={inputClassName}
                  placeholder="https://..."
                  disabled={pending}
                />
              </Field>
            ) : null}
          </div>

          {!isPromotion ? (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                QR de ventas del evento
              </h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Un único QR para vender entradas y/o consumiciones.
              </p>
            </div>

            <ChecklistItem
              name="qr_sell_tickets"
              label="Vender entradas desde el QR"
              checked={values.qr_sell_tickets}
              disabled={pending}
              onChange={(checked) => updateField("qr_sell_tickets", checked)}
            />

            <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
              <ChecklistItem
                name="qr_products_enabled"
                label="Habilitar productos / consumiciones QR"
                checked={values.qr_products_enabled}
                disabled={pending}
                onChange={(checked) => {
                  setValues((prev) => ({
                    ...prev,
                    qr_products_enabled: checked,
                    qr_show_price_list: checked
                      ? prev.qr_show_price_list
                      : false,
                    qr_sell_products: checked ? prev.qr_sell_products : false,
                  }));
                }}
              />

              <div
                className={cn(
                  "ml-6 space-y-3 border-l border-white/10 pl-4",
                  !values.qr_products_enabled && "opacity-50",
                )}
              >
                <ChecklistItem
                  name="qr_show_price_list"
                  label="Mostrar lista de precios"
                  checked={values.qr_show_price_list}
                  disabled={pending || !values.qr_products_enabled}
                  onChange={(checked) =>
                    updateField("qr_show_price_list", checked)
                  }
                />
                <ChecklistItem
                  name="qr_sell_products"
                  label="Vender productos / consumiciones"
                  checked={values.qr_sell_products}
                  disabled={pending || !values.qr_products_enabled}
                  onChange={(checked) =>
                    updateField("qr_sell_products", checked)
                  }
                />
              </div>
            </div>
          </div>
          ) : null}
        </FormSection>

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

function SaleChannelCard({
  name,
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  name: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition",
        checked
          ? "border-purple-400/40 bg-purple-500/10 ring-1 ring-purple-400/30"
          : "border-white/10 bg-white/5 hover:border-white/20",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        name={name}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 rounded border-white/20 bg-zinc-900"
        aria-describedby={`${name}-desc`}
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span
          id={`${name}-desc`}
          className="mt-1 block text-xs leading-5 text-zinc-400"
        >
          {description}
        </span>
        {checked ? (
          <span className="mt-2 inline-flex rounded-full bg-purple-500/20 px-2 py-0.5 text-[11px] font-medium text-purple-200">
            Activo
          </span>
        ) : null}
      </span>
    </label>
  );
}

function ChecklistItem({
  name,
  label,
  checked,
  disabled,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3">
      <input
        name={name}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-white/20 bg-zinc-900"
      />
      <span className="text-sm text-zinc-300">{label}</span>
    </label>
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
        <span className="mt-2 block text-xs leading-5 text-zinc-500">
          {help}
        </span>
      ) : null}
    </label>
  );
}
