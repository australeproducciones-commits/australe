"use client";

import { EventImage } from "@/components/events/EventImage";
import type { EventImageFields } from "@/lib/events/utils";

type EventImageAdminPreviewProps = {
  imageUrl: string;
};

function previewEvent(imageUrl: string): EventImageFields {
  return {
    main_image_url: imageUrl || null,
    thumbnail_url: null,
    flyer_url: null,
    banner_url: null,
  };
}

export function EventImageAdminPreview({
  imageUrl,
}: EventImageAdminPreviewProps) {
  if (!imageUrl.trim()) {
    return (
      <p className="text-sm text-zinc-500">
        Cargá una URL de imagen para ver las vistas automáticas.
      </p>
    );
  }

  const event = previewEvent(imageUrl.trim());

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <PreviewBlock label="Banner (12:5)" variant="banner" event={event} />
      <PreviewBlock label="Flyer (4:5)" variant="flyer" event={event} />
      <PreviewBlock label="Miniatura (16:9)" variant="thumbnail" event={event} />
      <PreviewBlock label="Card mobile (4:3)" variant="card" event={event} />
    </div>
  );
}

function PreviewBlock({
  label,
  variant,
  event,
}: {
  label: string;
  variant: "banner" | "flyer" | "thumbnail" | "card";
  event: EventImageFields;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <EventImage event={event} alt={label} variant={variant} />
    </div>
  );
}
