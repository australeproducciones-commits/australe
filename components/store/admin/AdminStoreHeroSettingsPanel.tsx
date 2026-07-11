"use client";

import { useMemo, useState } from "react";
import { StoreHeroImage } from "@/components/store/StoreHeroImage";
import { PublicButton } from "@/components/ui/public/PublicButton";
import { updateStoreHeroSettingsAction } from "@/lib/store/settings/actions";
import type { StoreHeroSettings } from "@/lib/store/settings/types";
import { adminFormClassName, adminInputClassName } from "@/lib/utils/adminFormStyles";

type AdminStoreHeroSettingsPanelProps = {
  initialSettings: StoreHeroSettings;
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-300">{label}</span>
      {hint ? (
        <span className="mb-2 block text-xs text-purple-300/80">{hint}</span>
      ) : null}
      {children}
    </label>
  );
}

function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-white/20 bg-zinc-900 text-purple-500 focus:ring-purple-400/40"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="block text-sm font-medium text-zinc-200">{label}</span>
        {hint ? <span className="mt-1 block text-xs text-zinc-500">{hint}</span> : null}
      </span>
    </label>
  );
}

export function AdminStoreHeroSettingsPanel({
  initialSettings,
}: AdminStoreHeroSettingsPanelProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showSecondaryButton = Boolean(settings.hero_secondary_button_label?.trim());

  const desktopPreviewUrl = useMemo(
    () => settings.hero_desktop_image_url?.trim() || null,
    [settings.hero_desktop_image_url],
  );
  const mobilePreviewUrl = useMemo(
    () =>
      settings.hero_mobile_image_url?.trim() ||
      settings.hero_desktop_image_url?.trim() ||
      null,
    [settings.hero_desktop_image_url, settings.hero_mobile_image_url],
  );

  function update<K extends keyof StoreHeroSettings>(key: K, value: StoreHeroSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const result = await updateStoreHeroSettingsAction(settings);
    setLoading(false);

    if (result.ok) {
      setMessage("Configuración del Hero guardada correctamente.");
      return;
    }

    setError(result.message);
  }

  return (
    <form onSubmit={handleSubmit} className={`${adminFormClassName} space-y-8`}>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Visibilidad</h2>
        <ToggleField
          label="Mostrar Hero en la tienda pública"
          hint="Si está desactivado, la tienda inicia directamente con el contenido siguiente."
          checked={settings.hero_enabled}
          onChange={(value) => update("hero_enabled", value)}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Contenido</h2>
        <Field label="Etiqueta superior">
          <input
            className={adminInputClassName}
            value={settings.hero_eyebrow}
            onChange={(event) => update("hero_eyebrow", event.target.value)}
          />
        </Field>
        <Field label="Título principal">
          <input
            className={adminInputClassName}
            value={settings.hero_title}
            onChange={(event) => update("hero_title", event.target.value)}
          />
        </Field>
        <Field label="Descripción">
          <textarea
            className={`${adminInputClassName} min-h-[6rem] resize-y`}
            value={settings.hero_description}
            onChange={(event) => update("hero_description", event.target.value)}
            rows={3}
          />
        </Field>
        <Field label="Texto inferior (opcional)">
          <input
            className={adminInputClassName}
            value={settings.hero_footer_text ?? ""}
            onChange={(event) => update("hero_footer_text", event.target.value || null)}
            placeholder="Diseños oficiales · Ediciones limitadas · Comunidad Australe"
          />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Imágenes de campaña</h2>
        <p className="text-sm text-zinc-400">
          Pegá la URL de la imagen (mismo flujo que los eventos). Los textos del Hero se
          renderizan en HTML, no dentro de la imagen.
        </p>

        <div className="rounded-2xl border border-purple-400/20 bg-purple-400/5 p-4 space-y-4">
          <Field
            label="Imagen de escritorio"
            hint="1800 × 1800 px · proporción 1:1 · WebP o PNG transparente"
          >
            <input
              type="url"
              className={adminInputClassName}
              value={settings.hero_desktop_image_url ?? ""}
              onChange={(event) =>
                update("hero_desktop_image_url", event.target.value || null)
              }
              placeholder="https://..."
            />
          </Field>
          <Field label="Texto alternativo (escritorio)">
            <input
              className={adminInputClassName}
              value={settings.hero_desktop_image_alt ?? ""}
              onChange={(event) =>
                update("hero_desktop_image_alt", event.target.value || null)
              }
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <PublicButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => update("hero_desktop_image_url", null)}
              disabled={!settings.hero_desktop_image_url}
            >
              Eliminar imagen escritorio
            </PublicButton>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-400">Vista previa escritorio</p>
            <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-white/10">
              <StoreHeroImage
                src={desktopPreviewUrl}
                alt={settings.hero_desktop_image_alt ?? "Vista previa escritorio"}
                sizes="400px"
                aspectClassName="aspect-square"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-purple-400/20 bg-purple-400/5 p-4 space-y-4">
          <Field
            label="Imagen móvil"
            hint="1080 × 1350 px · proporción 4:5 · WebP. Si queda vacía, se reutiliza la de escritorio."
          >
            <input
              type="url"
              className={adminInputClassName}
              value={settings.hero_mobile_image_url ?? ""}
              onChange={(event) =>
                update("hero_mobile_image_url", event.target.value || null)
              }
              placeholder="https://..."
            />
          </Field>
          <Field label="Texto alternativo (móvil)">
            <input
              className={adminInputClassName}
              value={settings.hero_mobile_image_alt ?? ""}
              onChange={(event) =>
                update("hero_mobile_image_alt", event.target.value || null)
              }
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <PublicButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => update("hero_mobile_image_url", null)}
              disabled={!settings.hero_mobile_image_url}
            >
              Eliminar imagen móvil
            </PublicButton>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-400">Vista previa móvil</p>
            <div className="mx-auto max-w-[220px] overflow-hidden rounded-2xl border border-white/10">
              <StoreHeroImage
                src={mobilePreviewUrl}
                alt={settings.hero_mobile_image_alt ?? "Vista previa móvil"}
                sizes="220px"
                aspectClassName="aspect-[4/5]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Botones</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Texto del botón principal">
            <input
              className={adminInputClassName}
              value={settings.hero_primary_button_label}
              onChange={(event) => update("hero_primary_button_label", event.target.value)}
            />
          </Field>
          <Field label="Enlace del botón principal" hint="Ruta interna (/tienda#catalogo) o URL https://">
            <input
              className={adminInputClassName}
              value={settings.hero_primary_button_url}
              onChange={(event) => update("hero_primary_button_url", event.target.value)}
            />
          </Field>
          <Field label="Texto del botón secundario (opcional)">
            <input
              className={adminInputClassName}
              value={settings.hero_secondary_button_label ?? ""}
              onChange={(event) =>
                update("hero_secondary_button_label", event.target.value || null)
              }
            />
          </Field>
          <Field
            label="Enlace del botón secundario"
            hint={showSecondaryButton ? "Requerido si hay texto secundario." : "Opcional."}
          >
            <input
              className={adminInputClassName}
              value={settings.hero_secondary_button_url ?? ""}
              onChange={(event) =>
                update("hero_secondary_button_url", event.target.value || null)
              }
              disabled={!showSecondaryButton}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Etiqueta flotante</h2>
        <ToggleField
          label="Mostrar etiqueta sobre la imagen"
          checked={settings.hero_badge_enabled}
          onChange={(value) => update("hero_badge_enabled", value)}
        />
        <Field label="Texto de la etiqueta">
          <input
            className={adminInputClassName}
            value={settings.hero_badge_text ?? ""}
            onChange={(event) => update("hero_badge_text", event.target.value || null)}
            disabled={!settings.hero_badge_enabled}
            placeholder="MERCH OFICIAL"
          />
        </Field>
      </section>

      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-300" role="status">
          {message}
        </p>
      ) : null}

      <PublicButton type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar Hero de la tienda"}
      </PublicButton>
    </form>
  );
}
