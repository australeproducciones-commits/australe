"use client";

import { useState } from "react";
import { RemoteImage } from "@/components/ui/RemoteImage";
import {
  deletePartnerAction,
  savePartnerAction,
} from "@/lib/site/actions";
import type { Partner, PartnerInput } from "@/lib/site/types";
import { adminFormClassName } from "@/lib/utils/adminFormStyles";

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
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_24rem]">
      <div className="space-y-4">
        {partners.map((partner) => (
          <div key={partner.id} className={`${adminFormClassName} flex gap-4 p-4`}>
            <div className="relative h-16 w-24 shrink-0">
              <RemoteImage
                src={partner.image_url}
                alt={partner.name}
                fill
                className="p-1"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">{partner.name}</p>
              <p className="text-sm text-zinc-400">
                {partner.is_active ? "Activo" : "Inactivo"} · Vistas {partner.view_count} ·
                Clics {partner.click_count}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-sm text-purple-300"
                onClick={() => startEdit(partner)}
              >
                Editar
              </button>
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-sm text-red-300"
                onClick={() => void handleDelete(partner.id)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={(event) => void handleSave(event)} className={`${adminFormClassName} space-y-3 p-5`}>
        <h2 className="text-lg font-bold text-white">
          {editingId ? "Editar partner" : "Nuevo partner"}
        </h2>
        {(
          [
            ["name", "Nombre"],
            ["image_url", "URL del logo"],
            ["destination_url", "Enlace externo"],
            ["description", "Texto corto"],
            ["label", "Etiqueta (Partner / Sponsor)"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="mb-1 block text-sm text-zinc-300">{label}</label>
            <input
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              value={draft[key] ?? ""}
              onChange={(event) =>
                setDraft((current) => ({ ...current, [key]: event.target.value }))
              }
              required={key === "name" || key === "image_url"}
            />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Inicio</label>
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              value={draft.starts_at ?? ""}
              onChange={(event) =>
                setDraft((current) => ({ ...current, starts_at: event.target.value }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Fin</label>
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              value={draft.ends_at ?? ""}
              onChange={(event) =>
                setDraft((current) => ({ ...current, ends_at: event.target.value }))
              }
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(event) =>
              setDraft((current) => ({ ...current, is_active: event.target.checked }))
            }
          />
          Activo
        </label>
        {message ? <p className="text-sm text-red-300">{message}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-purple-500 px-4 py-3 font-semibold text-white"
        >
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </form>
    </div>
  );
}
