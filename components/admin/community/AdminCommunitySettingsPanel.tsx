"use client";

import { useState, useTransition } from "react";
import { updateCommunitySettingsAction } from "@/lib/community/loyalty/admin-actions";
import type { CommunitySettings } from "@/lib/community/loyalty/types";

type AdminCommunitySettingsPanelProps = {
  settings: CommunitySettings;
};

export function AdminCommunitySettingsPanel({
  settings,
}: AdminCommunitySettingsPanelProps) {
  const [form, setForm] = useState(settings);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateField<K extends keyof CommunitySettings>(key: K, value: CommunitySettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    const confirmed = window.confirm("¿Guardar la configuración del programa?");
    if (!confirmed) return;

    startTransition(async () => {
      const result = await updateCommunitySettingsAction(form);
      setMessage(result.success ? "Configuración guardada." : result.error ?? "Error");
    });
  }

  return (
    <div className="max-w-2xl space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.community_enabled}
          onChange={(e) => updateField("community_enabled", e.target.checked)}
        />
        Programa de comunidad habilitado
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.ticket_points_enabled}
          onChange={(e) => updateField("ticket_points_enabled", e.target.checked)}
        />
        Puntos por entradas confirmadas
      </label>
      <label className="flex items-center gap-2 text-sm opacity-60">
        <input
          type="checkbox"
          checked={form.consumption_points_enabled}
          disabled
          onChange={(e) => updateField("consumption_points_enabled", e.target.checked)}
        />
        Puntos por consumiciones (próximamente)
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-zinc-500">$ por punto</span>
          <input
            type="number"
            value={form.amount_per_point}
            onChange={(e) => updateField("amount_per_point", Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-zinc-500">Puntos de bienvenida</span>
          <input
            type="number"
            value={form.welcome_points}
            onChange={(e) => updateField("welcome_points", Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-xs text-zinc-500">Título público</span>
        <input
          value={form.public_title}
          onChange={(e) => updateField("public_title", e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-xs text-zinc-500">Descripción pública</span>
        <textarea
          rows={3}
          value={form.public_description}
          onChange={(e) => updateField("public_description", e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <button
        type="button"
        disabled={pending}
        onClick={handleSave}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        Guardar configuración
      </button>
      {message ? <p className="text-xs text-zinc-500">{message}</p> : null}
    </div>
  );
}
