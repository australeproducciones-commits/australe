"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  addGalleryVideoAction,
  deleteGalleryItemAction,
  updateGalleryItemAction,
  uploadGalleryImageAction,
} from "@/lib/events/gallery/actions";
import type { EventGalleryItem } from "@/lib/events/gallery/types";
import type { GalleryActionResult } from "@/lib/events/gallery/types";
import { parseGalleryVideoInput } from "@/lib/events/gallery/utils";

type AdminEventGalleryPanelProps = {
  eventId: string;
  items: EventGalleryItem[];
};

export function AdminEventGalleryPanel({
  eventId,
  items,
}: AdminEventGalleryPanelProps) {
  const [uploadState, uploadFormAction, uploadPending] = useActionState(
    async (_prev: GalleryActionResult, formData: FormData) =>
      uploadGalleryImageAction(eventId, formData),
    { success: false },
  );
  const [youtubeState, youtubeFormAction, youtubePending] = useActionState(
    async (_prev: GalleryActionResult, formData: FormData) =>
      addGalleryVideoAction(eventId, formData),
    { success: false },
  );
  const [vimeoState, vimeoFormAction, vimeoPending] = useActionState(
    async (_prev: GalleryActionResult, formData: FormData) =>
      addGalleryVideoAction(eventId, formData),
    { success: false },
  );

  return (
    <div className="space-y-8">
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-white">Subir imagen</h2>
        <form action={uploadFormAction} className="mt-4 space-y-4">
          <input name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
          <input
            name="caption"
            placeholder="Descripción opcional"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          />
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input name="is_published" type="checkbox" defaultChecked />
            Publicar
          </label>
          {uploadState.error ? (
            <p className="text-sm text-red-300">{uploadState.error}</p>
          ) : null}
          <Button type="submit" disabled={uploadPending}>
            {uploadPending ? "Subiendo..." : "Subir imagen"}
          </Button>
        </form>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="lg">
          <h2 className="text-lg font-semibold text-white">YouTube</h2>
          <form action={youtubeFormAction} className="mt-4 space-y-4">
            <input type="hidden" name="media_type" value="youtube" />
            <input
              name="video_input"
              placeholder="URL o ID de YouTube"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              required
            />
            <input
              name="caption"
              placeholder="Descripción opcional"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input name="is_published" type="checkbox" defaultChecked />
              Publicar
            </label>
            {youtubeState.error ? (
              <p className="text-sm text-red-300">{youtubeState.error}</p>
            ) : null}
            <Button type="submit" disabled={youtubePending}>
              Agregar YouTube
            </Button>
          </form>
        </Card>

        <Card padding="lg">
          <h2 className="text-lg font-semibold text-white">Vimeo</h2>
          <form action={vimeoFormAction} className="mt-4 space-y-4">
            <input type="hidden" name="media_type" value="vimeo" />
            <input
              name="video_input"
              placeholder="URL o ID de Vimeo"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
              required
            />
            <input
              name="caption"
              placeholder="Descripción opcional"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input name="is_published" type="checkbox" defaultChecked />
              Publicar
            </label>
            {vimeoState.error ? (
              <p className="text-sm text-red-300">{vimeoState.error}</p>
            ) : null}
            <Button type="submit" disabled={vimeoPending}>
              Agregar Vimeo
            </Button>
          </form>
        </Card>
      </div>

      <Card padding="lg">
        <h2 className="text-lg font-semibold text-white">Contenido actual</h2>
        {items.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">Todavía no hay contenido.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {items.map((item) => (
              <GalleryItemRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function GalleryItemRow({ item }: { item: EventGalleryItem }) {
  const [updateState, updateFormAction, updatePending] = useActionState(
    async (_prev: GalleryActionResult, formData: FormData) =>
      updateGalleryItemAction(item.id, formData),
    { success: false },
  );
  const [deleteState, deleteFormAction, deletePending] = useActionState(
    async (_prev: GalleryActionResult) => deleteGalleryItemAction(item.id),
    { success: false },
  );

  const preview =
    item.media_type === "image"
      ? item.thumbnail_url ?? item.media_url
      : parseGalleryVideoInput(item.media_type, item.media_url)?.thumbnailUrl;

  return (
    <li className="rounded-2xl border border-white/10 p-4">
      <div className="flex flex-col gap-4 md:flex-row">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="h-24 w-36 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-24 w-36 items-center justify-center rounded-xl bg-white/5 text-xs text-zinc-400">
            {item.media_type}
          </div>
        )}
        <div className="flex-1 space-y-3">
          <p className="text-sm text-zinc-400">{item.media_type}</p>
          <form action={updateFormAction} className="grid gap-3 md:grid-cols-3">
            <input
              name="caption"
              defaultValue={item.caption ?? ""}
              placeholder="Descripción"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
            <input
              name="sort_order"
              type="number"
              defaultValue={item.sort_order}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                name="is_published"
                type="checkbox"
                defaultChecked={item.is_published}
              />
              Publicado
            </label>
            <Button type="submit" size="sm" disabled={updatePending}>
              Guardar
            </Button>
          </form>
          {updateState.error ? (
            <p className="text-sm text-red-300">{updateState.error}</p>
          ) : null}
          <form action={deleteFormAction}>
            <Button type="submit" variant="ghost" size="sm" disabled={deletePending}>
              Eliminar
            </Button>
          </form>
          {deleteState.error ? (
            <p className="text-sm text-red-300">{deleteState.error}</p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
