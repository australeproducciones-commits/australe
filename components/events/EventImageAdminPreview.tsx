"use client";

import { EventImage } from "@/components/events/EventImage";
import type { EventFormInput } from "@/lib/events/types";
import type { EventImageFields } from "@/lib/events/getEventImage";
import { hasCustomEventImage } from "@/lib/events/getEventImage";

type EventImageAdminPreviewProps = {
  values: Pick<
    EventFormInput,
    "main_image_url" | "banner_url" | "flyer_url" | "thumbnail_url"
  >;
  onChange: <K extends keyof EventImageAdminPreviewProps["values"]>(
    key: K,
    value: EventFormInput[K],
  ) => void;
  disabled?: boolean;
  inputClassName: string;
};

export function EventImageAdminPreview({
  values,
  onChange,
  disabled,
  inputClassName,
}: EventImageAdminPreviewProps) {
  const previewEvent: EventImageFields = {
    banner_url: values.banner_url.trim() || null,
    main_image_url: values.main_image_url.trim() || null,
    flyer_url: values.flyer_url.trim() || null,
    thumbnail_url: values.thumbnail_url.trim() || null,
  };

  const hasBanner = Boolean(values.banner_url.trim());
  const hasAnyImage = hasCustomEventImage(previewEvent);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-400/20 bg-purple-400/5 p-4">
        <Field
          label="Banner principal del evento"
          hint="Medida recomendada: 2400 × 1000 px · proporción 12:5 · JPG, PNG o WebP"
        >
          <input
            name="banner_url"
            type="url"
            value={values.banner_url}
            onChange={(e) => onChange("banner_url", e.target.value)}
            className={inputClassName}
            placeholder="https://..."
            disabled={disabled}
          />
        </Field>
        <p className="mt-3 text-xs leading-relaxed text-zinc-400">
          Esta imagen se utilizará automáticamente en el hero, la cartelera, las
          cards, las miniaturas y la página de detalle. Se mostrará completa y no
          será recortada.
        </p>
      </div>

      {!hasAnyImage ? (
        <p className="text-sm text-zinc-500">
          Cargá la URL del banner para ver la vista previa.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <PreviewBlock
            label="Hero / detalle (12:5)"
            variant="banner"
            event={previewEvent}
          />
          <PreviewBlock
            label="Card de cartelera"
            variant="card"
            event={previewEvent}
          />
          {!hasBanner ? (
            <p className="lg:col-span-2 text-xs text-amber-200/90">
              Sin banner cargado: se usará la imagen legacy según el orden de
              fallback hasta que definas un banner principal.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function PreviewBlock({
  label,
  variant,
  event,
}: {
  label: string;
  variant: "banner" | "card";
  event: EventImageFields;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-zinc-400">{label}</p>
      <EventImage
        event={event}
        alt={label}
        variant={variant}
      />
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-300">{label}</span>
      {hint ? (
        <span className="mb-2 block text-xs text-purple-300/80">{hint}</span>
      ) : null}
      {children}
    </label>
  );
}
