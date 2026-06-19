"use client";

import { useState } from "react";
import { PublicButton } from "@/components/ui/public/PublicButton";
import { updateSiteSettingsAction } from "@/lib/site/actions";
import type { SiteSettings } from "@/lib/site/types";
import { adminFormClassName } from "@/lib/utils/adminFormStyles";

type AdminSiteSettingsPanelProps = {
  initialSettings: SiteSettings;
};

export function AdminSiteSettingsPanel({
  initialSettings,
}: AdminSiteSettingsPanelProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await updateSiteSettingsAction(settings);
    setLoading(false);
    setMessage(result.ok ? "Configuración guardada." : result.message);
  }

  return (
    <form onSubmit={handleSubmit} className={`${adminFormClassName} space-y-4`}>
      {(
        [
          ["contact_email", "Email de contacto"],
          ["contact_phone", "Teléfono"],
          ["contact_whatsapp", "WhatsApp"],
          ["contact_location", "Ubicación"],
          ["instagram_url", "URL de Instagram"],
        ] as const
      ).map(([key, label]) => (
        <div key={key}>
          <label className="mb-2 block text-sm text-zinc-300">{label}</label>
          <input
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white"
            value={settings[key] ?? ""}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                [key]: event.target.value,
              }))
            }
          />
        </div>
      ))}

      {message ? <p className="text-sm text-zinc-300">{message}</p> : null}

      <PublicButton type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar configuración"}
      </PublicButton>
    </form>
  );
}
