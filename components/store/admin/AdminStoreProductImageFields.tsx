"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  AdminStoreField,
} from "@/components/store/admin/adminStoreUi";
import { uploadStoreProductImageAction } from "@/lib/store/images/actions";
import { isNextImageOptimizable } from "@/lib/utils/imageHosts";

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
  productId,
  mainImageUrl,
  galleryUrls,
  onMainImageChange,
  onGalleryChange,
}: AdminStoreProductImageFieldsProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mainInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadStoreProductImageAction(productId, formData);
    if (!result.success || !result.url) {
      setError(result.error ?? "No se pudo subir la imagen.");
      return null;
    }
    return result.url;
  }

  async function handleMainUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    const url = await uploadFile(file);
    if (url) {
      onMainImageChange(url);
    }
    setUploading(false);
    if (mainInputRef.current) {
      mainInputRef.current.value = "";
    }
  }

  async function handleGalleryUpload(files: FileList | null) {
    if (!files?.length) return;

    setUploading(true);
    setError(null);
    const uploaded: string[] = [];

    for (const file of Array.from(files)) {
      const url = await uploadFile(file);
      if (url) {
        uploaded.push(url);
      }
    }

    if (uploaded.length > 0) {
      onGalleryChange([...galleryUrls, ...uploaded]);
    }
    setUploading(false);
    if (galleryInputRef.current) {
      galleryInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">Imágenes</p>
        {uploading ? (
          <span className="text-xs text-violet-300">Subiendo...</span>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AdminStoreField label="Imagen principal">
          <div className="flex flex-wrap items-end gap-3">
            {mainImageUrl ? (
              <ImagePreview
                url={mainImageUrl}
                alt="Imagen principal"
                onRemove={() => onMainImageChange(null)}
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-zinc-700 text-[10px] text-zinc-500">
                Sin imagen
              </div>
            )}
            <div>
              <input
                ref={mainInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(e) => void handleMainUpload(e.target.files)}
                className="max-w-[14rem] text-xs text-zinc-400 file:mr-2 file:rounded-md file:border-0 file:bg-violet-600 file:px-2 file:py-1 file:text-xs file:font-medium file:text-white"
              />
              <p className="mt-1 text-[11px] text-zinc-500">JPG, PNG o WebP · máx. 5 MB</p>
            </div>
          </div>
        </AdminStoreField>

        <AdminStoreField label="Galería (opcional)">
          <div className="space-y-3">
            {galleryUrls.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {galleryUrls.map((url) => (
                  <ImagePreview
                    key={url}
                    url={url}
                    alt="Galería"
                    onRemove={() =>
                      onGalleryChange(galleryUrls.filter((item) => item !== url))
                    }
                  />
                ))}
              </div>
            ) : null}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={uploading}
              onChange={(e) => void handleGalleryUpload(e.target.files)}
              className="max-w-full text-xs text-zinc-400 file:mr-2 file:rounded-md file:border-0 file:bg-zinc-700 file:px-2 file:py-1 file:text-xs file:font-medium file:text-white"
            />
          </div>
        </AdminStoreField>
      </div>

      <input type="hidden" name="main_image_url" value={mainImageUrl ?? ""} />
      <input type="hidden" name="gallery_urls" value={galleryUrls.join("\n")} />

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
