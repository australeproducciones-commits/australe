"use client";

import { useMemo, useState, useTransition } from "react";
import { isEventFinished } from "@/lib/events/eventTiming";
import {
  adminStoreFieldClass,
  AdminStoreField,
} from "@/components/store/admin/adminStoreUi";
import { buildStorePricePreview } from "@/lib/store/adminHub";
import {
  deactivateEventStoreProductAction,
  linkStoreProductToEventAction,
  updateEventStoreProductAction,
  upsertEventStoreSettingsAction,
} from "@/lib/store/actions";
import type {
  AdminStoreProductListItem,
  AdminStoreProductsPageData,
  EventStoreProduct,
} from "@/lib/store/types";
import { formatStorePrice } from "@/lib/store/utils";

type AdminStoreProductEventsSectionProps = {
  product: AdminStoreProductListItem;
  pageData: AdminStoreProductsPageData;
  onChanged: () => void;
};

export function AdminStoreProductEventsSection({
  product,
  pageData,
  onChanged,
}: AdminStoreProductEventsSectionProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [editingAssociation, setEditingAssociation] = useState<
    (EventStoreProduct & { event: AdminStoreProductListItem["associations"][0]["event"] }) | null
  >(null);
  const [settingsEventId, setSettingsEventId] = useState<string | null>(null);

  const linkedEventIds = new Set(product.associations.map((a) => a.event_id));

  const selectableEvents = useMemo(() => {
    return pageData.events
      .filter((event) => !linkedEventIds.has(event.id))
      .filter((event) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          event.name.toLowerCase().includes(q) ||
          event.slug.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
  }, [pageData.events, linkedEventIds, search]);

  function handleLinkEvent() {
    if (!selectedEventId) {
      setError("Seleccioná un evento.");
      return;
    }

    startTransition(async () => {
      const result = await linkStoreProductToEventAction(
        selectedEventId,
        product.id,
        { is_active: true },
      );
      if (!result.success) {
        setError(result.error ?? "No se pudo asociar el evento.");
        return;
      }
      setSelectedEventId("");
      setSearch("");
      onChanged();
    });
  }

  function handleSaveAssociation() {
    if (!editingAssociation) return;

    const form = document.getElementById(
      `assoc-form-${editingAssociation.id}`,
    ) as HTMLFormElement | null;
    if (!form) return;
    const fd = new FormData(form);

    startTransition(async () => {
      const result = await updateEventStoreProductAction(editingAssociation.id, {
        is_active: fd.get("is_active") === "on",
        is_featured: fd.get("is_featured") === "on",
        sort_order: Number(fd.get("sort_order") ?? 0),
        event_price_override: fd.get("event_price_override")
          ? Number(fd.get("event_price_override"))
          : null,
        event_community_price_override: fd.get("event_community_price_override")
          ? Number(fd.get("event_community_price_override"))
          : null,
        pickup_available: fd.get("pickup_available") === "on",
        pickup_instructions: String(fd.get("pickup_instructions") ?? "") || null,
        starts_at: String(fd.get("starts_at") ?? "") || null,
        ends_at: String(fd.get("ends_at") ?? "") || null,
      });

      if (!result.success) {
        setError(result.error ?? "No se pudo guardar la asociación.");
        return;
      }

      setEditingAssociation(null);
      onChanged();
    });
  }

  function handleDeactivate(associationId: string) {
    if (
      !window.confirm(
        "¿Desactivar esta asociación? Se conserva el historial de pedidos.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      await deactivateEventStoreProductAction(associationId);
      onChanged();
    });
  }

  function handleSaveEventSettings(eventId: string) {
    const form = document.getElementById(
      `event-settings-${eventId}`,
    ) as HTMLFormElement | null;
    if (!form) return;
    const fd = new FormData(form);

    startTransition(async () => {
      const result = await upsertEventStoreSettingsAction(eventId, {
        merchandising_enabled: fd.get("merchandising_enabled") === "on",
        show_badge: fd.get("show_badge") === "on",
        badge_text: String(fd.get("badge_text") ?? "MERCH DISPONIBLE"),
        show_products_block: fd.get("show_products_block") === "on",
        pickup_enabled: fd.get("pickup_enabled") === "on",
        pickup_instructions: String(fd.get("pickup_instructions") ?? "") || null,
        max_featured_products: Number(fd.get("max_featured_products") ?? 3),
      });

      if (!result.success) {
        setError(result.error ?? "No se pudo guardar la configuración del evento.");
        return;
      }

      setSettingsEventId(null);
      onChanged();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
        <h3 className="text-sm font-semibold text-white">Asociar evento</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar evento por nombre..."
            className={adminStoreFieldClass}
          />
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className={adminStoreFieldClass}
          >
            <option value="">Seleccionar evento</option>
            {selectableEvents.map((event) => {
              const finished = event.event_date
                ? isEventFinished(event)
                : false;
              return (
                <option key={event.id} value={event.id}>
                  {event.name}
                  {event.event_date ? ` · ${event.event_date}` : ""}
                  {finished ? " (finalizado)" : ""} · {event.status}
                </option>
              );
            })}
          </select>
        </div>
        <button
          type="button"
          disabled={pending || !selectedEventId}
          onClick={handleLinkEvent}
          className="mt-3 rounded bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Asociar producto al evento
        </button>
      </div>

      <div className="space-y-3">
        {product.associations.map((association) => {
          const settings = pageData.settingsByEventId[association.event_id];
          const preview = buildStorePricePreview({
            product,
            association,
          });
          const finished = isEventFinished(association.event);

          return (
            <div
              key={association.id}
              className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">{association.event.name}</p>
                  <p className="text-xs text-zinc-500">
                    {association.event.event_date ?? "Sin fecha"} ·{" "}
                    {association.event.status}
                    {finished ? " · Finalizado" : ""}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Badge evento:{" "}
                    {settings?.show_badge
                      ? settings.badge_text || "MERCH DISPONIBLE"
                      : "Oculto"}
                    {settings?.merchandising_enabled ? "" : " · Merch deshabilitado"}
                  </p>
                </div>
                <div className="text-right text-xs text-zinc-400">
                  <p>
                    Precio evento:{" "}
                    {formatStorePrice(
                      association.event_price_override ?? product.public_price,
                    )}
                  </p>
                  <p>{association.is_active ? "Activa" : "Inactiva"}</p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAssociation(association)}
                  className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200"
                >
                  Editar asociación
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSettingsEventId(
                      settingsEventId === association.event_id
                        ? null
                        : association.event_id,
                    )
                  }
                  className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200"
                >
                  Config. evento
                </button>
                {association.is_active ? (
                  <button
                    type="button"
                    onClick={() => handleDeactivate(association.id)}
                    className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400"
                  >
                    Desactivar
                  </button>
                ) : null}
              </div>

              {editingAssociation?.id === association.id ? (
                <form
                  id={`assoc-form-${association.id}`}
                  className="mt-3 grid gap-3 border-t border-zinc-800 pt-3 sm:grid-cols-2"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked={association.is_active}
                    />
                    Activa
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="is_featured"
                      defaultChecked={association.is_featured}
                    />
                    Destacada en evento
                  </label>
                  <AdminStoreField label="Orden">
                    <input
                      name="sort_order"
                      type="number"
                      defaultValue={association.sort_order}
                      className={adminStoreFieldClass}
                    />
                  </AdminStoreField>
                  <AdminStoreField label="Precio evento">
                    <input
                      name="event_price_override"
                      type="number"
                      min={0}
                      defaultValue={association.event_price_override ?? ""}
                      className={adminStoreFieldClass}
                    />
                  </AdminStoreField>
                  <AdminStoreField label="Precio comunidad evento">
                    <input
                      name="event_community_price_override"
                      type="number"
                      min={0}
                      defaultValue={association.event_community_price_override ?? ""}
                      className={adminStoreFieldClass}
                    />
                  </AdminStoreField>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="pickup_available"
                      defaultChecked={association.pickup_available}
                    />
                    Retiro en evento
                  </label>
                  <AdminStoreField label="Instrucciones retiro">
                    <input
                      name="pickup_instructions"
                      defaultValue={association.pickup_instructions ?? ""}
                      className={adminStoreFieldClass}
                    />
                  </AdminStoreField>
                  <AdminStoreField label="Vigencia desde">
                    <input
                      name="starts_at"
                      type="datetime-local"
                      defaultValue={association.starts_at?.slice(0, 16) ?? ""}
                      className={adminStoreFieldClass}
                    />
                  </AdminStoreField>
                  <AdminStoreField label="Vigencia hasta">
                    <input
                      name="ends_at"
                      type="datetime-local"
                      defaultValue={association.ends_at?.slice(0, 16) ?? ""}
                      className={adminStoreFieldClass}
                    />
                  </AdminStoreField>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={handleSaveAssociation}
                      className="rounded bg-violet-600 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Guardar asociación
                    </button>
                  </div>
                  <ul className="sm:col-span-2 space-y-1 text-xs text-zinc-400">
                    {preview.map((row) => (
                      <li key={row.label} className="flex justify-between">
                        <span>{row.label}</span>
                        <span>{formatStorePrice(row.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </form>
              ) : null}

              {settingsEventId === association.event_id ? (
                <form
                  id={`event-settings-${association.event_id}`}
                  className="mt-3 space-y-3 border-t border-zinc-800 pt-3"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <p className="text-xs text-amber-200/90">
                    Esta configuración afecta a todos los productos del evento.
                  </p>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="merchandising_enabled"
                      defaultChecked={settings?.merchandising_enabled ?? false}
                    />
                    Merchandising habilitado
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="show_badge"
                      defaultChecked={settings?.show_badge ?? true}
                    />
                    Mostrar badge
                  </label>
                  <AdminStoreField label="Texto badge">
                    <input
                      name="badge_text"
                      defaultValue={settings?.badge_text ?? "MERCH DISPONIBLE"}
                      className={adminStoreFieldClass}
                    />
                  </AdminStoreField>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="show_products_block"
                      defaultChecked={settings?.show_products_block ?? true}
                    />
                    Mostrar bloque de productos
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="pickup_enabled"
                      defaultChecked={settings?.pickup_enabled ?? true}
                    />
                    Retiro habilitado
                  </label>
                  <AdminStoreField label="Instrucciones retiro evento">
                    <input
                      name="pickup_instructions"
                      defaultValue={settings?.pickup_instructions ?? ""}
                      className={adminStoreFieldClass}
                    />
                  </AdminStoreField>
                  <AdminStoreField label="Máx. destacados">
                    <input
                      name="max_featured_products"
                      type="number"
                      min={0}
                      max={12}
                      defaultValue={settings?.max_featured_products ?? 3}
                      className={adminStoreFieldClass}
                    />
                  </AdminStoreField>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleSaveEventSettings(association.event_id)}
                    className="rounded bg-violet-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Guardar configuración del evento
                  </button>
                </form>
              ) : null}
            </div>
          );
        })}
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
