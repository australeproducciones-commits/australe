"use client";

import { useState } from "react";
import { AdminPartnerRow } from "@/components/admin/partners/AdminPartnerRow";
import { AdminPartnersHeader } from "@/components/admin/partners/AdminPartnersHeader";
import { AdminPartnersSummaryMetrics } from "@/components/admin/partners/AdminPartnersSummaryMetrics";
import {
  deletePartnerAction,
  savePartnerAction,
} from "@/lib/site/actions";
import type { Partner, PartnerInput } from "@/lib/site/types";
import { cn } from "@/lib/utils/cn";

type AdminPartnersPanelProps = {
  partners: Partner[];
};

const emptyPartner: PartnerInput = {
  name: "",
  description: "",
  image_url: "",
  destination_url: "",
  label: "",
  is_active: false,
  starts_at: "",
  ends_at: "",
  sort_order: 0,
  open_in_new_tab: true,
};

const inputClassName =
  "w-full rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-purple-400/60 focus:ring-1 focus:ring-purple-400/30";

const labelClassName =
  "mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500";

export function AdminPartnersPanel({ partners: initialPartners }: AdminPartnersPanelProps) {
  const [partners, setPartners] = useState(initialPartners);
  const [draft, setDraft] = useState<PartnerInput>(emptyPartner);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function startEdit(partner: Partner) {
    setEditingId(partner.id);
    setDraft({
      name: partner.name,
      description: partner.description ?? "",
      image_url: partner.image_url,
      destination_url: partner.destination_url ?? "",
      label: partner.label ?? "",
      is_active: partner.is_active,
      starts_at: partner.starts_at?.slice(0, 16) ?? "",
      ends_at: partner.ends_at?.slice(0, 16) ?? "",
      sort_order: partner.sort_order,
      open_in_new_tab: partner.open_in_new_tab,
    });
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyPartner);
    setMessage(null);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await savePartnerAction(
      {
        ...draft,
        starts_at: draft.starts_at || null,
        ends_at: draft.ends_at || null,
      },
      editingId ?? undefined,
    );

    setLoading(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    window.location.reload();
  }

  async function handleDelete(partnerId: string) {
    if (!window.confirm("¿Eliminar este partner?")) {
      return;
    }

    const result = await deletePartnerAction(partnerId);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setPartners((current) => current.filter((partner) => partner.id !== partnerId));
    if (editingId === partnerId) {
      cancelEdit();
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <AdminPartnersHeader count={partners.length} />
      <AdminPartnersSummaryMetrics partners={partners} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)] lg:items-start">
        <section
          aria-label="Listado de partners"
          className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 shadow-sm shadow-black/20"
        >
          <div className="border-b border-white/10 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-zinc-100">Partners registrados</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Logos, estado y métricas de interacción.
            </p>
          </div>

          {partners.length === 0 ? (
            <div className="px-4 py-12 text-center sm:px-5">
              <p className="text-sm font-medium text-zinc-300">Sin partners cargados</p>
              <p className="mt-1 text-xs text-zinc-500">
                Usá el formulario para agregar el primero.
              </p>
            </div>
          ) : (
            <div>
              {partners.map((partner) => (
                <AdminPartnerRow
                  key={partner.id}
                  partner={partner}
                  onEdit={() => startEdit(partner)}
                  onDelete={() => void handleDelete(partner.id)}
                />
              ))}
            </div>
          )}
        </section>

        <form
          onSubmit={(event) => void handleSave(event)}
          className={cn(
            "rounded-2xl border border-white/10 bg-zinc-900/80 p-4 shadow-sm shadow-black/20 sm:p-5",
            "lg:sticky lg:top-4",
          )}
        >
          <div className="mb-3 border-b border-white/10 pb-3">
            <h2 className="text-sm font-semibold text-zinc-100">
              {editingId ? "Editar partner" : "Nuevo partner"}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {editingId
                ? "Modificá los datos y guardá los cambios."
                : "Completá los campos para publicar un nuevo logo."}
            </p>
          </div>

          <div className="space-y-2.5">
            {(
              [
                ["name", "Nombre", true],
                ["image_url", "URL del logo", true],
                ["destination_url", "Enlace externo", false],
                ["description", "Texto corto", false],
                ["label", "Etiqueta", false],
              ] as const
            ).map(([key, label, required]) => (
              <div key={key}>
                <label className={labelClassName} htmlFor={`partner-${key}`}>
                  {label}
                </label>
                <input
                  id={`partner-${key}`}
                  className={inputClassName}
                  value={draft[key] ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, [key]: event.target.value }))
                  }
                  required={required}
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={labelClassName} htmlFor="partner-starts_at">
                  Inicio
                </label>
                <input
                  id="partner-starts_at"
                  type="datetime-local"
                  className={inputClassName}
                  value={draft.starts_at ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, starts_at: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className={labelClassName} htmlFor="partner-ends_at">
                  Fin
                </label>
                <input
                  id="partner-ends_at"
                  type="datetime-local"
                  className={inputClassName}
                  value={draft.ends_at ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, ends_at: event.target.value }))
                  }
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2.5 text-sm text-zinc-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-purple-500 focus:ring-purple-400/40"
                checked={draft.is_active}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, is_active: event.target.checked }))
                }
              />
              Activo
            </label>
          </div>

          {message ? (
            <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {message}
            </p>
          ) : null}

          <div className="mt-4 space-y-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-400 disabled:opacity-60"
            >
              {loading ? "Guardando…" : "Guardar"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
                onClick={cancelEdit}
              >
                Cancelar edición
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
