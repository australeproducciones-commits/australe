"use client";

import Image from "next/image";
import { useState } from "react";
import {
  adminStoreFieldClass,
  AdminStoreField,
} from "@/components/store/admin/adminStoreUi";
import {
  isValidStoreImageUrl,
  normalizeStoreGalleryUrls,
  normalizeStoreImageUrl,
} from "@/lib/store/utils";
import { isNextImageOptimizable } from "@/lib/utils/imageHosts";
import { cn } from "@/lib/utils/cn";

type AdminStoreProductImageFieldsProps = {
  productId: string | null;
  mainImageUrl: string | null;
  galleryUrls: string[];
  onMainImageChange: (url: string | null) => void;
  onGalleryChange: (urls: string[]) => void;
};

function ImagePreview({
  url,
  alt,
  onRemove,
}: {
  url: string;
  alt: string;
  onRemove?: () => void;
}) {
  const optimizable = isNextImageOptimizable(url);

  return (
    <div className="group relative h-24 w-24 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900">
      {optimizable ? (
        <Image src={url} alt={alt} fill className="object-cover" sizes="96px" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="h-full w-full object-cover" />
      )}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="absolute inset-x-1 bottom-1 rounded bg-black/70 px-1 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
        >
          Quitar
        </button>
      ) : null}
    </div>
  );
}

export function AdminStoreProductImageFields({
  mainImageUrl,
  galleryUrls,
  onMainImageChange,
  onGalleryChange,
}: AdminStoreProductImageFieldsProps) {
  const [galleryDraft, setGalleryDraft] = useState(galleryUrls.join("\n"));
  const [error, setError] = useState<string | null>(null);

  const previewMainUrl = normalizeStoreImageUrl(mainImageUrl);
  const previewGalleryUrls = normalizeStoreGalleryUrls(galleryUrls);

  function handleMainBlur(raw: string) {
    const normalized = normalizeStoreImageUrl(raw);
    if (normalized && !isValidStoreImageUrl(normalized)) {
      setError("La URL de la imagen principal debe ser válida (http:// o https://).");
      return;
    }
    setError(null);
    onMainImageChange(normalized);
  }

  function handleGalleryBlur(raw: string) {
    const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
    for (const url of lines) {
      if (!isValidStoreImageUrl(url)) {
        setError("Cada URL de la galería debe ser válida (http:// o https://).");
        return;
      }
    }
    setError(null);
    onGalleryChange(normalizeStoreGalleryUrls(lines));
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div>
        <p className="text-sm font-semibold text-white">Imágenes</p>
        <p className="mt-1 text-xs text-zinc-500">
          Pegá URLs públicas de imagen, como en el módulo de Eventos.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminStoreField label="Imagen principal" htmlFor="main_image_url">
          <input
            id="main_image_url"
            name="main_image_url"
            type="url"
            value={mainImageUrl ?? ""}
            onChange={(event) =>
              onMainImageChange(event.target.value ? event.target.value : null)
            }
            onBlur={(event) => handleMainBlur(event.target.value)}
            className={adminStoreFieldClass}
            placeholder="https://..."
          />
          <p className="mt-1 text-[11px] text-zinc-500">
            JPG, PNG o WebP accesible por URL pública.
          </p>
        </AdminStoreField>

        <AdminStoreField label="Galería (opcional)" htmlFor="gallery_urls">
          <textarea
            id="gallery_urls"
            name="gallery_urls"
            rows={4}
            value={galleryDraft}
            onChange={(event) => {
              const value = event.target.value;
              setGalleryDraft(value);
              onGalleryChange(
                normalizeStoreGalleryUrls(
                  value.split("\n").map((line) => line.trim()).filter(Boolean),
                ),
              );
            }}
            onBlur={(event) => handleGalleryBlur(event.target.value)}
            className={cn(adminStoreFieldClass, "resize-y font-mono text-xs")}
            placeholder={"https://...\nhttps://..."}
          />
          <p className="mt-1 text-[11px] text-zinc-500">Una URL por línea.</p>
        </AdminStoreField>
      </div>

      {previewMainUrl || previewGalleryUrls.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-zinc-400">Vista previa</p>
          <div className="flex flex-wrap gap-2">
            {previewMainUrl && isValidStoreImageUrl(previewMainUrl) ? (
              <ImagePreview
                url={previewMainUrl}
                alt="Imagen principal"
                onRemove={() => onMainImageChange(null)}
              />
            ) : null}
            {previewGalleryUrls.map((url) => (
              <ImagePreview
                key={url}
                url={url}
                alt="Galería"
                onRemove={() => {
                  const next = previewGalleryUrls.filter((item) => item !== url);
                  setGalleryDraft(next.join("\n"));
                  onGalleryChange(next);
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          Cargá la URL de la imagen principal para ver la vista previa.
        </p>
      )}

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
