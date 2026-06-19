"use client";

import { useMemo, useState } from "react";
import {
  deleteAdvertisingCampaignAction,
  saveAdvertisingCampaignAction,
} from "@/lib/site/actions";
import {
  ADVERTISING_FREQUENCY_OPTIONS,
  DEFAULT_ADVERTISING_FREQUENCY,
  type AdvertisingCampaign,
  type AdvertisingCampaignInput,
  type AdvertisingFrequency,
} from "@/lib/site/types";
import { adminFormClassName } from "@/lib/utils/adminFormStyles";

type AdminAdvertisingPanelProps = {
  campaigns: AdvertisingCampaign[];
};

const emptyCampaign: AdvertisingCampaignInput = {
  internal_name: "",
  title: "",
  body: "",
  image_url: "",
  button_label: "",
  destination_url: "",
  is_active: false,
  starts_at: "",
  ends_at: "",
  priority: 0,
  frequency: DEFAULT_ADVERTISING_FREQUENCY,
  open_in_new_tab: true,
};

export function AdminAdvertisingPanel({
  campaigns: initialCampaigns,
}: AdminAdvertisingPanelProps) {
  const [campaigns] = useState(initialCampaigns);
  const [draft, setDraft] = useState<AdvertisingCampaignInput>(emptyCampaign);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const previewTitle = draft.title || "Título de la campaña";
  const previewBody = draft.body || "Texto breve de la publicidad.";
  const ctr = useMemo(() => {
    if (!editingId) {
      return null;
    }

    const campaign = campaigns.find((item) => item.id === editingId);
    if (!campaign || campaign.view_count === 0) {
      return "0%";
    }

    return `${((campaign.click_count / campaign.view_count) * 100).toFixed(1)}%`;
  }, [campaigns, editingId]);

  function startEdit(campaign: AdvertisingCampaign) {
    setEditingId(campaign.id);
    setDraft({
      internal_name: campaign.internal_name,
      title: campaign.title ?? "",
      body: campaign.body ?? "",
      image_url: campaign.image_url ?? "",
      button_label: campaign.button_label ?? "",
      destination_url: campaign.destination_url ?? "",
      is_active: campaign.is_active,
      starts_at: campaign.starts_at?.slice(0, 16) ?? "",
      ends_at: campaign.ends_at?.slice(0, 16) ?? "",
      priority: campaign.priority,
      frequency: campaign.frequency,
      open_in_new_tab: campaign.open_in_new_tab,
    });
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await saveAdvertisingCampaignAction(
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

  async function handleDelete(campaignId: string) {
    if (!window.confirm("¿Eliminar esta campaña?")) {
      return;
    }

    const result = await deleteAdvertisingCampaignAction(campaignId);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    window.location.reload();
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_22rem_22rem]">
      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className={`${adminFormClassName} p-4`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-white">{campaign.internal_name}</p>
                <p className="text-sm text-zinc-400">
                  {campaign.is_active ? "Activa" : "Inactiva"} · Vistas {campaign.view_count} ·
                  Clics {campaign.click_count} · CTR{" "}
                  {campaign.view_count
                    ? `${((campaign.click_count / campaign.view_count) * 100).toFixed(1)}%`
                    : "0%"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-xl px-3 py-2 text-sm text-purple-300"
                  onClick={() => startEdit(campaign)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="rounded-xl px-3 py-2 text-sm text-red-300"
                  onClick={() => void handleDelete(campaign.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={(event) => void handleSave(event)} className={`${adminFormClassName} space-y-3 p-5`}>
        <h2 className="text-lg font-bold text-white">
          {editingId ? "Editar campaña" : "Nueva campaña"}
        </h2>
        {(
          [
            ["internal_name", "Nombre interno"],
            ["title", "Título público"],
            ["body", "Texto"],
            ["image_url", "URL de imagen"],
            ["button_label", "Texto del botón"],
            ["destination_url", "Enlace del botón"],
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
              required={key === "internal_name"}
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-sm text-zinc-300">Frecuencia</label>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            value={draft.frequency}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                frequency: event.target.value as AdvertisingFrequency,
              }))
            }
          >
            {ADVERTISING_FREQUENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
                {option.recommended ? " (recomendado)" : ""}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-zinc-500">
            Recomendado: una vez por campaña y usuario. Registra la visualización,
            permite medir clics y CTR, y no repite el mismo aviso en cada ingreso.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(event) =>
              setDraft((current) => ({ ...current, is_active: event.target.checked }))
            }
          />
          Activa
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

      <div className={`${adminFormClassName} p-5`}>
        <h2 className="text-lg font-bold text-white">Vista previa</h2>
        <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-900 p-4">
          {draft.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.image_url}
              alt=""
              className="mb-4 aspect-[16/9] w-full rounded-xl object-cover"
            />
          ) : null}
          <h3 className="text-lg font-bold text-white">{previewTitle}</h3>
          <p className="mt-2 text-sm text-zinc-300">{previewBody}</p>
          {draft.destination_url && draft.button_label ? (
            <p className="mt-4 inline-flex rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white">
              {draft.button_label}
            </p>
          ) : null}
        </div>
        {ctr ? <p className="mt-3 text-sm text-zinc-400">CTR actual: {ctr}</p> : null}
      </div>
    </div>
  );
}
